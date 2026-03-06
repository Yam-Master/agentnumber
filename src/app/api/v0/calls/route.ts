import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/auth/with-api-auth";
import { apiSuccess, apiError, apiList } from "@/lib/api/response";
import { toPublicId, fromPublicId } from "@/lib/api/ids";
import { createServiceClient } from "@/lib/supabase/server";
import { checkBalance } from "@/lib/credits/operations";
import { vapi } from "@/lib/vapi";
import { rateLimit } from "@/lib/rate-limit";
import type { ApiContext } from "@/lib/auth/types";

const MIN_CALL_CREDITS = 100; // $1.00 minimum balance for calls

export const POST = withApiAuth(async (request: NextRequest, ctx: ApiContext) => {
  if (!rateLimit(`calls:${ctx.orgId}`, 100, 3600000)) {
    return apiError("Rate limit exceeded. Max 100 calls per hour.", "rate_limit", 429);
  }

  const body = await request.json();
  const { from, to, system_prompt, voice_id, max_duration, record, metadata = {} } = body;

  if (!from || !to) {
    return apiError("from (number ID) and to (E.164 phone number) are required", "validation_error", 400);
  }

  // Validate E.164 format
  if (!/^\+[1-9]\d{1,14}$/.test(to)) {
    return apiError("to must be a valid E.164 phone number", "validation_error", 400);
  }

  // Lookup number
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

  // Check credits
  const balance = await checkBalance(ctx.orgId);
  if (balance < MIN_CALL_CREDITS) {
    return apiError(
      `Insufficient credits. Need at least ${MIN_CALL_CREDITS} cents.`,
      "insufficient_credits",
      402
    );
  }

  // Build assistant overrides if provided
  const assistantOverrides: Record<string, unknown> = {};
  if (system_prompt) {
    assistantOverrides.model = {
      provider: "openai",
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: system_prompt }],
    };
  }
  if (voice_id) {
    assistantOverrides.voice = { provider: "11labs", voiceId: voice_id };
  }

  // Create call via Vapi
  const vapiCall = await vapi.calls.create({
    assistantId: number.vapi_assistant_id,
    phoneNumberId: number.vapi_phone_number_id,
    customer: { number: to },
    ...(max_duration ? { maxDurationSeconds: max_duration } : {}),
    ...(Object.keys(assistantOverrides).length > 0
      ? { assistantOverrides }
      : {}),
  });

  const vapiCallId = "id" in vapiCall ? vapiCall.id : undefined;

  if (!vapiCallId) {
    return apiError("Failed to initiate call with Vapi", "provider_error", 502);
  }

  // Insert call record
  const { data: call, error } = await supabase
    .from("calls")
    .insert({
      agent_id: null,
      org_id: ctx.orgId,
      number_id: number.id,
      vapi_call_id: vapiCallId,
      direction: "outbound",
      customer_number: to,
      status: "initiated",
      metadata,
    })
    .select()
    .single();

  if (error) {
    return apiError("Failed to create call record", "internal_error", 500);
  }

  return apiSuccess(formatCall(call, number.phone_number), 201);
});

export const GET = withApiAuth(async (request: NextRequest, ctx: ApiContext) => {
  const supabase = createServiceClient();
  const { searchParams } = new URL(request.url);
  const numberId = searchParams.get("number_id");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const offset = parseInt(searchParams.get("offset") || "0");

  let query = supabase
    .from("calls")
    .select("*, numbers!number_id(phone_number)", { count: "exact" })
    .eq("org_id", ctx.orgId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (numberId) {
    query = query.eq("number_id", fromPublicId(numberId));
  }

  const { data: calls, count, error } = await query;

  if (error) {
    return apiError("Failed to fetch calls", "internal_error", 500);
  }

  return apiList(
    calls!.map((c) => formatCall(c, (c.numbers as Record<string, unknown>)?.phone_number as string)),
    { total: count ?? 0, offset, limit }
  );
});

function formatCall(c: Record<string, unknown>, fromNumber?: string) {
  return {
    id: toPublicId("call", c.id as string),
    from: fromNumber || null,
    to: c.customer_number,
    direction: c.direction,
    status: c.status,
    duration: c.duration,
    cost_cents: c.cost_cents,
    metadata: c.metadata,
    created_at: c.created_at,
  };
}
