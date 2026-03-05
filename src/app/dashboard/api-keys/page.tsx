"use client";

import { useState, useEffect, useCallback } from "react";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  key?: string; // Only present on creation
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
    return (
      <div className="text-muted text-sm">Loading API keys...</div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
        <p className="text-sm text-muted mt-1">
          Manage API keys for programmatic access to AgentNumber.
        </p>
      </div>

      {/* Create new key */}
      <div className="border border-border rounded-lg p-6 space-y-4">
        <h2 className="font-semibold">Create API Key</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key name (optional)"
            className="flex-1 bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-foreground"
          />
          <button
            onClick={createKey}
            className="bg-foreground text-background px-4 py-2 rounded text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Create Key
          </button>
        </div>

        {createdKey && (
          <div className="bg-green-950/30 border border-green-800 rounded-lg p-4 space-y-2">
            <p className="text-sm text-green-400 font-medium">
              API key created! Copy it now — it won&apos;t be shown again.
            </p>
            <code className="block text-sm bg-background/50 rounded px-3 py-2 font-mono break-all">
              {createdKey}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(createdKey);
                setCreatedKey(null);
              }}
              className="text-sm text-green-400 hover:text-green-300 underline"
            >
              Copy & Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Key list */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background/50">
              <th className="text-left px-4 py-3 font-medium text-muted">Name</th>
              <th className="text-left px-4 py-3 font-medium text-muted">Key</th>
              <th className="text-left px-4 py-3 font-medium text-muted">Created</th>
              <th className="text-left px-4 py-3 font-medium text-muted">Status</th>
              <th className="text-right px-4 py-3 font-medium text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  No API keys yet. Create one above.
                </td>
              </tr>
            ) : (
              keys.map((k) => (
                <tr key={k.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">{k.name}</td>
                  <td className="px-4 py-3 font-mono text-muted">
                    {k.key_prefix}...
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(k.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {k.revoked_at ? (
                      <span className="text-red-400">Revoked</span>
                    ) : (
                      <span className="text-green-400">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!k.revoked_at && (
                      <button
                        onClick={() => revokeKey(k.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
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
