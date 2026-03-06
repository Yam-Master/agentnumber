import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { vapi } from "@/lib/vapi";

const DEV_MOCK = process.env.NODE_ENV === "development";

export async function POST(request: NextRequest) {
  const { name, systemPrompt, firstMessage, voiceId, areaCode } = await request.json();

  if (DEV_MOCK) {
    const area = areaCode || "941";
    return NextResponse.json({
      agent: { id: "mock-agent-id", name: name || "My Agent" },
      phoneNumber: `+1 (${area}) 555-0${Math.floor(100 + Math.random() * 900)}`,
    });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!name || !systemPrompt) {
      return NextResponse.json(
        { error: "Name and system prompt are required" },
        { status: 400 }
      );
    }

    // 1. Create Vapi assistant
    const assistant = await vapi.assistants.create({
      name,
      model: {
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        messages: [{ role: "system", content: systemPrompt }],
      },
      voice: {
        provider: "11labs",
        voiceId: voiceId || "cgSgspJ2msm6clMCkdW9",
      },
      firstMessage: firstMessage || undefined,
    });

    // 2. Provision phone number
    let phoneNumberId: string | undefined;
    let phoneNumberStr: string | undefined;

    try {
      const phoneNumber = await vapi.phoneNumbers.create({
        provider: "vapi",
        numberDesiredAreaCode: "415",
        assistantId: assistant.id,
      });
      phoneNumberId = phoneNumber.id;
      phoneNumberStr = (phoneNumber as unknown as Record<string, unknown>).number as string | undefined;
    } catch (err) {
      console.error("Failed to provision phone number:", err);
      // Agent still works for outbound, just no inbound number
    }

    // 3. Save to DB
    const { data, error } = await supabase.from("agents").insert({
      user_id: user.id,
      name,
      system_prompt: systemPrompt,
      first_message: firstMessage || null,
      voice_id: voiceId || "cgSgspJ2msm6clMCkdW9",
      vapi_assistant_id: assistant.id,
      vapi_phone_number_id: phoneNumberId || null,
      phone_number: phoneNumberStr || null,
    }).select().single();

    if (error) {
      console.error("DB insert error:", error);
      return NextResponse.json(
        { error: "Failed to save agent" },
        { status: 500 }
      );
    }

    return NextResponse.json({ agent: data });
  } catch (error) {
    console.error("Create agent error:", error);
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: agents, error } = await supabase
      .from("agents")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ agents });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch agents" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Agent ID is required" },
        { status: 400 }
      );
    }

    // Get agent to clean up Vapi resources
    const { data: agent } = await supabase
      .from("agents")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Delete from Vapi
    try {
      if (agent.vapi_phone_number_id) {
        await vapi.phoneNumbers.delete({ id: agent.vapi_phone_number_id });
      }
      await vapi.assistants.delete({ id: agent.vapi_assistant_id });
    } catch (err) {
      console.error("Vapi cleanup error:", err);
    }

    // Delete from DB
    await supabase.from("agents").delete().eq("id", id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete agent" },
      { status: 500 }
    );
  }
}
