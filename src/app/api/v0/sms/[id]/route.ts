import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/auth/with-api-auth";
import { apiSuccess, apiError } from "@/lib/api/response";
import { toPublicId, fromPublicId } from "@/lib/api/ids";
import { createServiceClient } from "@/lib/supabase/server";
import type { ApiContext } from "@/lib/auth/types";

export const GET = withApiAuth(async (_request: NextRequest, ctx: ApiContext & { params?: Record<string, string> }) => {
  const uuid = fromPublicId(ctx.params!.id);
  const supabase = createServiceClient();

  const { data: msg } = await supabase
    .from("sms_messages")
    .select("*, numbers!number_id(phone_number)")
    .eq("id", uuid)
    .eq("org_id", ctx.orgId)
    .single();

  if (!msg) {
    return apiError("Message not found", "not_found", 404);
  }

  const phoneNumber = (msg.numbers as Record<string, unknown>)?.phone_number as string;

  return apiSuccess({
    id: toPublicId("msg", msg.id),
    from: (msg.direction === "outbound" ? phoneNumber : msg.customer_number) || null,
    to: (msg.direction === "outbound" ? msg.customer_number : phoneNumber) || null,
    direction: msg.direction,
    body: msg.body,
    status: msg.status,
    twilio_sid: msg.twilio_sid,
    cost_cents: msg.cost_cents,
    metadata: msg.metadata,
    created_at: msg.created_at,
  });
});
