const VAPI_BASE = "https://api.vapi.ai";

function getApiKey(): string {
  const key = process.env.VAPI_API_KEY;
  if (!key) {
    throw new Error("VAPI_API_KEY is not configured");
  }
  return key;
}

function headers() {
  return {
    Authorization: `Bearer ${getApiKey()}`,
    "Content-Type": "application/json",
  };
}

interface ProvisionOptions {
  areaCode?: string;
  systemPrompt?: string;
  voiceId?: string;
  model?: string;
  name?: string;
  firstMessage?: string;
}

interface ProvisionResult {
  phoneNumber: string;
  assistantId: string;
  phoneNumberId: string;
}

export async function provisionNumber(
  opts: ProvisionOptions = {}
): Promise<ProvisionResult> {
  const {
    areaCode = "415",
    systemPrompt = "You are a helpful AI assistant.",
    voiceId = "sarah",
    model = "claude-sonnet-4-5-20250514",
    name = `agent-${Date.now()}`,
    firstMessage = "Hello, this is your AI agent. How can I help you?",
  } = opts;

  // 1. Create assistant
  const assistantRes = await fetch(`${VAPI_BASE}/assistant`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      name,
      model: { provider: "anthropic", model },
      voice: { provider: "11labs", voiceId },
      firstMessage,
      instructions: systemPrompt,
    }),
  });

  if (!assistantRes.ok) {
    const err = await assistantRes.text();
    throw new Error(`Vapi assistant creation failed: ${err}`);
  }

  const assistant = await assistantRes.json();

  // 2. Create phone number linked to assistant
  const phoneRes = await fetch(`${VAPI_BASE}/phone-number`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      provider: "vapi",
      assistantId: assistant.id,
      numberDesiredAreaCode: areaCode,
    }),
  });

  if (!phoneRes.ok) {
    const err = await phoneRes.text();
    throw new Error(`Vapi phone number creation failed: ${err}`);
  }

  const phone = await phoneRes.json();

  return {
    phoneNumber: phone.number,
    assistantId: assistant.id,
    phoneNumberId: phone.id,
  };
}

interface CallOptions {
  phoneNumberId: string;
  to: string;
  assistantId: string;
}

export async function makeCall(opts: CallOptions) {
  const res = await fetch(`${VAPI_BASE}/call`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      phoneNumberId: opts.phoneNumberId,
      assistantId: opts.assistantId,
      customer: { number: opts.to },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Vapi call failed: ${err}`);
  }

  return res.json();
}

export async function getPhoneNumber(phoneNumberId: string) {
  const res = await fetch(`${VAPI_BASE}/phone-number/${phoneNumberId}`, {
    headers: headers(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Vapi status check failed: ${err}`);
  }

  return res.json();
}
