import { NextRequest, NextResponse } from "next/server";
import { vapi } from "@/lib/vapi";
import { createServiceClient } from "@/lib/supabase/server";

const personalityPrompts: Record<string, string> = {
  friendly:
    "You are a warm, friendly AI assistant from AgentNumber. You're calling to demonstrate how AI phone agents work. Be helpful, upbeat, and conversational. Keep responses concise — this is a phone call, not an essay. Ask the caller what they'd like to talk about or if they have any questions about AI phone agents.",
  comedian:
    "You are a sarcastic, witty comedian AI from AgentNumber. You're calling to demonstrate AI phone agents — but you can't help being a bit snarky and funny about everything. Throw in dry humor, mild roasts, and clever observations. Keep it light and entertaining. Don't be mean — just playfully sarcastic.",
  sales:
    "You are an enthusiastic (but not pushy) sales representative AI from AgentNumber. You're calling to demonstrate the power of AI phone agents. Be professional, articulate, and highlight how businesses could use AI phone agents for sales, support, and automation. Use persuasive language but keep it conversational.",
  techsupport:
    "You are a patient, knowledgeable tech support AI from AgentNumber. You're calling to demonstrate AI phone agents. Be calm, clear, and methodical. If the caller mentions any tech issues (real or hypothetical), walk them through troubleshooting steps. Otherwise, explain how AI phone agents can handle tech support.",
};

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, personality } = await request.json();

    if (!phoneNumber || typeof phoneNumber !== "string") {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    // Normalize phone number — strip everything except digits and leading +
    const cleaned = phoneNumber.replace(/[^\d+]/g, "");
    const normalized = cleaned.startsWith("+") ? cleaned : `+1${cleaned}`;

    if (normalized.length < 10) {
      return NextResponse.json(
        { error: "Please enter a valid phone number" },
        { status: 400 }
      );
    }

    const prompt =
      personalityPrompts[personality] || personalityPrompts.friendly;

    // Rate limit: 1 demo call per phone number per day
    const supabase = createServiceClient();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from("demo_calls")
      .select("id")
      .eq("phone_number", normalized)
      .gte("created_at", oneDayAgo)
      .limit(1);

    if (recent && recent.length > 0) {
      return NextResponse.json(
        { error: "You've already received a demo call today. Try again tomorrow!" },
        { status: 429 }
      );
    }

    // Create the call via Vapi (single call, not batch)
    const call = await vapi.calls.create({
      assistant: {
        model: {
          provider: "anthropic",
          model: "claude-sonnet-4-20250514",
          messages: [{ role: "system", content: prompt }],
        },
        voice: {
          provider: "11labs",
          voiceId: "cgSgspJ2msm6clMCkdW9",
        },
        firstMessage:
          "Hey! This is an AI agent from AgentNumber. Pretty cool, right? I'm here to show you what AI phone agents can do. What would you like to talk about?",
        maxDurationSeconds: 120,
      },
      phoneNumberId: process.env.VAPI_DEMO_PHONE_NUMBER_ID!,
      customer: { number: normalized },
    });

    // Log the demo call
    await supabase.from("demo_calls").insert({
      phone_number: normalized,
      personality: personality || "friendly",
    });

    const callId = "id" in call ? call.id : undefined;
    return NextResponse.json({ success: true, callId });
  } catch (error) {
    console.error("Demo call error:", error);
    return NextResponse.json(
      { error: "Failed to initiate call. Please try again." },
      { status: 500 }
    );
  }
}
