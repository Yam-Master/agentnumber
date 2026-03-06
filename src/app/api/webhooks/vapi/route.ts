import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { debitCredits } from "@/lib/credits/operations";
import { deliverWebhooks } from "@/lib/webhooks/deliver";
import { toPublicId } from "@/lib/api/ids";

const OUTBOUND_COST_PER_MIN = 5; // $0.05/min in cents
const INBOUND_COST_PER_MIN = 3; // $0.03/min in cents

export async function POST(request: NextRequest) {
  try {
    // Validate Vapi webhook secret
    const webhookSecret = process.env.VAPI_WEBHOOK_SECRET;
    if (webhookSecret) {
      const headerSecret = request.headers.get("x-vapi-secret");
      if (headerSecret !== webhookSecret) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

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
        .select("id, org_id, number_id")
        .eq("vapi_call_id", callId)
        .single();

      const direction = message.call?.type === "inboundPhoneCall" ? "inbound" : "outbound";
      const durationSeconds = message.durationSeconds ? Math.round(message.durationSeconds) : null;

      const callData = {
        vapi_call_id: callId,
        status: message.endedReason || "completed",
        duration: durationSeconds,
        transcript: message.transcript || null,
        summary: message.summary || null,
        recording_url: message.recordingUrl || null,
        ended_reason: message.endedReason || null,
        customer_number: message.call?.customer?.number || null,
        direction,
      };

      if (existingCall) {
        // Calculate cost
        let costCents = 0;
        if (durationSeconds && durationSeconds > 0) {
          const minutes = Math.ceil(durationSeconds / 60);
          const ratePerMin = direction === "outbound" ? OUTBOUND_COST_PER_MIN : INBOUND_COST_PER_MIN;
          costCents = minutes * ratePerMin;
        }

        // Update existing call with cost
        await supabase
          .from("calls")
          .update({ ...callData, cost_cents: costCents })
          .eq("id", existingCall.id);

        // Debit credits for call duration
        if (costCents > 0 && existingCall.org_id) {
          await debitCredits(
            existingCall.org_id,
            costCents,
            `Call ${direction}: ${durationSeconds}s`,
            existingCall.id,
            "call"
          );
        }

        // Forward events to customer webhooks
        if (existingCall.org_id) {
          const eventData = {
            call_id: toPublicId("call", existingCall.id),
            direction,
            duration: durationSeconds,
            cost_cents: costCents,
            status: callData.status,
            ended_reason: callData.ended_reason,
            customer_number: callData.customer_number,
          };

          await deliverWebhooks(existingCall.org_id, "call.ended", eventData);

          if (message.transcript) {
            await deliverWebhooks(existingCall.org_id, "call.transcript.ready", {
              call_id: toPublicId("call", existingCall.id),
            });
          }

          if (message.recordingUrl) {
            await deliverWebhooks(existingCall.org_id, "call.recording.ready", {
              call_id: toPublicId("call", existingCall.id),
            });
          }
        }
      } else {
        // Try to find agent by assistant ID (legacy flow)
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
