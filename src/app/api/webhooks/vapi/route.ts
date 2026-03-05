import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json({ success: true });
    }

    const type = message.type;

    // Handle end-of-call report
    if (type === "end-of-call-report") {
      const supabase = createServiceClient();

      const callId = message.call?.id;
      if (!callId) {
        return NextResponse.json({ success: true });
      }

      // Find call in our DB
      const { data: existingCall } = await supabase
        .from("calls")
        .select("id")
        .eq("vapi_call_id", callId)
        .single();

      const callData = {
        vapi_call_id: callId,
        status: message.endedReason || "completed",
        duration: message.durationSeconds ? Math.round(message.durationSeconds) : null,
        transcript: message.transcript || null,
        summary: message.summary || null,
        recording_url: message.recordingUrl || null,
        ended_reason: message.endedReason || null,
        customer_number: message.call?.customer?.number || null,
        direction: message.call?.type === "inboundPhoneCall" ? "inbound" : "outbound",
      };

      if (existingCall) {
        // Update existing call
        await supabase
          .from("calls")
          .update(callData)
          .eq("id", existingCall.id);
      } else {
        // Try to find agent by assistant ID
        const assistantId =
          message.call?.assistantId || message.assistant?.id;

        if (assistantId) {
          const { data: agent } = await supabase
            .from("agents")
            .select("id")
            .eq("vapi_assistant_id", assistantId)
            .single();

          if (agent) {
            await supabase.from("calls").insert({
              ...callData,
              agent_id: agent.id,
            });
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ success: true }); // Always return 200 to Vapi
  }
}
