import { HTTPFacilitatorClient } from "@x402/core/server";
import { x402ResourceServer } from "@x402/next";
import { ExactEvmScheme } from "@x402/evm/exact/server";

// Wallet address to receive USDC payments
export const PAY_TO = process.env.X402_WALLET_ADDRESS!;

// Network: Base Sepolia (testnet) or Base Mainnet
const isMainnet = process.env.X402_NETWORK === "base";
export const NETWORK = isMainnet ? "eip155:8453" : "eip155:84532";

// Facilitator: testnet uses x402.org (no auth), mainnet uses CDP
const facilitatorUrl = isMainnet
  ? "https://api.cdp.coinbase.com/platform/v2/x402"
  : "https://x402.org/facilitator";

const facilitatorClient = new HTTPFacilitatorClient({
  url: facilitatorUrl,
});

export const resourceServer = new x402ResourceServer(facilitatorClient)
  .register(NETWORK, new ExactEvmScheme());
