import { createClient, createServiceClient } from "@/lib/supabase/server";

export default async function NumbersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const service = createServiceClient();

  const { data: member } = await service
    .from("org_members")
    .select("org_id")
    .eq("user_id", user!.id)
    .single();

  const { data: numbers } = member?.org_id
    ? await service
        .from("numbers")
        .select("id, phone_number, voice_id, webhook_url, inbound_mode, status, created_at")
        .eq("org_id", member.org_id)
        .neq("status", "released")
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm text-muted">Dashboard &rsaquo; <span className="text-foreground">Numbers</span></p>
      </div>

      <div className="rounded-xl border border-border bg-zinc-900/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold tracking-wider uppercase">Phone Numbers</h2>
          <span className="text-xs text-muted">Provision via API: POST /api/v0/numbers</span>
        </div>

        {!numbers?.length ? (
          <p className="text-sm text-muted py-8 text-center">No numbers provisioned yet</p>
        ) : (
          <div className="space-y-0">
            {numbers.map((n) => (
              <div key={n.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div className="flex items-center gap-4">
                  <span className="font-mono text-sm font-medium">{n.phone_number}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    n.status === "active"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-zinc-500/20 text-zinc-400"
                  }`}>{n.status}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted">
                  <span>{n.inbound_mode}</span>
                  <span className="font-mono truncate max-w-48">{n.webhook_url}</span>
                  <span>{new Date(n.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
