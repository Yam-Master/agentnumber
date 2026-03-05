import { createClient, createServiceClient } from "@/lib/supabase/server";

export default async function WebhooksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const service = createServiceClient();

  const { data: member } = await service
    .from("org_members")
    .select("org_id")
    .eq("user_id", user!.id)
    .single();

  const { data: webhooks } = member?.org_id
    ? await service
        .from("webhooks")
        .select("id, url, events, active, created_at")
        .eq("org_id", member.org_id)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm text-muted">Dashboard &rsaquo; <span className="text-foreground">Webhooks</span></p>
      </div>

      <div className="rounded-xl border border-border bg-zinc-900/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold tracking-wider uppercase">Webhooks</h2>
          <span className="text-xs text-muted">Manage via API: POST /api/v0/webhooks</span>
        </div>

        {!webhooks?.length ? (
          <p className="text-sm text-muted py-8 text-center">No webhooks configured yet</p>
        ) : (
          <div className="space-y-0">
            {webhooks.map((w) => (
              <div key={w.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${w.active ? "bg-green-400" : "bg-zinc-500"}`} />
                  <span className="text-sm font-mono">{w.url}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {(w.events as string[]).map((e) => (
                      <span key={e} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-muted">{e}</span>
                    ))}
                  </div>
                  <span className="text-xs text-muted">{new Date(w.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
