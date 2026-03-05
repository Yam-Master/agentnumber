import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "@x402/next";
import { makeCall } from "@/lib/vapi";
import { callRouteConfig, resourceServer } from "@/lib/x402";

async function handler(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();

    if (!body.phoneNumberId || !body.to || !body.assistantId) {
      return NextResponse.json(
        { error: "Missing required fields: phoneNumberId, to, assistantId" },
        { status: 400 }
      );
    }

    const result = await makeCall({
      phoneNumberId: body.phoneNumberId,
      to: body.to,
      assistantId: body.assistantId,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Call failed";
    const isConfig = message.includes("not configured");
    return NextResponse.json(
      { error: isConfig ? "Service not configured" : "Failed to initiate call" },
      { status: isConfig ? 503 : 500 }
    );
  }
}

export const POST = withX402(handler, callRouteConfig, resourceServer);
