import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { debitCredits } from "@/lib/credits/operations";
import { deliverWebhooks } from "@/lib/webhooks/deliver";
import { toPublicId } from "@/lib/api/ids";
import { runManagedBridge } from "@/lib/openclaw-bridge";
import { sendSms } from "@/lib/twilio";
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
      .select("id, org_id, phone_number, inbound_mode")
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

      if (number.inbound_mode === "managed_bridge") {
        const { data: bridge } = await supabase
          .from("managed_bridge_connections")
          .select("gateway_url, gateway_token, agent_id, enabled, sms_autoreply, voice_rules, sms_rules")
          .eq("org_id", number.org_id)
          .single();

        if (bridge?.enabled && bridge?.sms_autoreply) {
          try {
            const reply = await runManagedBridge({
              config: {
                gateway_url: bridge.gateway_url as string,
                gateway_token: bridge.gateway_token as string,
                agent_id: (bridge.agent_id as string) || "main",
                voice_rules: (bridge.voice_rules as string | null) ?? null,
                sms_rules: (bridge.sms_rules as string | null) ?? null,
              },
              sessionKey: `agent:${(bridge.agent_id as string) || "main"}:sms:${from}`,
              message: body,
              mode: "sms",
            });

            const cleanReply = reply.trim();
            if (cleanReply) {
              const sent = await sendSms(number.phone_number as string, from, cleanReply);

              const { data: outbound } = await supabase
                .from("sms_messages")
                .insert({
                  org_id: number.org_id,
                  number_id: number.id,
                  direction: "outbound",
                  customer_number: from,
                  body: cleanReply,
                  status: sent.status || "sent",
                  twilio_sid: sent.sid,
                  cost_cents: SMS_OUTBOUND_COST_CENTS,
                  metadata: { source: "managed_bridge" },
                })
                .select()
                .single();

              if (outbound) {
                await debitCredits(
                  number.org_id,
                  SMS_OUTBOUND_COST_CENTS,
                  "Outbound SMS (managed bridge)",
                  outbound.id,
                  "sms"
                );
                await deliverWebhooks(number.org_id, "sms.sent", {
                  message_id: toPublicId("msg", outbound.id),
                  from: number.phone_number,
                  to: from,
                  body: cleanReply,
                }).catch(() => {});
              }
            }
          } catch (err) {
            console.error("Managed bridge SMS autoreply failed:", err);
          }
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
