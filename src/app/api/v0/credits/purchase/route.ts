import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "@x402/next";
import { resourceServer, PAY_TO, NETWORK } from "@/lib/x402/config";
import { authenticateApiKey } from "@/lib/auth/middleware";
import { depositCredits } from "@/lib/credits/operations";

// $1 = 1 credit = 100 cents. x402 pays $10 USDC = $10 credit = 1000 cents
const CREDIT_AMOUNT_CENTS = 1000;
const PRICE_USDC = "$10.00";

const handler = async (request: NextRequest): Promise<NextResponse> => {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json(
      { error: { message: "Invalid API key", code: "unauthorized" } },
      { status: 401 }
    );
  }

  const newBalance = await depositCredits(
    auth.orgId,
    CREDIT_AMOUNT_CENTS,
    `x402 USDC purchase: ${PRICE_USDC}`
  );

  return NextResponse.json({
    success: true,
    data: {
      deposited: "$10.00",
      balance: `$${(newBalance / 100).toFixed(2)}`,
    },
  });
};

export const POST = withX402(
  handler,
  {
    accepts: [
      {
        scheme: "exact",
        price: PRICE_USDC,
        network: NETWORK,
        payTo: PAY_TO,
      },
    ],
    description: "Purchase $10 in AgentNumber credits with USDC",
    mimeType: "application/json",
  },
  resourceServer,
);
