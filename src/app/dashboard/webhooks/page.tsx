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
        <p className="text-xs text-foreground uppercase tracking-widest mb-2">Dashboard // Webhooks</p>
        <h1 className="text-xl font-bold uppercase tracking-wider">Webhooks</h1>
      </div>

      <div className="border-3 border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold tracking-widest uppercase">Configured Webhooks</h2>
          <span className="text-xs text-foreground uppercase tracking-widest">POST /api/v0/webhooks</span>
        </div>

        {!webhooks?.length ? (
          <p className="text-xs text-foreground py-8 text-center uppercase tracking-widest">No webhooks configured yet</p>
        ) : (
          <div>
            {webhooks.map((w) => (
              <div key={w.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 ${w.active ? "bg-accent" : "bg-foreground/30"}`} />
                  <span className="text-sm font-bold">{w.url}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {(w.events as string[]).map((e) => (
                      <span key={e} className="text-xs px-1.5 py-0.5 border border-border text-foreground uppercase">{e}</span>
                    ))}
                  </div>
                  <span className="text-xs text-foreground uppercase tracking-wider">{new Date(w.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
