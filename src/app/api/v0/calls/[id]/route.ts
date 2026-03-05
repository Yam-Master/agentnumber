import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/auth/with-api-auth";
import { apiSuccess, apiError } from "@/lib/api/response";
import { toPublicId, fromPublicId } from "@/lib/api/ids";
import { createServiceClient } from "@/lib/supabase/server";
import type { ApiContext } from "@/lib/auth/types";

export const GET = withApiAuth(async (_request: NextRequest, ctx: ApiContext & { params?: Record<string, string> }) => {
  const uuid = fromPublicId(ctx.params!.id);
  const supabase = createServiceClient();

  const { data: call } = await supabase
    .from("calls")
    .select("*, numbers!number_id(phone_number)")
    .eq("id", uuid)
    .eq("org_id", ctx.orgId)
    .single();

  if (!call) {
    return apiError("Call not found", "not_found", 404);
  }

  const fromNumber = (call.numbers as Record<string, unknown>)?.phone_number as string;

  return apiSuccess({
    id: toPublicId("call", call.id),
    from: fromNumber || null,
    to: call.customer_number,
    direction: call.direction,
    status: call.status,
    duration: call.duration,
    transcript: call.transcript,
    summary: call.summary,
    cost_cents: call.cost_cents,
    metadata: call.metadata,
    ended_reason: call.ended_reason,
    created_at: call.created_at,
  });
});
