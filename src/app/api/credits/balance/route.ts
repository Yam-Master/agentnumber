import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const DEV_MOCK = process.env.NODE_ENV === "development";

export async function GET() {
  if (DEV_MOCK) {
    return NextResponse.json({ balance_cents: 0 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();
  const { data: member } = await service
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .single();

  if (!member) {
    return NextResponse.json({ balance_cents: 0 });
  }

  const { data: balance } = await service
    .from("credits_balance")
    .select("balance_cents")
    .eq("org_id", member.org_id)
    .single();

  return NextResponse.json({ balance_cents: balance?.balance_cents ?? 0 });
}
