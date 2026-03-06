import { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { withApiAuth } from "@/lib/auth/with-api-auth";
import { apiSuccess, apiError, apiList } from "@/lib/api/response";
import { toPublicId } from "@/lib/api/ids";
import { createServiceClient } from "@/lib/supabase/server";
import type { ApiContext } from "@/lib/auth/types";

const VALID_EVENTS = [
  "call.started",
  "call.ended",
  "call.transcript.ready",
  "call.recording.ready",
  "sms.sent",
  "sms.received",
];

export const POST = withApiAuth(async (request: NextRequest, ctx: ApiContext) => {
  const body = await request.json();
  const { url, events = [] } = body;

  if (!url) {
    return apiError("url is required", "validation_error", 400);
  }

  try {
    new URL(url);
  } catch {
    return apiError("url must be a valid URL", "validation_error", 400);
  }

  // Validate events
  const invalidEvents = events.filter((e: string) => !VALID_EVENTS.includes(e));
  if (invalidEvents.length > 0) {
    return apiError(
      `Invalid events: ${invalidEvents.join(", ")}. Valid: ${VALID_EVENTS.join(", ")}`,
      "validation_error",
      400
    );
  }

  const secret = randomBytes(32).toString("hex");
  const supabase = createServiceClient();

  const { data: webhook, error } = await supabase
    .from("webhooks")
    .insert({
      org_id: ctx.orgId,
      url,
      events: events.length > 0 ? events : VALID_EVENTS,
      secret,
      active: true,
    })
    .select()
    .single();

  if (error) {
    return apiError("Failed to create webhook", "internal_error", 500);
  }

  // Return secret only on creation
  return apiSuccess(
    {
      id: toPublicId("wh", webhook.id),
      url: webhook.url,
      events: webhook.events,
      secret, // Only returned once!
      active: webhook.active,
      created_at: webhook.created_at,
    },
    201
  );
});

export const GET = withApiAuth(async (_request: NextRequest, ctx: ApiContext) => {
  const supabase = createServiceClient();

  const { data: webhooks, error } = await supabase
    .from("webhooks")
    .select("*")
    .eq("org_id", ctx.orgId)
    .order("created_at", { ascending: false });

  if (error) {
    return apiError("Failed to fetch webhooks", "internal_error", 500);
  }

  return apiList(
    webhooks!.map((w) => ({
      id: toPublicId("wh", w.id),
      url: w.url,
      events: w.events,
      active: w.active,
      created_at: w.created_at,
    }))
  );
});
