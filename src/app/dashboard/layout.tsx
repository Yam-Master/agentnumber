import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { LogoutButton } from "./logout-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      <nav className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-lg font-bold tracking-tight">
              AgentNumber
            </Link>
            <div className="flex gap-6 text-sm">
              <Link
                href="/dashboard"
                className="text-muted hover:text-foreground transition-colors"
              >
                Overview
              </Link>
              <Link
                href="/dashboard/calls"
                className="text-muted hover:text-foreground transition-colors"
              >
                Calls
              </Link>
              <Link
                href="/dashboard/api-keys"
                className="text-muted hover:text-foreground transition-colors"
              >
                API Keys
              </Link>
              <Link
                href="/dashboard/credits"
                className="text-muted hover:text-foreground transition-colors"
              >
                Credits
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted">{user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
