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

  const callDates = ((callActivityRes.data as { created_at: string }[]) || []).map(c => c.created_at);
  const activityData = buildHourlyActivity(callDates);

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs text-muted uppercase tracking-widest">
          Dashboard // <span className="text-foreground">Overview</span>
        </p>
      </div>

      {/* Call Activity */}
      <div className="border-3 border-border p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xs font-bold tracking-widest uppercase">Call Activity</h2>
            <p className="text-[10px] text-muted mt-1 uppercase tracking-wider">1-hour volume // last 7 days</p>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-[10px] text-muted px-3 py-1 border-3 border-border uppercase tracking-widest">7 Days</span>
            <div className="flex items-center gap-5">
              <div className="text-center">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-accent" />
                  <span className="text-[10px] text-muted uppercase">Out</span>
                </div>
                <p className="text-xl font-bold mt-0.5">{outboundCount}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-foreground" />
                  <span className="text-[10px] text-muted uppercase">In</span>
                </div>
                <p className="text-xl font-bold mt-0.5">{inboundCount}</p>
              </div>
            </div>
          </div>
        </div>
        <CallActivityChart data={activityData} />
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Calls */}
        <div className="lg:col-span-2 border-3 border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xs font-bold tracking-widest uppercase">Recent Calls</h2>
              <p className="text-[10px] text-muted mt-1 uppercase tracking-wider">Latest calls across all numbers</p>
            </div>
            <Link href="/dashboard/calls" className="text-[10px] text-muted hover:text-accent transition-colors uppercase tracking-widest">
              View All &rarr;
            </Link>
          </div>

          {recentCalls.length === 0 ? (
            <p className="text-sm text-muted py-8 text-center uppercase tracking-wider">No calls yet</p>
          ) : (
            <div>
              {recentCalls.map((call) => (
                <div key={call.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 border-2 uppercase tracking-wider ${
                      call.direction === "inbound"
                        ? "border-foreground text-foreground"
                        : "border-accent text-accent"
                    }`}>
                      {call.direction === "inbound" ? "IN" : "OUT"}
                    </span>
                    <span className="text-sm font-bold">{call.customer_number || "Unknown"}</span>
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
          <div className="border-3 border-border p-5">
            <h3 className="text-[10px] font-bold tracking-widest uppercase mb-4">Resources</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider"># Numbers</span>
                <span className="text-sm font-bold text-accent">{activeNumbers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider">K API Keys</span>
                <span className="text-sm font-bold text-accent">{activeKeys}</span>
              </div>
            </div>
          </div>

          <div className="border-3 border-border p-5">
            <span className="text-[10px] text-muted uppercase tracking-widest">Credit Balance</span>
            <p className="text-3xl font-bold text-accent mt-1">${(balance / 100).toFixed(2)}</p>
            <Link href="/dashboard/credits" className="text-[10px] text-muted hover:text-accent transition-colors mt-2 block uppercase tracking-widest">
              Manage &rarr;
            </Link>
          </div>

          <div className="border-3 border-border p-5">
            <h3 className="text-[10px] font-bold tracking-widest uppercase mb-3">Getting Started</h3>
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
      <div className={`w-3 h-3 border-2 flex items-center justify-center ${
        done ? "border-accent bg-accent" : "border-border"
      }`}>
        {done && <span className="text-white text-[8px] font-bold">&check;</span>}
      </div>
      <span className={`text-[10px] uppercase tracking-wider ${done ? "text-muted line-through" : "text-foreground"}`}>{label}</span>
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
  const bucketCount = 42;
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
