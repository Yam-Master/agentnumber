"use client";

import { useState, useEffect, useCallback } from "react";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  key?: string;
  permissions: string[];
  revoked_at: string | null;
  created_at: string;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchKeys = useCallback(async () => {
    const res = await fetch("/api/api-keys");
    const json = await res.json();
    setKeys(json.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const createKey = async () => {
    const res = await fetch("/api/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newKeyName || "Default" }),
    });
    const json = await res.json();
    if (json.key) {
      setCreatedKey(json.key);
      setNewKeyName("");
      fetchKeys();
    }
  };

  const revokeKey = async (id: string) => {
    await fetch(`/api/api-keys?id=${id}`, { method: "DELETE" });
    fetchKeys();
  };

  if (loading) {
    return <div className="text-muted text-xs uppercase tracking-widest">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs text-muted uppercase tracking-widest mb-2">Dashboard // API Keys</p>
        <h1 className="text-xl font-bold uppercase tracking-wider">API Keys</h1>
      </div>

      <div className="border-3 border-border p-6 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest">Create Key</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="KEY NAME (OPTIONAL)"
            className="flex-1 bg-transparent border-3 border-border px-3 py-2 text-sm focus:outline-none focus:border-accent placeholder:text-muted uppercase tracking-wider"
          />
          <button
            onClick={createKey}
            className="bg-accent text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-accent-dim transition-colors"
          >
            Create
          </button>
        </div>

        {createdKey && (
          <div className="border-3 border-accent p-4 space-y-2">
            <p className="text-xs text-accent font-bold uppercase tracking-widest">
              Key created — copy now, shown once only
            </p>
            <code className="block text-sm bg-black border-3 border-border px-3 py-2 break-all">
              {createdKey}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(createdKey);
                setCreatedKey(null);
              }}
              className="text-xs text-accent hover:underline uppercase tracking-widest font-bold"
            >
              Copy &amp; Dismiss
            </button>
          </div>
        )}
      </div>

      <div className="border-3 border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-3 border-border">
              <th className="text-left px-4 py-3 text-[10px] font-bold text-muted uppercase tracking-widest">Name</th>
              <th className="text-left px-4 py-3 text-[10px] font-bold text-muted uppercase tracking-widest">Key</th>
              <th className="text-left px-4 py-3 text-[10px] font-bold text-muted uppercase tracking-widest">Created</th>
              <th className="text-left px-4 py-3 text-[10px] font-bold text-muted uppercase tracking-widest">Status</th>
              <th className="text-right px-4 py-3 text-[10px] font-bold text-muted uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted text-xs uppercase tracking-widest">
                  No keys yet
                </td>
              </tr>
            ) : (
              keys.map((k) => (
                <tr key={k.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-bold">{k.name}</td>
                  <td className="px-4 py-3 text-muted">{k.key_prefix}...</td>
                  <td className="px-4 py-3 text-muted">{new Date(k.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {k.revoked_at ? (
                      <span className="text-muted uppercase text-xs">Revoked</span>
                    ) : (
                      <span className="text-accent uppercase text-xs font-bold">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!k.revoked_at && (
                      <button onClick={() => revokeKey(k.id)} className="text-accent hover:underline text-xs uppercase tracking-widest font-bold">
                        Revoke
                      </button>
                    )}
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
