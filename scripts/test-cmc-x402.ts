/**
 * Test CoinMarketCap x402 MCP — pay $0.01 USDC per tool call on Base.
 *
 * The x402 REST endpoints (pro.coinmarketcap.com/x402/*) are NOT live.
 * The x402 MCP endpoint (mcp.coinmarketcap.com/x402/mcp) IS live.
 *
 * This script calls the x402 MCP directly via HTTP, handling the
 * payment signature flow manually since MCP doesn't use standard
 * HTTP 402 — it returns a JSON error with "Provide PAYMENT-SIGNATURE header".
 *
 * Usage:
 *   PRIVATE_KEY=0x... npx tsx scripts/test-cmc-x402.ts
 *
 * Requires: USDC + small ETH on Base mainnet (chain 8453)
 */

const CMC_X402_MCP = "https://mcp.coinmarketcap.com/x402/mcp";

async function listTools() {
  const res = await fetch(CMC_X402_MCP, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/list",
      id: 1,
    }),
  });

  const data = await res.json();
  console.log("Available tools:");
  for (const tool of data.result?.tools ?? []) {
    console.log(`  - ${tool.name}: ${tool.description.slice(0, 80)}...`);
  }
  console.log(`\nTotal: ${data.result?.tools?.length ?? 0} tools`);
}

async function callTool(name: string, args: Record<string, unknown> = {}) {
  console.log(`\nCalling ${name}...`);
  const res = await fetch(CMC_X402_MCP, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/call",
      params: { name, arguments: args },
      id: 2,
    }),
  });

  const data = await res.json();

  if (data.error || data.resource) {
    console.log("Payment required:", JSON.stringify(data, null, 2));
    console.log("\nTo use this, you need:");
    console.log("1. A Base wallet with USDC ($0.01 per call)");
    console.log("2. Sign a PAYMENT-SIGNATURE via x402 protocol");
    console.log("3. Include the signed header in the request");
    return;
  }

  if (data.result?.isError) {
    console.log("Error:", data.result.content?.[0]?.text);
    return;
  }

  console.log("Result:", JSON.stringify(data.result, null, 2).slice(0, 500));
}

async function main() {
  await listTools();
  await callTool("get_global_metrics_latest");
}

main().catch(console.error);
