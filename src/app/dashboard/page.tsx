import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CallModal } from "./call-modal";

interface Agent {
  id: string;
  name: string;
  phone_number: string | null;
  system_prompt: string;
  first_message: string | null;
  voice_id: string;
  vapi_assistant_id: string;
  created_at: string;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: agents } = await supabase
    .from("agents")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Your Agents</h1>
        <Link
          href="/dashboard/create"
          className="bg-accent hover:bg-accent-light text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Create Agent
        </Link>
      </div>

      {!agents || agents.length === 0 ? (
        <div className="rounded-2xl border border-border bg-zinc-900/50 p-12 text-center">
          <p className="text-muted mb-4">
            You haven&apos;t created any agents yet.
          </p>
          <Link
            href="/dashboard/create"
            className="inline-block bg-accent hover:bg-accent-light text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            Create your first agent
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {(agents as Agent[]).map((agent) => (
            <div
              key={agent.id}
              className="rounded-xl border border-border bg-zinc-900/50 p-6"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{agent.name}</h3>
                  {agent.phone_number && (
                    <p className="text-accent-light text-sm font-mono mt-1">
                      {agent.phone_number}
                    </p>
                  )}
                  <p className="text-muted text-sm mt-2 line-clamp-2">
                    {agent.system_prompt}
                  </p>
                </div>
                <div className="flex gap-2">
                  <CallModal
                    agentId={agent.id}
                    agentName={agent.name}
                  />
                  <form action={`/api/agents?id=${agent.id}`} method="POST">
                    <button
                      type="button"
                      onClick={async () => {
                        if (
                          confirm(
                            `Delete agent "${agent.name}"? This cannot be undone.`
                          )
                        ) {
                          await fetch(`/api/agents?id=${agent.id}`, {
                            method: "DELETE",
                          });
                          window.location.reload();
                        }
                      }}
                      className="text-sm text-red-400 hover:text-red-300 px-3 py-1.5 border border-red-400/30 rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
