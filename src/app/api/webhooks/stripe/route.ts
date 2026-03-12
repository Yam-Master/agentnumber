import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { depositCredits } from "@/lib/credits/operations";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const orgId = session.metadata?.org_id;
    const amountCents = session.amount_total || 0;

    if (orgId && amountCents > 0 && session.payment_status === "paid") {
      const dollars = amountCents / 100;
      await depositCredits(
        orgId,
        amountCents,
        `Stripe top-up: $${dollars.toFixed(2)}`
      );
      console.log(`Stripe: deposited $${dollars.toFixed(2)} (${amountCents}¢) to org ${orgId}`);
    }
  }

  return NextResponse.json({ received: true });
}
