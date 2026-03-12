"use client";

import { useState, useEffect, useCallback } from "react";

interface LedgerEntry {
  id: string;
  type: string;
  amount_cents: number;
  description: string;
  balance_after_cents: number;
  created_at: string;
}

const QUICK_AMOUNTS = [10, 25, 50, 100];

export default function CreditsPage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpError, setTopUpError] = useState("");

  const fetchData = useCallback(async () => {
    const [balanceRes, ledgerRes] = await Promise.all([
      fetch("/api/credits/balance"),
      fetch("/api/credits/ledger"),
    ]);

    if (balanceRes.ok) {
      const json = await balanceRes.json();
      setBalance(json.balance_cents);
    }

    if (ledgerRes.ok) {
      const json = await ledgerRes.json();
      setLedger(json.data || []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTopUp = async (amount: number) => {
    setTopUpLoading(true);
    setTopUpError("");

    try {
      const res = await fetch("/api/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      const json = await res.json();
      if (!res.ok) {
        setTopUpError(json.error || "Failed to create checkout");
        return;
      }

      window.location.href = json.checkout_url;
    } catch {
      setTopUpError("Something went wrong");
    } finally {
      setTopUpLoading(false);
    }
  };

  if (loading) {
    return <div className="text-foreground text-xs uppercase tracking-widest">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs text-foreground uppercase tracking-widest mb-2">Dashboard // Credits</p>
        <h1 className="text-xl font-bold uppercase tracking-wider">Credits</h1>
      </div>

      <div className="border-3 border-border p-6">
        <span className="text-xs text-foreground uppercase tracking-widest">Current Balance</span>
        <p className="text-4xl font-bold text-accent mt-1">
          ${balance !== null ? (balance / 100).toFixed(2) : "---"}
        </p>
      </div>

      {/* Top Up */}
      <div className="border-3 border-border p-6 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest">Top Up Credits</h2>
        <p className="text-xs text-foreground uppercase tracking-wider">$1 = $1 credit</p>

        <div className="flex gap-3 flex-wrap">
          {QUICK_AMOUNTS.map((amt) => (
            <button
              key={amt}
              onClick={() => handleTopUp(amt)}
              disabled={topUpLoading}
              className="px-5 py-2 border-2 border-border text-xs font-bold uppercase tracking-widest hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
            >
              ${amt}
            </button>
          ))}
        </div>

        <div className="flex gap-3 items-center">
          <span className="text-xs text-foreground uppercase tracking-widest">Custom:</span>
          <div className="flex items-center border-2 border-border">
            <span className="px-2 text-xs text-foreground">$</span>
            <input
              type="number"
              min="5"
              max="500"
              value={topUpAmount}
              onChange={(e) => setTopUpAmount(e.target.value)}
              placeholder="5-500"
              className="w-24 bg-transparent px-2 py-2 text-sm outline-none"
            />
          </div>
          <button
            onClick={() => {
              const amt = parseInt(topUpAmount);
              if (amt >= 5 && amt <= 500) handleTopUp(amt);
              else setTopUpError("Enter an amount between $5 and $500");
            }}
            disabled={topUpLoading}
            className="px-5 py-2 bg-accent text-background text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {topUpLoading ? "Loading..." : "Top Up"}
          </button>
        </div>

        {topUpError && (
          <p className="text-accent text-xs uppercase tracking-widest">{topUpError}</p>
        )}
      </div>

      {/* Transaction History */}
      <div className="border-3 border-border overflow-hidden">
        <div className="px-4 py-3 border-b-3 border-border">
          <h2 className="text-xs font-bold uppercase tracking-widest">Transaction History</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-bold text-foreground uppercase tracking-widest">Date</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-foreground uppercase tracking-widest">Description</th>
              <th className="text-right px-4 py-3 text-xs font-bold text-foreground uppercase tracking-widest">Amount</th>
              <th className="text-right px-4 py-3 text-xs font-bold text-foreground uppercase tracking-widest">Balance</th>
            </tr>
          </thead>
          <tbody>
            {ledger.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-foreground text-xs uppercase tracking-widest">
                  No transactions yet
                </td>
              </tr>
            ) : (
              ledger.map((entry) => (
                <tr key={entry.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-foreground text-xs">{new Date(entry.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">{entry.description}</td>
                  <td className={`px-4 py-3 text-right font-bold ${
                    entry.type === "deposit" ? "text-foreground" : "text-accent"
                  }`}>
                    {entry.type === "deposit" ? "+" : "-"}${(entry.amount_cents / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-foreground">
                    ${(entry.balance_after_cents / 100).toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
