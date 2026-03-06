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
    return <div className="text-muted text-xs uppercase tracking-widest">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs text-muted uppercase tracking-widest mb-2">Dashboard // Credits</p>
        <h1 className="text-xl font-bold uppercase tracking-wider">Credits</h1>
      </div>

      <div className="border-3 border-border p-6">
        <span className="text-[10px] text-muted uppercase tracking-widest">Current Balance</span>
        <p className="text-4xl font-bold text-accent mt-1">
          ${balance !== null ? (balance / 100).toFixed(2) : "---"}
        </p>
        <p className="text-xs text-muted mt-1 uppercase tracking-wider">
          {balance !== null ? `${balance} cents` : ""}
        </p>
      </div>

      <div className="border-3 border-border overflow-hidden">
        <div className="px-4 py-3 border-b-3 border-border">
          <h2 className="text-xs font-bold uppercase tracking-widest">Transaction History</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-[10px] font-bold text-muted uppercase tracking-widest">Date</th>
              <th className="text-left px-4 py-3 text-[10px] font-bold text-muted uppercase tracking-widest">Description</th>
              <th className="text-right px-4 py-3 text-[10px] font-bold text-muted uppercase tracking-widest">Amount</th>
              <th className="text-right px-4 py-3 text-[10px] font-bold text-muted uppercase tracking-widest">Balance</th>
            </tr>
          </thead>
          <tbody>
            {ledger.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted text-xs uppercase tracking-widest">
                  No transactions yet
                </td>
              </tr>
            ) : (
              ledger.map((entry) => (
                <tr key={entry.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-muted text-xs">{new Date(entry.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">{entry.description}</td>
                  <td className={`px-4 py-3 text-right font-bold ${
                    entry.type === "deposit" ? "text-foreground" : "text-accent"
                  }`}>
                    {entry.type === "deposit" ? "+" : "-"}${(entry.amount_cents / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-muted">
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
