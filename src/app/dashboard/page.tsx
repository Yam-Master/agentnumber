import Link from "next/link";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const service = createServiceClient();

  // Get org
  const { data: member } = await service
    .from("org_members")
    .select("org_id")
    .eq("user_id", user!.id)
    .single();

  const orgId = member?.org_id;

  // Fetch stats
  const [numbersRes, callsRes, balanceRes, keysRes] = await Promise.all([
    orgId
      ? service.from("numbers").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("status", "active")
      : Promise.resolve({ count: 0 }),
    orgId
      ? service.from("calls").select("id", { count: "exact", head: true }).eq("org_id", orgId)
      : Promise.resolve({ count: 0 }),
    orgId
      ? service.from("credits_balance").select("balance_cents").eq("org_id", orgId).single()
      : Promise.resolve({ data: null }),
    orgId
      ? service.from("api_keys").select("id", { count: "exact", head: true }).eq("org_id", orgId).is("revoked_at", null)
      : Promise.resolve({ count: 0 }),
  ]);

  const activeNumbers = numbersRes.count ?? 0;
  const totalCalls = callsRes.count ?? 0;
  const balance = (balanceRes as { data: { balance_cents: number } | null }).data?.balance_cents ?? 0;
  const activeKeys = keysRes.count ?? 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted text-sm mt-1">
          Give your agent a phone number. API-first, framework-agnostic.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="rounded-xl border border-border bg-zinc-900/50 p-5">
          <p className="text-sm text-muted">Active Numbers</p>
          <p className="text-3xl font-bold mt-1">{activeNumbers}</p>
        </div>
        <div className="rounded-xl border border-border bg-zinc-900/50 p-5">
          <p className="text-sm text-muted">Total Calls</p>
          <p className="text-3xl font-bold mt-1">{totalCalls}</p>
        </div>
        <div className="rounded-xl border border-border bg-zinc-900/50 p-5">
          <p className="text-sm text-muted">Credit Balance</p>
          <p className="text-3xl font-bold mt-1">${(balance / 100).toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-border bg-zinc-900/50 p-5">
          <p className="text-sm text-muted">API Keys</p>
          <p className="text-3xl font-bold mt-1">{activeKeys}</p>
        </div>
      </div>

      {/* Quick start */}
      <div className="rounded-xl border border-border bg-zinc-900/50 p-6 mb-6">
        <h2 className="font-semibold text-lg mb-4">Quick Start</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <span className="text-muted font-mono shrink-0">1.</span>
            <div>
              <Link href="/dashboard/api-keys" className="text-accent-light hover:underline font-medium">
                Create an API key
              </Link>
              <span className="text-muted"> to authenticate your requests</span>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-muted font-mono shrink-0">2.</span>
            <div>
              <Link href="/dashboard/credits" className="text-accent-light hover:underline font-medium">
                Add credits
              </Link>
              <span className="text-muted"> to your account ($5 per number)</span>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-muted font-mono shrink-0">3.</span>
            <span className="text-muted">Provision a number via the API:</span>
          </div>
        </div>

        <div className="mt-4 bg-black/50 rounded-lg p-4 font-mono text-sm overflow-x-auto">
          <pre className="text-green-400">{`curl -X POST https://agentnumber.com/api/v0/numbers \\
  -H "Authorization: Bearer an_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "webhook_url": "https://your-agent.com/voice",
    "voice_id": "cgSgspJ2msm6clMCkdW9"
  }'`}</pre>
        </div>
        <p className="text-xs text-muted mt-3">
          Your webhook receives OpenAI-compatible chat completion requests from Vapi (STT → your agent → TTS).
        </p>
      </div>

      {/* API reference links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-zinc-900/50 p-5">
          <h3 className="font-semibold mb-1">Numbers API</h3>
          <p className="text-sm text-muted">Provision and manage phone numbers for your agents.</p>
          <code className="text-xs text-muted font-mono mt-2 block">/api/v0/numbers</code>
        </div>
        <div className="rounded-xl border border-border bg-zinc-900/50 p-5">
          <h3 className="font-semibold mb-1">Calls API</h3>
          <p className="text-sm text-muted">Initiate outbound calls and view call history.</p>
          <code className="text-xs text-muted font-mono mt-2 block">/api/v0/calls</code>
        </div>
        <div className="rounded-xl border border-border bg-zinc-900/50 p-5">
          <h3 className="font-semibold mb-1">Webhooks API</h3>
          <p className="text-sm text-muted">Receive real-time events for calls and transcripts.</p>
          <code className="text-xs text-muted font-mono mt-2 block">/api/v0/webhooks</code>
        </div>
      </div>
    </div>
  );
}
