import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { generateApiKey } from "@/lib/auth/api-key";

const DEV_MOCK = process.env.ENABLE_DEV_MOCK === "true";

async function getOrgId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const service = createServiceClient();
  const { data: member } = await service
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .single();

  return member?.org_id ?? null;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name = "Default" } = body;

  if (DEV_MOCK) {
    return NextResponse.json({
      id: "mock-key-id",
      name,
      key_prefix: "an_live_mock",
      created_at: new Date().toISOString(),
      key: "an_live_mock_k7x9f2m4p8q1w3r6t0y5",
    }, { status: 201 });
  }

  const orgId = await getOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { key, prefix, hash } = generateApiKey();
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      org_id: orgId,
      name,
      key_prefix: prefix,
      key_hash: hash,
      permissions: ["*"],
    })
    .select("id, name, key_prefix, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create API key" }, { status: 500 });
  }

  // Return full key only on creation
  return NextResponse.json({ ...data, key }, { status: 201 });
}

export async function GET() {
  if (DEV_MOCK) {
    return NextResponse.json({ data: [] });
  }

  const orgId = await getOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: keys, error } = await supabase
    .from("api_keys")
    .select("id, name, key_prefix, permissions, revoked_at, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch API keys" }, { status: 500 });
  }

  return NextResponse.json({ data: keys });
}

export async function DELETE(request: NextRequest) {
  const orgId = await getOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const keyId = searchParams.get("id");
  if (!keyId) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId)
    .eq("org_id", orgId);

  if (error) {
    return NextResponse.json({ error: "Failed to revoke API key" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
