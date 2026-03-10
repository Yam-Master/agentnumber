import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/auth/with-api-auth";
import { apiSuccess, apiError } from "@/lib/api/response";
import { toPublicId, fromPublicId } from "@/lib/api/ids";
import { createServiceClient } from "@/lib/supabase/server";
import { vapi } from "@/lib/vapi";
import type { ApiContext } from "@/lib/auth/types";

export const GET = withApiAuth(async (_request: NextRequest, ctx: ApiContext & { params?: Record<string, string> }) => {
  const uuid = fromPublicId(ctx.params!.id);
  const supabase = createServiceClient();

  const { data: number } = await supabase
    .from("numbers")
    .select("*")
    .eq("id", uuid)
    .eq("org_id", ctx.orgId)
    .single();

  if (!number) {
    return apiError("Number not found", "not_found", 404);
  }

  return apiSuccess(formatNumber(number));
});

export const PATCH = withApiAuth(async (request: NextRequest, ctx: ApiContext & { params?: Record<string, string> }) => {
  const uuid = fromPublicId(ctx.params!.id);
  const body = await request.json();
  const supabase = createServiceClient();

  // Fetch existing number
  const { data: existing } = await supabase
    .from("numbers")
    .select("*")
    .eq("id", uuid)
    .eq("org_id", ctx.orgId)
    .single();

  if (!existing) {
    return apiError("Number not found", "not_found", 404);
  }

  const allowedFields = ["system_prompt", "first_message", "voice_id", "inbound_mode", "webhook_url", "metadata"];
  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  if (
    updates.inbound_mode !== undefined &&
    !["autopilot", "webhook", "managed_bridge"].includes(String(updates.inbound_mode))
  ) {
    return apiError("inbound_mode must be autopilot, webhook, or managed_bridge", "validation_error", 400);
  }

  if (Object.keys(updates).length === 0) {
    return apiError("No valid fields to update", "validation_error", 400);
  }

  // Sync to Vapi assistant if relevant fields changed
  const vapiUpdate: Record<string, unknown> = {};
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://agentnumber.vercel.app");
  const nextInboundMode = (updates.inbound_mode as string | undefined) || existing.inbound_mode;

  if (nextInboundMode === "managed_bridge") {
    vapiUpdate.model = {
      provider: "custom-llm",
      url: `${baseUrl}/api/v0/voice/${existing.id}`,
      model: "custom",
    };
  } else if (updates.webhook_url) {
    vapiUpdate.model = {
      provider: "custom-llm",
      url: updates.webhook_url,
      model: "custom",
    };
  }
  if (updates.voice_id) {
    vapiUpdate.voice = { provider: "11labs", voiceId: updates.voice_id };
  }
  if (updates.first_message !== undefined) {
    vapiUpdate.firstMessage = updates.first_message || undefined;
  }

  if (Object.keys(vapiUpdate).length > 0) {
    await vapi.assistants.update(existing.vapi_assistant_id, vapiUpdate);
  }

  // Update DB
  const { data: updated, error } = await supabase
    .from("numbers")
    .update(updates)
    .eq("id", uuid)
    .select()
    .single();

  if (error) {
    return apiError("Failed to update number", "internal_error", 500);
  }

  return apiSuccess(formatNumber(updated));
});

export const DELETE = withApiAuth(async (_request: NextRequest, ctx: ApiContext & { params?: Record<string, string> }) => {
  const uuid = fromPublicId(ctx.params!.id);
  const supabase = createServiceClient();

  const { data: number } = await supabase
    .from("numbers")
    .select("*")
    .eq("id", uuid)
    .eq("org_id", ctx.orgId)
    .single();

  if (!number) {
    return apiError("Number not found", "not_found", 404);
  }

  // Soft-delete: mark as released
  await supabase
    .from("numbers")
    .update({ status: "released" })
    .eq("id", uuid);

  // Cleanup Vapi resources
  await vapi.phoneNumbers.delete({ id: number.vapi_phone_number_id }).catch(() => {});
  await vapi.assistants.delete({ id: number.vapi_assistant_id }).catch(() => {});

  return apiSuccess({ id: toPublicId("num", uuid), deleted: true });
});

function formatNumber(n: Record<string, unknown>) {
  return {
    id: toPublicId("num", n.id as string),
    phone_number: n.phone_number,
    system_prompt: n.system_prompt,
    first_message: n.first_message,
    voice_id: n.voice_id,
    webhook_url: n.webhook_url,
    inbound_mode: n.inbound_mode,
    metadata: n.metadata,
    status: n.status,
    created_at: n.created_at,
  };
}
