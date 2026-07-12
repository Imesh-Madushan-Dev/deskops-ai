"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AiBrain01Icon,
  BubbleChatIcon,
  ChartLineData01Icon,
  CheckmarkCircle02Icon,
  InvoiceIcon,
  Logout01Icon,
  PackageIcon,
  Settings02Icon,
  UserGroupIcon,
  WhatsappIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useDashboardOverview } from "@/lib/query/dashboard";
import { CopilotPanel } from "@/components/copilot/CopilotPanel";

function useAuthUser() {
  return useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data } = await createClient().auth.getUser();
      if (!data.user) return null;
      const name = typeof data.user.user_metadata.full_name === "string" ? data.user.user_metadata.full_name : "";
      return { email: data.user.email ?? "", name };
    },
    staleTime: Infinity,
  });
}

function ProfileCard() {
  const { data: user } = useAuthUser();
  const initial = (user?.name || user?.email || "?").charAt(0).toUpperCase();

  async function signOut() {
    await createClient().auth.signOut();
    window.location.assign("/login");
  }

  return (
    <div className="mt-3 flex items-center gap-3 rounded-xl border border-border/70 bg-background/75 p-3 shadow-sm">
      <span className="btn-purple flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold">{initial}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user?.name || "Account"}</p>
        <p className="truncate text-xs text-muted-foreground">{user?.email ?? "Loading…"}</p>
      </div>
      <button
        type="button"
        onClick={signOut}
        title="Sign out"
        aria-label="Sign out"
        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <HugeiconsIcon icon={Logout01Icon} size={16} strokeWidth={1.8} />
      </button>
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: overview } = useDashboardOverview();
  const [copilotOpen, setCopilotOpen] = useState(false);

  // Read persisted state after mount so server and first client render agree.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is unavailable during SSR; syncing after mount is the hydration-safe pattern
    setCopilotOpen(localStorage.getItem("copilot-open") === "true");
  }, []);

  function toggleCopilot(next: boolean) {
    setCopilotOpen(next);
    localStorage.setItem("copilot-open", String(next));
  }

  const navigation = [
    { href: "/dashboard", label: "Overview", icon: ChartLineData01Icon },
    { href: "/dashboard/inbox", label: "Inbox", icon: WhatsappIcon, count: overview?.conversations },
    { href: "/dashboard/products", label: "Products", icon: PackageIcon },
    { href: "/dashboard/inventory", label: "Inventory", icon: PackageIcon },
    { href: "/dashboard/invoices", label: "Invoices", icon: InvoiceIcon },
    { href: "/dashboard/customers", label: "Customers", icon: UserGroupIcon },
    { href: "/dashboard/books", label: "Books", icon: ChartLineData01Icon },
    { href: "/dashboard/approvals", label: "Approvals", icon: CheckmarkCircle02Icon, count: overview?.approvals },
    { href: "/dashboard/settings", label: "Settings", icon: Settings02Icon },
  ];

  return (
    <div className="min-h-svh bg-muted/30 text-foreground">
      <aside className="dashboard-sidebar fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-border/70 p-4 lg:flex lg:flex-col">
        <Link href="/dashboard" className="relative flex items-center gap-2.5 px-2 py-3">
          <span className="btn-purple flex size-9 items-center justify-center rounded-xl"><HugeiconsIcon icon={AiBrain01Icon} size={19} /></span>
          <span className="text-sm font-semibold tracking-wide">Deskops <span className="text-primary">AI</span></span>
        </Link>
        <p className="mt-9 px-3 font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">Workspace</p>
        <nav className="mt-3 space-y-1">
          {navigation.map((item) => {
            const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  active ? "bg-primary/10 font-medium text-primary shadow-[inset_0_0_0_1px_rgba(110,67,220,0.12)]" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <HugeiconsIcon icon={item.icon} size={18} strokeWidth={1.8} />
                {item.label}
                {typeof item.count === "number" && item.count > 0 && (
                  <span className="ml-auto flex items-center">
                    <span className="t-badge" data-open="true">
                      <span className={cn("t-badge-dot rounded-md px-1.5 py-0.5 font-mono text-[10px]", active ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
                        {item.count}
                      </span>
                    </span>
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto">
          <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/75 px-3 py-2.5 text-xs font-medium shadow-sm">
            <span className={cn("size-2 shrink-0 rounded-full", overview?.business.whatsappConnected ? "bg-[#34d399]" : "bg-muted-foreground/40")} />
            <span className="truncate">{overview?.business.whatsappConnected ? "WhatsApp connected" : "WhatsApp not connected"}</span>
            <span className="ml-auto truncate text-muted-foreground">{overview?.business.name}</span>
          </div>
          <ProfileCard />
        </div>
      </aside>
      <div className={cn("lg:pl-64 transition-[padding] duration-200", copilotOpen && "xl:pr-112")}>{children}</div>
      <CopilotPanel open={copilotOpen} onClose={() => toggleCopilot(false)} />
      {!copilotOpen && (
        <button
          type="button"
          onClick={() => toggleCopilot(true)}
          aria-label="Open copilot"
          className="btn-purple fixed right-5 bottom-5 z-30 flex size-12 items-center justify-center rounded-full border-0 shadow-lg transition-transform hover:scale-105"
        >
          <HugeiconsIcon icon={BubbleChatIcon} size={20} />
        </button>
      )}
    </div>
  );
}
