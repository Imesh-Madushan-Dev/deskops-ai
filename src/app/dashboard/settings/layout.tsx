"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PageHeaderBar, PageTitle } from "@/components/dashboard/PageHeader";

const tabs = [
  { href: "/dashboard/settings", label: "Profile" },
  { href: "/dashboard/settings/team", label: "Team" },
  { href: "/dashboard/settings/integrations", label: "Integrations" },
  { href: "/dashboard/settings/models", label: "AI models" },
];

export default function SettingsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();

  return (
    <>
      <PageHeaderBar title="Settings" />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-8 sm:py-10">
        <PageTitle eyebrow="Workspace" title="Settings" description="Manage your business profile, team, connections, and AI model preferences." />
        <nav className="mt-8 flex gap-1 rounded-lg border border-border/70 bg-muted/40 p-1 text-sm">
          {tabs.map((tab) => {
            const active = tab.href === "/dashboard/settings" ? pathname === tab.href : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex-1 rounded-md px-3 py-1.5 text-center transition-colors",
                  active ? "bg-background font-medium text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-6">{children}</div>
      </main>
    </>
  );
}
