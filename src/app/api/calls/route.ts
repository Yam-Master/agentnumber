import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { vapi } from "@/lib/vapi";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { agentId, phoneNumber } = await request.json();

    if (!agentId || !phoneNumber) {
      return NextResponse.json(
        { error: "Agent ID and phone number are required" },
        { status: 400 }
      );
    }

    // Get agent
    const { data: agent } = await supabase
      .from("agents")
      .select("*")
      .eq("id", agentId)
      .eq("user_id", user.id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Normalize phone number
    const cleaned = phoneNumber.replace(/[^\d+]/g, "");
    const normalized = cleaned.startsWith("+") ? cleaned : `+1${cleaned}`;

    // Determine which phone number to use for the outbound call
    const phoneNumberId =
      agent.vapi_phone_number_id || process.env.VAPI_DEMO_PHONE_NUMBER_ID!;

    // Create outbound call
    const call = await vapi.calls.create({
      assistantId: agent.vapi_assistant_id,
      phoneNumberId,
      customer: { number: normalized },
    });

    // Save call record
    const callId = "id" in call ? call.id : undefined;
    if (callId) {
      await supabase.from("calls").insert({
        agent_id: agentId,
        vapi_call_id: callId,
        direction: "outbound",
        customer_number: normalized,
        status: "initiated",
      });
    }

    return NextResponse.json({ success: true, callId });
  } catch (error) {
    console.error("Create call error:", error);
    return NextResponse.json(
      { error: "Failed to initiate call" },
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

    // Get all calls for user's agents
    const { data: agents } = await supabase
      .from("agents")
      .select("id")
      .eq("user_id", user.id);

    if (!agents || agents.length === 0) {
      return NextResponse.json({ calls: [] });
    }

    const agentIds = agents.map((a: { id: string }) => a.id);

    const { data: calls, error } = await supabase
      .from("calls")
      .select("*, agents(name)")
      .in("agent_id", agentIds)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ calls });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch calls" },
      { status: 500 }
    );
  }
}
