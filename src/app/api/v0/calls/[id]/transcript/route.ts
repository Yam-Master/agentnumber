import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/auth/with-api-auth";
import { apiSuccess, apiError } from "@/lib/api/response";
import { fromPublicId } from "@/lib/api/ids";
import { createServiceClient } from "@/lib/supabase/server";
import type { ApiContext } from "@/lib/auth/types";

export const GET = withApiAuth(async (_request: NextRequest, ctx: ApiContext & { params?: Record<string, string> }) => {
  const uuid = fromPublicId(ctx.params!.id);
  const supabase = createServiceClient();

  const { data: call } = await supabase
    .from("calls")
    .select("id, transcript")
    .eq("id", uuid)
    .eq("org_id", ctx.orgId)
    .single();

  if (!call) {
    return apiError("Call not found", "not_found", 404);
  }

  if (!call.transcript) {
    return apiError("Transcript not yet available", "not_ready", 404);
  }

  // Parse transcript into segments if it's structured, otherwise return raw
  const segments = parseTranscript(call.transcript);

  return apiSuccess({ segments });
});

function parseTranscript(raw: string): { role: string; content: string }[] {
  // Vapi transcripts come as "AI: ...\nUser: ..." lines
  const lines = raw.split("\n").filter(Boolean);
  return lines.map((line) => {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0 && colonIdx < 20) {
      const role = line.slice(0, colonIdx).trim().toLowerCase();
      const content = line.slice(colonIdx + 1).trim();
      return { role: role === "ai" ? "assistant" : role, content };
    }
    return { role: "unknown", content: line };
  });
}
