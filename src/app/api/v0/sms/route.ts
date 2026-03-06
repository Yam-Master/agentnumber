import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/auth/with-api-auth";
import { apiSuccess, apiError, apiList } from "@/lib/api/response";
import { toPublicId, fromPublicId } from "@/lib/api/ids";
import { createServiceClient } from "@/lib/supabase/server";
import { checkBalance, debitCredits } from "@/lib/credits/operations";
import { sendSms } from "@/lib/twilio";
import { deliverWebhooks } from "@/lib/webhooks/deliver";
import { rateLimit } from "@/lib/rate-limit";
import type { ApiContext } from "@/lib/auth/types";

const SMS_COST_CENTS = 2; // $0.02 per outbound SMS

export const POST = withApiAuth(async (request: NextRequest, ctx: ApiContext) => {
  if (!rateLimit(`sms:${ctx.orgId}`, 500, 3600000)) {
    return apiError("Rate limit exceeded. Max 500 SMS per hour.", "rate_limit", 429);
  }

  const body = await request.json();
  const { from, to, body: messageBody, metadata = {} } = body;

  if (!from || !to || !messageBody) {
    return apiError("from (number ID), to (E.164), and body are required", "validation_error", 400);
  }

  if (!/^\+[1-9]\d{1,14}$/.test(to)) {
    return apiError("to must be a valid E.164 phone number", "validation_error", 400);
  }

  if (messageBody.length < 1 || messageBody.length > 1600) {
    return apiError("body must be 1-1600 characters", "validation_error", 400);
  }

  const numberId = fromPublicId(from);
  const supabase = createServiceClient();

  const { data: number } = await supabase
    .from("numbers")
    .select("*")
    .eq("id", numberId)
    .eq("org_id", ctx.orgId)
    .eq("status", "active")
    .single();

  if (!number) {
    return apiError("Number not found or inactive", "not_found", 404);
  }

  const balance = await checkBalance(ctx.orgId);
  if (balance < SMS_COST_CENTS) {
    return apiError(
      `Insufficient credits. Need ${SMS_COST_CENTS} cents, have ${balance} cents.`,
      "insufficient_credits",
      402
    );
  }

  let twilioResult: { sid: string; status: string };
  try {
    twilioResult = await sendSms(number.phone_number, to, messageBody);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send SMS";
    return apiError(message, "sms_error", 500);
  }

  const { data: smsRecord, error } = await supabase
    .from("sms_messages")
    .insert({
      org_id: ctx.orgId,
      number_id: number.id,
      direction: "outbound",
      customer_number: to,
      body: messageBody,
      status: twilioResult.status || "sent",
      twilio_sid: twilioResult.sid,
      cost_cents: SMS_COST_CENTS,
      metadata,
    })
    .select()
    .single();

  if (error) {
    return apiError("Failed to create SMS record", "internal_error", 500);
  }

  await debitCredits(ctx.orgId, SMS_COST_CENTS, "Outbound SMS", smsRecord.id, "sms");

  await deliverWebhooks(ctx.orgId, "sms.sent", {
    message_id: toPublicId("msg", smsRecord.id),
    from: number.phone_number,
    to,
    body: messageBody,
  }).catch(() => {});

  return apiSuccess(formatMessage(smsRecord, number.phone_number), 201);
});

export const GET = withApiAuth(async (request: NextRequest, ctx: ApiContext) => {
  const supabase = createServiceClient();
  const { searchParams } = new URL(request.url);
  const numberId = searchParams.get("number_id");
  const direction = searchParams.get("direction");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const offset = parseInt(searchParams.get("offset") || "0");

  let query = supabase
    .from("sms_messages")
    .select("*, numbers!number_id(phone_number)", { count: "exact" })
    .eq("org_id", ctx.orgId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (numberId) {
    query = query.eq("number_id", fromPublicId(numberId));
  }
  if (direction) {
    query = query.eq("direction", direction);
  }

  const { data: messages, count, error } = await query;

  if (error) {
    return apiError("Failed to fetch messages", "internal_error", 500);
  }

  return apiList(
    messages!.map((m) =>
      formatMessage(m, (m.numbers as Record<string, unknown>)?.phone_number as string)
    ),
    { total: count ?? 0, offset, limit }
  );
});

function formatMessage(m: Record<string, unknown>, fromNumber?: string) {
  return {
    id: toPublicId("msg", m.id as string),
    from: (m.direction === "outbound" ? fromNumber : m.customer_number) || null,
    to: (m.direction === "outbound" ? m.customer_number : fromNumber) || null,
    direction: m.direction,
    body: m.body,
    status: m.status,
    cost_cents: m.cost_cents,
    metadata: m.metadata,
    created_at: m.created_at,
  };
}
