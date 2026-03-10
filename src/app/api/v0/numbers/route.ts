import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/auth/with-api-auth";
import { apiSuccess, apiError, apiList } from "@/lib/api/response";
import { toPublicId } from "@/lib/api/ids";
import { createServiceClient } from "@/lib/supabase/server";
import { findAvailableNumber, buyNumber, updateNumberWebhooks, TWILIO_SID, TWILIO_TOKEN } from "@/lib/twilio";
import { vapi } from "@/lib/vapi";
import { rateLimit } from "@/lib/rate-limit";
import { encrypt } from "@/lib/crypto";
import type { ApiContext } from "@/lib/auth/types";

export const POST = withApiAuth(async (request: NextRequest, ctx: ApiContext) => {
  if (!rateLimit(`numbers:${ctx.orgId}`, 10, 3600000)) {
    return apiError("Rate limit exceeded. Max 10 numbers per hour.", "rate_limit", 429);
  }

  const body = await request.json();
  const {
    area_code = "941",
    voice_id = "cgSgspJ2msm6clMCkdW9",
    webhook_url,
    system_prompt,
    first_message,
    inbound_mode = "autopilot",
    metadata = {},
    gateway_url,
    gateway_token,
    gateway_agent_id,
    gateway_session_key,
  } = body;

  // Must provide one of: gateway config, webhook_url, or system_prompt
  if (!webhook_url && !system_prompt && !gateway_url) {
    return apiError(
      "Provide gateway_url + gateway_token + gateway_agent_id (OpenClaw bridge), webhook_url (your agent's endpoint), or system_prompt (managed by AgentNumber).",
      "validation_error",
      400
    );
  }

  // Validate gateway config completeness
  if (gateway_url && (!gateway_token || !gateway_agent_id)) {
    return apiError(
      "gateway_url requires gateway_token and gateway_agent_id.",
      "validation_error",
      400
    );
  }

  // Determine voice_mode
  const voice_mode = gateway_url ? "gateway" : webhook_url ? "webhook" : "anthropic";

  // 1. Find and buy a Twilio number
  let e164Number: string;
  let twilioNumberSid: string;
  try {
    const available = await findAvailableNumber(area_code);
    const bought = await buyNumber(available);
    e164Number = bought.phoneNumber;
    twilioNumberSid = bought.sid;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to provision phone number";
    return apiError(message, "provisioning_error", 500);
  }

  const supabase = createServiceClient();

  // We need the number's DB ID to build the managed voice URL, so insert first with a placeholder
  // Then create the Vapi assistant with the correct URL

  // 2. Insert number record (get the ID)
  const { data: numberRecord, error: insertError } = await supabase
    .from("numbers")
    .insert({
      org_id: ctx.orgId,
      phone_number: e164Number,
      system_prompt: system_prompt || null,
      first_message: first_message || null,
      voice_id,
      inbound_mode,
      webhook_url: webhook_url || null,
      voice_mode,
      gateway_url: gateway_url || null,
      gateway_token_encrypted: gateway_token ? encrypt(gateway_token) : null,
      gateway_agent_id: gateway_agent_id || null,
      gateway_session_key: gateway_session_key || null,
      metadata,
      vapi_assistant_id: "pending",
      vapi_phone_number_id: "pending",
      status: "active",
    })
    .select()
    .single();

  if (insertError) {
    return apiError("Failed to create number record", "internal_error", 500);
  }

  // 3. Determine the LLM URL for Vapi
  // webhook mode: user's own server
  // gateway/anthropic: AgentNumber's managed voice endpoint
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://agentnumber.vercel.app");

  const llmUrl = voice_mode === "webhook"
    ? webhook_url
    : `${baseUrl}/api/v0/voice/${numberRecord.id}`;

  // 4. Create Vapi assistant in custom-LLM mode
  const assistant = await vapi.assistants.create({
    name: `an-${ctx.orgId.slice(0, 8)}`,
    voice: { provider: "11labs", voiceId: voice_id },
    firstMessage: first_message || undefined,
    model: {
      provider: "custom-llm",
      url: llmUrl,
      model: "custom",
    },
  });

  // 5. Import number into Vapi
  let vapiPhone;
  try {
    vapiPhone = await vapi.phoneNumbers.create({
      provider: "twilio",
      number: e164Number,
      twilioAccountSid: TWILIO_SID,
      twilioAuthToken: TWILIO_TOKEN,
      assistantId: assistant.id,
    });
  } catch (err) {
    await vapi.assistants.delete({ id: assistant.id }).catch(() => {});
    await supabase.from("numbers").delete().eq("id", numberRecord.id);
    const message = err instanceof Error ? err.message : "Failed to connect number to Vapi";
    return apiError(message, "provisioning_error", 500);
  }

  // 6. Update number record with Vapi IDs
  const { data: number, error } = await supabase
    .from("numbers")
    .update({
      vapi_assistant_id: assistant.id,
      vapi_phone_number_id: vapiPhone.id,
    })
    .eq("id", numberRecord.id)
    .select()
    .single();

  if (error) {
    await vapi.phoneNumbers.delete({ id: vapiPhone.id }).catch(() => {});
    await vapi.assistants.delete({ id: assistant.id }).catch(() => {});
    return apiError("Failed to update number", "internal_error", 500);
  }

  // 7. Configure SMS webhook on the Twilio number
  try {
    await updateNumberWebhooks(twilioNumberSid, `${baseUrl}/api/webhooks/twilio/sms`);
  } catch {
    // Non-fatal — SMS inbound won't work but number is still provisioned
    console.error("Failed to configure SMS webhook on Twilio number");
  }

  return apiSuccess(formatNumber(number!), 201);
});

export const GET = withApiAuth(async (_request: NextRequest, ctx: ApiContext) => {
  const supabase = createServiceClient();

  const { data: numbers, error } = await supabase
    .from("numbers")
    .select("*")
    .eq("org_id", ctx.orgId)
    .neq("status", "released")
    .order("created_at", { ascending: false });

  if (error) {
    return apiError("Failed to fetch numbers", "internal_error", 500);
  }

  return apiList(numbers!.map(formatNumber));
});

function formatNumber(n: Record<string, unknown>) {
  return {
    id: toPublicId("num", n.id as string),
    phone_number: n.phone_number,
    voice_mode: n.voice_mode,
    system_prompt: n.system_prompt,
    first_message: n.first_message,
    voice_id: n.voice_id,
    webhook_url: n.webhook_url,
    gateway_url: n.gateway_url,
    gateway_agent_id: n.gateway_agent_id,
    gateway_session_key: n.gateway_session_key,
    inbound_mode: n.inbound_mode,
    metadata: n.metadata,
    status: n.status,
    created_at: n.created_at,
  };
}
