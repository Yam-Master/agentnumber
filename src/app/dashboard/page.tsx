import Link from "next/link";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { CallActivityChart } from "./call-activity-chart";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const service = createServiceClient();

  const { data: member } = await service
    .from("org_members")
    .select("org_id")
    .eq("user_id", user!.id)
    .single();

  const orgId = member?.org_id;

  // Fetch all data in parallel
  const [numbersRes, balanceRes, keysRes, inboundRes, outboundRes, recentCallsRes, callActivityRes] = await Promise.all([
    orgId
      ? service.from("numbers").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("status", "active")
      : Promise.resolve({ count: 0 }),
    orgId
      ? service.from("credits_balance").select("balance_cents").eq("org_id", orgId).single()
      : Promise.resolve({ data: null }),
    orgId
      ? service.from("api_keys").select("id", { count: "exact", head: true }).eq("org_id", orgId).is("revoked_at", null)
      : Promise.resolve({ count: 0 }),
    orgId
      ? service.from("calls").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("direction", "inbound")
      : Promise.resolve({ count: 0 }),
    orgId
      ? service.from("calls").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("direction", "outbound")
      : Promise.resolve({ count: 0 }),
    orgId
      ? service.from("calls").select("id, direction, customer_number, status, duration, created_at, cost_cents").eq("org_id", orgId).order("created_at", { ascending: false }).limit(10)
      : Promise.resolve({ data: [] }),
    orgId
      ? service.from("calls").select("created_at").eq("org_id", orgId).gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()).order("created_at", { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  const activeNumbers = numbersRes.count ?? 0;
  const balance = (balanceRes as { data: { balance_cents: number } | null }).data?.balance_cents ?? 0;
  const activeKeys = keysRes.count ?? 0;
  const inboundCount = inboundRes.count ?? 0;
  const outboundCount = outboundRes.count ?? 0;
  const recentCalls = (recentCallsRes.data as CallRow[]) || [];

  // Build hourly activity data for chart
  const callDates = ((callActivityRes.data as { created_at: string }[]) || []).map(c => c.created_at);
  const activityData = buildHourlyActivity(callDates);

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm text-muted">Dashboard &rsaquo; <span className="text-foreground">Overview</span></p>
      </div>

      {/* Call Activity */}
      <div className="rounded-xl border border-border bg-zinc-900/50 p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-sm font-bold tracking-wider uppercase">Call Activity</h2>
            <p className="text-xs text-muted mt-1">1-hour call volume for the last 7 days</p>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-xs text-muted px-3 py-1 rounded border border-border">7 days</span>
            <div className="flex items-center gap-5">
              <div className="text-center">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                  <span className="text-xs text-muted">Outbound</span>
                </div>
                <p className="text-xl font-bold mt-0.5">{outboundCount}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-xs text-muted">Inbound</span>
                </div>
                <p className="text-xl font-bold mt-0.5">{inboundCount}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-xs text-muted">Failed</span>
                </div>
                <p className="text-xl font-bold mt-0.5">0</p>
              </div>
            </div>
          </div>
        </div>
        <CallActivityChart data={activityData} />
      </div>

      {/* Bottom section: Recent Calls + Resources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Calls */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-zinc-900/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold tracking-wider uppercase">Recent Calls</h2>
              <p className="text-xs text-muted mt-1">Latest calls across all numbers</p>
            </div>
            <Link href="/dashboard/calls" className="text-xs text-muted hover:text-foreground transition-colors">
              VIEW ALL &rarr;
            </Link>
          </div>

          {recentCalls.length === 0 ? (
            <p className="text-sm text-muted py-8 text-center">No calls yet</p>
          ) : (
            <div className="space-y-0">
              {recentCalls.map((call) => (
                <div key={call.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                      call.direction === "inbound"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-blue-500/20 text-blue-400"
                    }`}>
                      {call.direction === "inbound" ? "IN" : "OUT"}
                    </span>
                    <span className="text-sm font-mono">{call.customer_number || "Unknown"}</span>
                    <span className="text-xs text-muted">{formatDuration(call.duration)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {call.cost_cents != null && (
                      <span className="text-xs text-muted">${(call.cost_cents / 100).toFixed(2)}</span>
                    )}
                    <span className="text-xs text-muted">{formatRelativeTime(call.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resources */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-zinc-900/50 p-5">
            <h3 className="text-sm font-bold tracking-wider uppercase mb-4">Resources</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-muted text-xs">#</span>
                  <span className="text-sm">Numbers</span>
                </div>
                <span className="text-sm font-bold">{activeNumbers}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-muted text-xs">K</span>
                  <span className="text-sm">API Keys</span>
                </div>
                <span className="text-sm font-bold">{activeKeys}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-zinc-900/50 p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted">Credit Balance</span>
            </div>
            <p className="text-3xl font-bold text-accent">${(balance / 100).toFixed(2)}</p>
            <Link href="/dashboard/credits" className="text-xs text-muted hover:text-foreground transition-colors mt-2 block">
              Manage credits &rarr;
            </Link>
          </div>

          <div className="rounded-xl border border-border bg-zinc-900/50 p-5">
            <h3 className="text-sm font-bold tracking-wider uppercase mb-3">Getting Started</h3>
            <div className="space-y-2">
              <CheckItem done={activeKeys > 0} label="Create an API key" href="/dashboard/api-keys" />
              <CheckItem done={balance > 0} label="Add credits" href="/dashboard/credits" />
              <CheckItem done={activeNumbers > 0} label="Provision a number" />
              <CheckItem done={inboundCount + outboundCount > 0} label="Make a call" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CallRow {
  id: string;
  direction: string;
  customer_number: string | null;
  status: string | null;
  duration: number | null;
  created_at: string;
  cost_cents: number | null;
}

function CheckItem({ done, label, href }: { done: boolean; label: string; href?: string }) {
  const content = (
    <div className="flex items-center gap-2">
      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
        done ? "border-accent bg-accent/20" : "border-border"
      }`}>
        {done && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2.5 5L4.5 7L7.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent" /></svg>}
      </div>
      <span className={`text-xs ${done ? "text-muted line-through" : "text-foreground"}`}>{label}</span>
    </div>
  );

  if (href && !done) {
    return <Link href={href} className="block hover:opacity-80 transition-opacity">{content}</Link>;
  }
  return content;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "--";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function buildHourlyActivity(timestamps: string[]): { label: string; count: number }[] {
  const now = Date.now();
  const bucketCount = 42; // ~7 days in 4-hour buckets
  const bucketSize = 4 * 60 * 60 * 1000;
  const start = now - bucketCount * bucketSize;

  const buckets: { label: string; count: number }[] = [];
  for (let i = 0; i < bucketCount; i++) {
    const t = new Date(start + i * bucketSize);
    const label = t.toLocaleDateString("en-US", { weekday: "short" }) + ", " +
      t.toLocaleTimeString("en-US", { hour: "numeric", minute: undefined });
    buckets.push({ label, count: 0 });
  }

  for (const ts of timestamps) {
    const t = new Date(ts).getTime();
    const idx = Math.floor((t - start) / bucketSize);
    if (idx >= 0 && idx < bucketCount) {
      buckets[idx].count++;
    }
  }

  return buckets;
}
