"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import {
  AiBrain01Icon,
  ArrowDataTransferHorizontalIcon,
  ChartLineData01Icon,
  CheckmarkCircle02Icon,
  Home01Icon,
  InvoiceIcon,
  Logout01Icon,
  PackageIcon,
  PieChartIcon,
  Search01Icon,
  Settings02Icon,
  UserGroupIcon,
  WhatsappIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Kbd } from "@/components/ui/kbd";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useDashboardOverview } from "@/lib/query/dashboard";
import { useRealtimeSync } from "@/lib/query/realtime";
import { COPILOT_FOCUS_EVENT, CopilotDock } from "@/components/copilot/CopilotDock";
import { CommandPalette } from "@/components/dashboard/CommandPalette";
import { ShellContext, StatusPill } from "@/components/dashboard/ui";

type NavItem = { href: string; label: string; icon: IconSvgElement; count?: number };
type NavGroup = { label: string; items: NavItem[] };

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
    <div className="mt-3 flex items-center gap-3 rounded-xl border border-border/70 bg-background/75 p-2.5 shadow-sm">
      <span className="btn-purple flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold">{initial}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium">{user?.name || "Account"}</p>
        <p className="truncate text-[11px] text-muted-foreground">{user?.email ?? "Loading…"}</p>
      </div>
      <button
        type="button"
        onClick={signOut}
        title="Sign out"
        aria-label="Sign out"
        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <HugeiconsIcon icon={Logout01Icon} size={15} strokeWidth={1.8} />
      </button>
    </div>
  );
}

function NavContent({ groups, pathname, onNavigate, onOpenPalette }: { groups: NavGroup[]; pathname: string; onNavigate?: () => void; onOpenPalette: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-2.5 px-2 py-1.5">
        <span className="btn-purple flex size-9 items-center justify-center rounded-xl"><HugeiconsIcon icon={AiBrain01Icon} size={19} /></span>
        <span className="text-sm font-semibold tracking-wide">Deskops <span className="text-primary">AI</span></span>
      </Link>

      <button
        type="button"
        onClick={onOpenPalette}
        className="mt-5 flex h-9 items-center gap-2 rounded-lg border border-border/70 bg-background/60 px-3 text-[13px] text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
      >
        <HugeiconsIcon icon={Search01Icon} size={14} /> Search…
        <Kbd className="ml-auto">⌘K</Kbd>
      </button>

      <nav className="mt-4 flex-1 space-y-5 overflow-y-auto pb-4">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="px-3 font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">{group.label}</p>
            <div className="mt-1.5 space-y-0.5">
              {group.items.map((item) => {
                const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors",
                      active ? "bg-primary/10 font-medium text-primary shadow-[inset_0_0_0_1px_rgba(110,67,220,0.12)]" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <HugeiconsIcon icon={item.icon} size={17} strokeWidth={1.8} />
                    {item.label}
                    {typeof item.count === "number" && item.count > 0 && (
                      <span className="ml-auto flex items-center">
                        <span className="t-badge" data-open="true">
                          <span className={cn("t-badge-dot rounded-md px-1.5 py-0.5 font-mono text-[10px]", active ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>{item.count}</span>
                        </span>
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: overview } = useDashboardOverview();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  useRealtimeSync();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const groups: NavGroup[] = [
    {
      label: "Operate",
      items: [
        { href: "/dashboard", label: "Overview", icon: Home01Icon },
        { href: "/dashboard/inbox", label: "Inbox", icon: WhatsappIcon, count: overview?.conversations },
        { href: "/dashboard/approvals", label: "Approvals", icon: CheckmarkCircle02Icon, count: overview?.approvals },
      ],
    },
    {
      label: "Sell",
      items: [
        { href: "/dashboard/invoices", label: "Invoices", icon: InvoiceIcon },
        { href: "/dashboard/customers", label: "Customers", icon: UserGroupIcon },
      ],
    },
    {
      label: "Stock",
      items: [
        { href: "/dashboard/products", label: "Products", icon: PackageIcon },
        { href: "/dashboard/inventory", label: "Inventory", icon: ArrowDataTransferHorizontalIcon, count: overview?.lowStock },
      ],
    },
    {
      label: "Intelligence",
      items: [
        { href: "/dashboard/books", label: "Books", icon: ChartLineData01Icon },
        { href: "/dashboard/books/reports", label: "Reports", icon: PieChartIcon },
        { href: "/dashboard/settings", label: "Settings", icon: Settings02Icon },
      ],
    },
  ];

  const shellApi = useMemo(() => ({ openNav: () => setNavOpen(true), openPalette: () => setPaletteOpen(true) }), []);
  const autopilot = overview?.business.autoApproveReplies || overview?.business.autoApproveInvoices;

  return (
    <ShellContext.Provider value={shellApi}>
      <div className="min-h-svh bg-muted/30 text-foreground">
        <aside className="dashboard-sidebar fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-border/70 p-4 lg:flex lg:flex-col">
          <NavContent groups={groups} pathname={pathname} onOpenPalette={shellApi.openPalette} />
          <div className="mt-auto">
            <div className="flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-background/75 px-3 py-2.5 shadow-sm">
              <span className="flex min-w-0 items-center gap-2 text-xs font-medium">
                <span className={cn("size-2 shrink-0 rounded-full", overview?.business.whatsappConnected ? "bg-[#34d399]" : "bg-muted-foreground/40")} />
                <span className="truncate">{overview?.business.whatsappConnected ? "WhatsApp live" : "WhatsApp offline"}</span>
              </span>
              <StatusPill tone={autopilot ? "brand" : "neutral"} dot={false} className="shrink-0">{autopilot ? "Autopilot" : "Manual"}</StatusPill>
            </div>
            <ProfileCard />
          </div>
        </aside>

        <Sheet open={navOpen} onOpenChange={setNavOpen}>
          <SheetContent side="left" className="dashboard-sidebar w-72 p-4">
            <SheetHeader className="sr-only"><SheetTitle>Navigation</SheetTitle></SheetHeader>
            <NavContent groups={groups} pathname={pathname} onNavigate={() => setNavOpen(false)} onOpenPalette={() => { setNavOpen(false); shellApi.openPalette(); }} />
            <ProfileCard />
          </SheetContent>
        </Sheet>

        {/* Bottom padding clears the docked copilot bar so nothing hides behind it. */}
        <div className="pb-28 lg:pl-64">{children}</div>

        <CommandPalette
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          onOpenCopilot={() => window.dispatchEvent(new Event(COPILOT_FOCUS_EVENT))}
        />
        <CopilotDock />
      </div>
    </ShellContext.Provider>
  );
}
