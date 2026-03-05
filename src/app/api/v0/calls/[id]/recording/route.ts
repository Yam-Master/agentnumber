import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/auth/with-api-auth";
import { apiSuccess, apiError } from "@/lib/api/response";
import { fromPublicId } from "@/lib/api/ids";
import { createServiceClient } from "@/lib/supabase/server";
import type { ApiContext } from "@/lib/auth/types";

export const GET = withApiAuth(async (_request: NextRequest, ctx: ApiContext & { params?: Record<string, string> }) => {
  const uuid = fromPublicId(ctx.params!.id);
  const supabase = createServiceClient();

  const { data: call } = await supabase
    .from("calls")
    .select("id, recording_url")
    .eq("id", uuid)
    .eq("org_id", ctx.orgId)
    .single();

  if (!call) {
    return apiError("Call not found", "not_found", 404);
  }

  if (!call.recording_url) {
    return apiError("Recording not yet available", "not_ready", 404);
  }

  return apiSuccess({ url: call.recording_url });
});
