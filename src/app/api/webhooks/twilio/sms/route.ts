import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { debitCredits } from "@/lib/credits/operations";
import { deliverWebhooks } from "@/lib/webhooks/deliver";
import { sendSms } from "@/lib/twilio";
import { toPublicId } from "@/lib/api/ids";
import crypto from "crypto";

const SMS_INBOUND_COST_CENTS = 1; // $0.01 per inbound SMS
const SMS_OUTBOUND_COST_CENTS = 2; // $0.02 per outbound SMS

function validateTwilioSignature(request: NextRequest, params: URLSearchParams): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return true; // Skip validation if not configured (local dev)

  const signature = request.headers.get("x-twilio-signature");
  if (!signature) return false;

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://agentnumber.vercel.app";
  const url = `${baseUrl}/api/webhooks/twilio/sms`;

  // Twilio: sort POST params alphabetically, concatenate key+value
  const sortedParams = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => k + v)
    .join("");

  const expected = crypto
    .createHmac("sha1", authToken)
    .update(url + sortedParams)
    .digest("base64");

  return signature === expected;
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
      .select("id, org_id, phone_number, webhook_url")
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

    // Auto-reply: if the number has a webhook_url (agent bridge), forward and reply
    if (number.webhook_url) {
      autoReply(number.webhook_url, number.org_id, number.id, number.phone_number, from, body);
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

// Fire-and-forget: forward SMS to agent bridge, send reply back via Twilio
function autoReply(
  webhookUrl: string,
  orgId: string,
  numberId: string,
  numberPhone: string,
  customerPhone: string,
  messageBody: string,
) {
  (async () => {
    try {
      const res = await fetch(`${webhookUrl}/sms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: customerPhone, body: messageBody }),
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        console.error("SMS auto-reply bridge error:", res.status);
        return;
      }

      const data = await res.json();
      const replyText = data.body;
      if (!replyText) return;

      // Send the reply via Twilio
      const twilioResult = await sendSms(numberPhone, customerPhone, replyText);

      // Record the outbound reply
      const supabase = createServiceClient();
      const { data: replyRecord } = await supabase
        .from("sms_messages")
        .insert({
          org_id: orgId,
          number_id: numberId,
          direction: "outbound",
          customer_number: customerPhone,
          body: replyText,
          status: twilioResult.status || "sent",
          twilio_sid: twilioResult.sid,
          cost_cents: SMS_OUTBOUND_COST_CENTS,
        })
        .select()
        .single();

      if (replyRecord) {
        await debitCredits(orgId, SMS_OUTBOUND_COST_CENTS, "Auto-reply SMS", replyRecord.id, "sms");

        await deliverWebhooks(orgId, "sms.sent", {
          message_id: toPublicId("msg", replyRecord.id),
          from: numberPhone,
          to: customerPhone,
          body: replyText,
        }).catch(() => {});
      }

      console.log(`SMS auto-reply to ${customerPhone}: "${replyText}"`);
    } catch (err) {
      console.error("SMS auto-reply failed:", err);
    }
  })();
}
