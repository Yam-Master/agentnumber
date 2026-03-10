import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/auth/with-api-auth";
import { apiSuccess, apiError } from "@/lib/api/response";
import { createServiceClient } from "@/lib/supabase/server";
import type { ApiContext } from "@/lib/auth/types";

export const GET = withApiAuth(async (_request: NextRequest, ctx: ApiContext) => {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("managed_bridge_connections")
    .select("gateway_url, agent_id, enabled, sms_autoreply, voice_rules, sms_rules, created_at, updated_at")
    .eq("org_id", ctx.orgId)
    .single();

  return apiSuccess({
    configured: Boolean(data),
    config: data || null,
  });
});

export const PUT = withApiAuth(async (request: NextRequest, ctx: ApiContext) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", "validation_error", 400);
  }
  const gatewayUrl = typeof body.gateway_url === "string" ? body.gateway_url.trim() : "";
  const gatewayToken = typeof body.gateway_token === "string" ? body.gateway_token.trim() : "";
  const agentId = typeof body.agent_id === "string" && body.agent_id.trim() ? body.agent_id.trim() : "main";
  const enabled = body.enabled !== false;
  const smsAutoreply = body.sms_autoreply === true;
  const voiceRules = typeof body.voice_rules === "string" ? body.voice_rules : null;
  const smsRules = typeof body.sms_rules === "string" ? body.sms_rules : null;

  if (!gatewayUrl || !gatewayToken) {
    return apiError("gateway_url and gateway_token are required", "validation_error", 400);
  }
  if (!/^wss?:\/\//i.test(gatewayUrl)) {
    return apiError("gateway_url must be ws:// or wss://", "validation_error", 400);
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("managed_bridge_connections")
    .upsert({
      org_id: ctx.orgId,
      gateway_url: gatewayUrl,
      gateway_token: gatewayToken,
      agent_id: agentId,
      enabled,
      sms_autoreply: smsAutoreply,
      voice_rules: voiceRules,
      sms_rules: smsRules,
      updated_at: new Date().toISOString(),
    })
    .select("gateway_url, agent_id, enabled, sms_autoreply, voice_rules, sms_rules, created_at, updated_at")
    .single();

  if (error) {
    return apiError("Failed to save managed bridge config", "internal_error", 500);
  }

  return apiSuccess({ configured: true, config: data });
});

export const DELETE = withApiAuth(async (_request: NextRequest, ctx: ApiContext) => {
  const supabase = createServiceClient();
  await supabase.from("managed_bridge_connections").delete().eq("org_id", ctx.orgId);
  return apiSuccess({ configured: false });
});
