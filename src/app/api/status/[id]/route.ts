import { NextRequest, NextResponse } from "next/server";
import { getPhoneNumber } from "@/lib/vapi";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getPhoneNumber(id);
    return NextResponse.json({
      id: result.id,
      number: result.number,
      status: result.status ?? "active",
      assistantId: result.assistantId,
      createdAt: result.createdAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Status check failed";
    const isConfig = message.includes("not configured");
    return NextResponse.json(
      { error: isConfig ? "Service temporarily unavailable" : "Phone number not found or unavailable" },
      { status: isConfig ? 503 : 404 }
    );
  }
}
