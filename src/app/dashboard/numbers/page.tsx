import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const DEV_MOCK = process.env.ENABLE_DEV_MOCK === "true";

export default async function NumbersPage() {
  if (DEV_MOCK) {
    return (
      <div>
        <div className="mb-6">
          <p className="text-xs text-foreground uppercase tracking-widest mb-2">Dashboard // Numbers</p>
          <h1 className="text-xl font-bold uppercase tracking-wider">Phone Numbers</h1>
        </div>
        <div className="border-3 border-border p-6">
          <p className="text-xs text-foreground py-8 text-center uppercase tracking-widest">No numbers provisioned yet</p>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const service = createServiceClient();

  const { data: member } = await service
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
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
        <p className="text-xs text-foreground uppercase tracking-widest mb-2">Dashboard // Numbers</p>
        <h1 className="text-xl font-bold uppercase tracking-wider">Phone Numbers</h1>
      </div>

      <div className="border-3 border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold tracking-widest uppercase">Active Numbers</h2>
          <span className="text-xs text-foreground uppercase tracking-widest">POST /api/v0/numbers</span>
        </div>

        {!numbers?.length ? (
          <p className="text-xs text-foreground py-8 text-center uppercase tracking-widest">No numbers provisioned yet</p>
        ) : (
          <div>
            {numbers.map((n) => (
              <div key={n.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold">{n.phone_number}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 border-2 uppercase tracking-wider ${
                    n.status === "active"
                      ? "border-accent text-accent"
                      : "border-foreground/30 text-foreground"
                  }`}>{n.status}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-foreground uppercase tracking-wider">
                  <span>{n.inbound_mode}</span>
                  <span className="truncate max-w-48">{n.webhook_url}</span>
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
