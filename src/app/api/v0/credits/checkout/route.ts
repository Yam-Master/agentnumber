import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/auth/with-api-auth";
import { apiSuccess, apiError } from "@/lib/api/response";
import { getStripe } from "@/lib/stripe";
import type { ApiContext } from "@/lib/auth/types";

const MIN_AMOUNT = 5;
const MAX_AMOUNT = 500;

export const POST = withApiAuth(async (request: NextRequest, ctx: ApiContext) => {
  const body = await request.json();
  const { amount, success_url, cancel_url } = body;

  const dollars = Number(amount);
  if (!Number.isInteger(dollars) || dollars < MIN_AMOUNT || dollars > MAX_AMOUNT) {
    return apiError(
      `Amount must be a whole number between $${MIN_AMOUNT} and $${MAX_AMOUNT}.`,
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
      org_id: ctx.orgId,
    },
    success_url: success_url || `${baseUrl}/dashboard/credits?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancel_url || `${baseUrl}/dashboard/credits`,
  });

  return apiSuccess({ checkout_url: session.url });
});
