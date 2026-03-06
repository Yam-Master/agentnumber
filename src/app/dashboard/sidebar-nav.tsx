"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "./logout-button";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/calls", label: "Calls" },
  { href: "/dashboard/numbers", label: "Numbers" },
  { href: "/dashboard/webhooks", label: "Webhooks" },
  { href: "/dashboard/api-keys", label: "API Keys" },
  { href: "/dashboard/credits", label: "Credits" },
];

export function SidebarNav({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-56 bg-black border-r-3 border-accent flex flex-col">
      <div className="px-5 py-4 border-b-3 border-border">
        <Link href="/dashboard" className="text-sm font-bold tracking-widest uppercase text-foreground">
          AGENT<span className="text-accent">[NUMBER]</span>
        </Link>
      </div>

      <nav className="flex-1 py-2">
        {navItems.map((item) => {
          const active = item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-5 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors border-l-3 ${
                active
                  ? "border-accent text-accent bg-accent/5"
                  : "border-transparent text-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t-3 border-border space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border-2 border-accent text-accent text-xs font-bold flex items-center justify-center uppercase">
            {email[0]}
          </div>
          <span className="text-xs text-foreground truncate uppercase tracking-wider">{email}</span>
        </div>
        <LogoutButton />
      </div>
    </aside>
  );
}
