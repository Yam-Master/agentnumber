import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/auth/with-api-auth";
import { apiSuccess, apiError } from "@/lib/api/response";
import { toPublicId, fromPublicId } from "@/lib/api/ids";
import { createServiceClient } from "@/lib/supabase/server";
import type { ApiContext } from "@/lib/auth/types";

export const PATCH = withApiAuth(async (request: NextRequest, ctx: ApiContext & { params?: Record<string, string> }) => {
  const uuid = fromPublicId(ctx.params!.id);
  const body = await request.json();
  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("webhooks")
    .select("*")
    .eq("id", uuid)
    .eq("org_id", ctx.orgId)
    .single();

  if (!existing) {
    return apiError("Webhook not found", "not_found", 404);
  }

  const updates: Record<string, unknown> = {};
  if ("url" in body) updates.url = body.url;
  if ("events" in body) updates.events = body.events;
  if ("active" in body) updates.active = body.active;

  if (Object.keys(updates).length === 0) {
    return apiError("No valid fields to update", "validation_error", 400);
  }

  const { data: updated, error } = await supabase
    .from("webhooks")
    .update(updates)
    .eq("id", uuid)
    .select()
    .single();

  if (error) {
    return apiError("Failed to update webhook", "internal_error", 500);
  }

  return apiSuccess({
    id: toPublicId("wh", updated.id),
    url: updated.url,
    events: updated.events,
    active: updated.active,
    created_at: updated.created_at,
  });
});

export const DELETE = withApiAuth(async (_request: NextRequest, ctx: ApiContext & { params?: Record<string, string> }) => {
  const uuid = fromPublicId(ctx.params!.id);
  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("webhooks")
    .select("id")
    .eq("id", uuid)
    .eq("org_id", ctx.orgId)
    .single();

  if (!existing) {
    return apiError("Webhook not found", "not_found", 404);
  }

  await supabase.from("webhooks").delete().eq("id", uuid);

  return apiSuccess({ id: toPublicId("wh", uuid), deleted: true });
});
