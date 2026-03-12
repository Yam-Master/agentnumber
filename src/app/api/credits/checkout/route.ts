import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
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
    return NextResponse.json({ error: "No organization found" }, { status: 400 });
  }

  const body = await request.json();
  const dollars = Number(body.amount);

  if (!Number.isInteger(dollars) || dollars < 5 || dollars > 500) {
    return NextResponse.json(
      { error: "Amount must be a whole number between $5 and $500" },
      { status: 400 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.agentsnumber.com";

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: dollars * 100,
          product_data: {
            name: `$${dollars} AgentNumber Credit`,
            description: `Top up $${dollars} in credits`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      org_id: member.org_id,
    },
    success_url: `${baseUrl}/dashboard/credits?topped_up=true`,
    cancel_url: `${baseUrl}/dashboard/credits`,
  });

  return NextResponse.json({ checkout_url: session.url });
}
