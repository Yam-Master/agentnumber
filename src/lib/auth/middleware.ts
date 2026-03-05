import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { hashApiKey } from "./api-key";
import type { ApiContext } from "./types";

export async function authenticateApiKey(
  request: NextRequest
): Promise<ApiContext | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const key = authHeader.slice(7);
  if (!key.startsWith("an_live_")) {
    return null;
  }

  const keyHash = hashApiKey(key);
  const supabase = createServiceClient();

  const { data } = await supabase
    .from("api_keys")
    .select("id, org_id")
    .eq("key_hash", keyHash)
    .is("revoked_at", null)
    .single();

  if (!data) {
    return null;
  }

  return { orgId: data.org_id, apiKeyId: data.id };
}
