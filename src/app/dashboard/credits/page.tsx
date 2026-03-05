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

export default function CreditsPage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return <div className="text-muted text-sm">Loading credits...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Credits</h1>
        <p className="text-sm text-muted mt-1">
          Your credit balance and transaction history.
        </p>
      </div>

      {/* Balance card */}
      <div className="border border-border rounded-lg p-6">
        <p className="text-sm text-muted">Current Balance</p>
        <p className="text-4xl font-bold mt-1">
          ${balance !== null ? (balance / 100).toFixed(2) : "—"}
        </p>
        <p className="text-sm text-muted mt-1">
          {balance !== null ? `${balance} credits` : ""}
        </p>
      </div>

      {/* Transaction history */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="font-semibold">Transaction History</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background/50">
              <th className="text-left px-4 py-3 font-medium text-muted">Date</th>
              <th className="text-left px-4 py-3 font-medium text-muted">Description</th>
              <th className="text-right px-4 py-3 font-medium text-muted">Amount</th>
              <th className="text-right px-4 py-3 font-medium text-muted">Balance</th>
            </tr>
          </thead>
          <tbody>
            {ledger.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted">
                  No transactions yet.
                </td>
              </tr>
            ) : (
              ledger.map((entry) => (
                <tr key={entry.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-muted">
                    {new Date(entry.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">{entry.description}</td>
                  <td className={`px-4 py-3 text-right font-mono ${
                    entry.type === "deposit" ? "text-green-400" : "text-red-400"
                  }`}>
                    {entry.type === "deposit" ? "+" : "-"}${(entry.amount_cents / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-muted">
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
