import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.agentsnumber.com";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const next = searchParams.get("next") || "/onboarding";
  return NextResponse.redirect(`${baseUrl}${next}`);
}
