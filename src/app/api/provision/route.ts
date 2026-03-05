import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "@x402/next";
import { provisionNumber } from "@/lib/vapi";
import { provisionRouteConfig, resourceServer } from "@/lib/x402";

async function handler(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json().catch(() => ({}));

    const result = await provisionNumber({
      areaCode: body.areaCode,
      systemPrompt: body.systemPrompt,
      voiceId: body.voiceId,
      model: body.model,
      name: body.name,
      firstMessage: body.firstMessage,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Provision failed";
    const isConfig = message.includes("not configured");
    return NextResponse.json(
      { error: isConfig ? "Service not configured" : "Failed to provision phone number" },
      { status: isConfig ? 503 : 500 }
    );
  }
}

export const POST = withX402(handler, provisionRouteConfig, resourceServer);
