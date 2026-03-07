import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { debitCredits } from "@/lib/credits/operations";
import { deliverWebhooks } from "@/lib/webhooks/deliver";
import { toPublicId } from "@/lib/api/ids";
import crypto from "crypto";

const SMS_INBOUND_COST_CENTS = 1; // $0.01 per inbound SMS

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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Validate Twilio signature
    const params = new URLSearchParams();
    formData.forEach((value, key) => params.append(key, String(value)));
    if (!validateTwilioSignature(request, params)) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    const from = formData.get("From") as string;
    const to = formData.get("To") as string;
    const body = formData.get("Body") as string;
    const messageSid = formData.get("MessageSid") as string;

    if (!from || !to || !body) {
      return new NextResponse(twimlEmpty(), { headers: { "Content-Type": "text/xml" } });
    }

    const supabase = createServiceClient();

    const { data: number } = await supabase
      .from("numbers")
      .select("id, org_id, phone_number")
      .eq("phone_number", to)
      .eq("status", "active")
      .single();

    if (!number) {
      return new NextResponse(twimlEmpty(), { headers: { "Content-Type": "text/xml" } });
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
