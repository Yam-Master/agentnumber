import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SidebarNav } from "./sidebar-nav";

const DEV_MOCK = process.env.ENABLE_DEV_MOCK === "true";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (DEV_MOCK) {
    return (
      <div className="min-h-screen bg-background flex">
        <SidebarNav email="dev@agentnumber.com" />
        <main className="flex-1 ml-56 p-8">{children}</main>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background flex">
      <SidebarNav email={user.email || ""} />
      <main className="flex-1 ml-56 p-8">{children}</main>
    </div>
  );
}
