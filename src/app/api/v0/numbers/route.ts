import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/auth/with-api-auth";
import { apiSuccess, apiError, apiList } from "@/lib/api/response";
import { toPublicId } from "@/lib/api/ids";
import { createServiceClient } from "@/lib/supabase/server";
import { checkBalance, debitCredits } from "@/lib/credits/operations";
import { vapi } from "@/lib/vapi";
import type { ApiContext } from "@/lib/auth/types";

const NUMBER_COST_CENTS = 500; // $5.00
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID!;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN!;

async function findAvailableNumber(areaCode: string): Promise<string> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/AvailablePhoneNumbers/US/Local.json?Limit=1&AreaCode=${areaCode}`;
  const res = await fetch(url, {
    headers: {
      Authorization: "Basic " + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString("base64"),
    },
  });
  const data = await res.json();
  if (!data.available_phone_numbers?.length) {
    throw new Error(`No numbers available for area code ${areaCode}`);
  }
  return data.available_phone_numbers[0].phone_number;
}

async function buyTwilioNumber(phoneNumber: string): Promise<string> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/IncomingPhoneNumbers.json`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ PhoneNumber: phoneNumber }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to purchase number from Twilio");
  }
  return data.phone_number;
}

export const POST = withApiAuth(async (request: NextRequest, ctx: ApiContext) => {
  const body = await request.json();
  const {
    area_code = "941",
    voice_id = "cgSgspJ2msm6clMCkdW9",
    webhook_url,
    first_message,
    inbound_mode = "autopilot",
    metadata = {},
  } = body;

  // webhook_url is required — this is where your agent receives calls
  if (!webhook_url) {
    return apiError(
      "webhook_url is required. This is the endpoint your agent exposes to handle voice conversations (OpenAI-compatible chat completions format).",
      "validation_error",
      400
    );
  }

  // Check credits
  const balance = await checkBalance(ctx.orgId);
  if (balance < NUMBER_COST_CENTS) {
    return apiError(
      `Insufficient credits. Need ${NUMBER_COST_CENTS} cents, have ${balance} cents.`,
      "insufficient_credits",
      402
    );
  }

  // 1. Find and buy a Twilio number
  let e164Number: string;
  try {
    const available = await findAvailableNumber(area_code);
    e164Number = await buyTwilioNumber(available);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to provision phone number";
    return apiError(message, "provisioning_error", 500);
  }

  // 2. Create Vapi assistant in custom-LLM mode
  // Vapi handles STT/TTS, agent's webhook handles the AI
  const assistant = await vapi.assistants.create({
    name: `an-${ctx.orgId.slice(0, 8)}`,
    voice: { provider: "11labs", voiceId: voice_id },
    firstMessage: first_message || undefined,
    model: {
      provider: "custom-llm",
      url: webhook_url,
      model: "custom",
    },
  });

  // 3. Import number into Vapi
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
    const message = err instanceof Error ? err.message : "Failed to connect number to Vapi";
    return apiError(message, "provisioning_error", 500);
  }

  const supabase = createServiceClient();

  // 4. Insert number record
  const { data: number, error } = await supabase
    .from("numbers")
    .insert({
      org_id: ctx.orgId,
      phone_number: e164Number,
      first_message: first_message || null,
      voice_id,
      inbound_mode,
      webhook_url,
      metadata,
      vapi_assistant_id: assistant.id,
      vapi_phone_number_id: vapiPhone.id,
      status: "active",
    })
    .select()
    .single();

  if (error) {
    await vapi.phoneNumbers.delete({ id: vapiPhone.id }).catch(() => {});
    await vapi.assistants.delete({ id: assistant.id }).catch(() => {});
    return apiError("Failed to create number", "internal_error", 500);
  }

  // 5. Debit credits
  await debitCredits(ctx.orgId, NUMBER_COST_CENTS, "Phone number provisioning", number.id, "number");

  return apiSuccess(formatNumber(number), 201);
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
    first_message: n.first_message,
    voice_id: n.voice_id,
    webhook_url: n.webhook_url,
    inbound_mode: n.inbound_mode,
    metadata: n.metadata,
    status: n.status,
    created_at: n.created_at,
  };
}
