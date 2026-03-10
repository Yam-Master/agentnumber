import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { debitCredits } from "@/lib/credits/operations";
import { deliverWebhooks } from "@/lib/webhooks/deliver";
import { sendSms } from "@/lib/twilio";
import { decrypt } from "@/lib/crypto";
import { openClawRequest, isRelayUrl } from "@/lib/openclaw";
import { relayRequest } from "@/lib/relay";
import { toPublicId } from "@/lib/api/ids";
import crypto from "crypto";

const SMS_INBOUND_COST_CENTS = 1; // $0.01 per inbound SMS
const SMS_OUTBOUND_COST_CENTS = 2; // $0.02 per outbound SMS

function buildCandidateUrls(request: NextRequest): string[] {
  const candidates = new Set<string>();

  // Actual request URL as seen by Next.js.
  candidates.add(request.nextUrl.toString());

  // Reconstructed external URL behind proxies/load balancers.
  const proto = request.headers.get("x-forwarded-proto");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (proto && host) {
    candidates.add(`${proto}://${host}${request.nextUrl.pathname}${request.nextUrl.search}`);
  }

  // Optional explicit site URL fallback.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (siteUrl) {
    candidates.add(`${siteUrl}${request.nextUrl.pathname}${request.nextUrl.search}`);
  }

  return [...candidates];
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function validateTwilioSignature(request: NextRequest, params: URLSearchParams): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return true; // Skip validation if not configured (local dev)

  const signature = request.headers.get("x-twilio-signature");
  if (!signature) return false;

  // Twilio: sort POST params alphabetically, concatenate key+value
  const sortedParams = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => k + v)
    .join("");

  for (const url of buildCandidateUrls(request)) {
    const expected = crypto
      .createHmac("sha1", authToken)
      .update(url + sortedParams)
      .digest("base64");
    if (safeEqual(signature, expected)) return true;
  }

  return false;
}

function normalizePhone(value: string | null): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  if (v.startsWith("whatsapp:")) return v.slice("whatsapp:".length);
  return v;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Validate Twilio signature
    const params = new URLSearchParams();
    formData.forEach((value, key) => params.append(key, String(value)));
    const signatureValid = validateTwilioSignature(request, params);
    const enforceSignature = process.env.TWILIO_ENFORCE_SIGNATURE === "true";
    if (!signatureValid && enforceSignature) {
      console.error("Twilio SMS webhook signature mismatch (rejected)");
      return new NextResponse("Forbidden", { status: 403 });
    } else if (!signatureValid) {
      console.warn("Twilio SMS webhook signature mismatch (accepted due to TWILIO_ENFORCE_SIGNATURE!=true)");
    }
    const from = normalizePhone(formData.get("From") as string);
    const to = normalizePhone(formData.get("To") as string);
    const body = formData.get("Body") as string;
    const messageSid = formData.get("MessageSid") as string;

    if (!from || !to || !body) {
      console.warn("Twilio SMS webhook missing From/To/Body", { from, to, hasBody: Boolean(body) });
      return new NextResponse(twimlEmpty(), { headers: { "Content-Type": "text/xml" } });
    }

    const supabase = createServiceClient();

    const { data: numberRows } = await supabase
      .from("numbers")
      .select("id, org_id, phone_number, voice_mode, inbound_mode, gateway_url, gateway_token_encrypted, gateway_agent_id, gateway_session_key")
      .eq("phone_number", to)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1);

    const number = numberRows?.[0];

    if (!number) {
      console.warn("Twilio SMS webhook number not found", { to });
      return new NextResponse(twimlEmpty(), { headers: { "Content-Type": "text/xml" } });
    }

    if (messageSid) {
      const { data: existing } = await supabase
        .from("sms_messages")
        .select("id")
        .eq("number_id", number.id)
        .eq("twilio_sid", messageSid)
        .limit(1);
      if (existing && existing.length > 0) {
        // Twilio retries webhooks on timeout/non-2xx. Make processing idempotent.
        return new NextResponse(twimlEmpty(), { headers: { "Content-Type": "text/xml" } });
      }
    }

    const { data: smsRecord } = await supabase
      .from("sms_messages")
      .insert({
        org_id: number.org_id,
        number_id: number.id,
        direction: "inbound",
        customer_number: from,
        body,
        status: "received",
        twilio_sid: messageSid,
        cost_cents: SMS_INBOUND_COST_CENTS,
      })
      .select()
      .single();

    if (smsRecord) {
      await debitCredits(
        number.org_id,
        SMS_INBOUND_COST_CENTS,
        "Inbound SMS",
        smsRecord.id,
        "sms"
      );

      await deliverWebhooks(number.org_id, "sms.received", {
        message_id: toPublicId("msg", smsRecord.id),
        from,
        to: number.phone_number,
        body,
      }).catch(() => {});

      // Auto-reply via gateway if configured
      if (
        number.voice_mode === "gateway" &&
        number.inbound_mode === "autopilot" &&
        number.gateway_url &&
        number.gateway_token_encrypted &&
        number.gateway_agent_id
      ) {
        try {
          const gatewayToken = decrypt(number.gateway_token_encrypted);
          const smsSessionKey = (number.gateway_session_key as string) ||
            `agent:${number.gateway_agent_id}:sms:${from}`;
          // Use per-sender session key for SMS threads
          const sessionKey = smsSessionKey.includes(":sms:")
            ? smsSessionKey
            : `${smsSessionKey}:sms:${from}`;

          const requestFn = isRelayUrl(number.gateway_url) ? relayRequest : openClawRequest;
          let replyText = "";
          await requestFn(
            {
              gatewayUrl: number.gateway_url,
              gatewayToken,
              agentId: number.gateway_agent_id,
              sessionKey,
            },
            {
              message: body,
              extraSystemPrompt:
                "You are replying to an SMS text message. Keep responses under 320 characters. No markdown or formatting. Be conversational and natural.",
            },
            {
              onDelta(text) { replyText = text; },
              onFinal(text) { if (text) replyText = text; },
              onError() {},
            },
            12000 // 12s timeout (under Twilio's 15s)
          );

          if (replyText) {
            const { sid: replySid } = await sendSms(number.phone_number, from, replyText);

            const { data: outbound } = await supabase.from("sms_messages").insert({
              org_id: number.org_id,
              number_id: number.id,
              direction: "outbound",
              customer_number: from,
              body: replyText,
              status: "sent",
              twilio_sid: replySid,
              cost_cents: SMS_OUTBOUND_COST_CENTS,
              metadata: { source: "managed_bridge" },
            }).select().single();

            if (outbound) {
              await debitCredits(number.org_id, SMS_OUTBOUND_COST_CENTS, "Auto-reply SMS", outbound.id, "sms");

              await deliverWebhooks(number.org_id, "sms.sent", {
                message_id: toPublicId("msg", outbound.id),
                from: number.phone_number,
                to: from,
                body: replyText,
              }).catch(() => {});
            }

            await supabase
              .from("sms_messages")
              .update({ status: "replied" })
              .eq("id", smsRecord.id);
          }
        } catch (err) {
          console.error("Gateway SMS auto-reply error:", err);
          // Non-fatal — inbound SMS already stored
        }
      }
    }

    return new NextResponse(twimlEmpty(), { headers: { "Content-Type": "text/xml" } });
  } catch (error) {
    console.error("Twilio SMS webhook error:", error);
    return new NextResponse(twimlEmpty(), { headers: { "Content-Type": "text/xml" } });
  }
}

function twimlEmpty(): string {
  return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>";
}
