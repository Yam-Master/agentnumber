import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/auth/with-api-auth";
import { apiSuccess, apiError } from "@/lib/api/response";
import { getStripe } from "@/lib/stripe";
import type { ApiContext } from "@/lib/auth/types";

// Credit packs: amount in cents → price in dollars
const PACKS: Record<number, number> = {
  500: 5,    // $5 → 500 credits
  1000: 10,  // $10 → 1000 credits
  5000: 50,  // $50 → 5000 credits
};

export const POST = withApiAuth(async (request: NextRequest, ctx: ApiContext) => {
  const body = await request.json();
  const { credits = 1000, success_url, cancel_url } = body;

  const priceDollars = PACKS[credits];
  if (!priceDollars) {
    return apiError(
      `Invalid credit amount. Choose from: ${Object.keys(PACKS).join(", ")}`,
      "validation_error",
      400
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.agentsnumber.com";

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: priceDollars * 100,
          product_data: {
            name: `${credits} AgentNumber Credits`,
            description: `Top up ${credits} credits ($${priceDollars}.00)`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      org_id: ctx.orgId,
      credits: String(credits),
    },
    success_url: success_url || `${baseUrl}/dashboard/credits?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancel_url || `${baseUrl}/dashboard/credits`,
  });

  return apiSuccess({ checkout_url: session.url });
});
