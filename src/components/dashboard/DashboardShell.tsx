"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AiBrain01Icon,
  ChartLineData01Icon,
  CheckmarkCircle02Icon,
  InvoiceIcon,
  PackageIcon,
  UserGroupIcon,
  WhatsappIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { useDashboardOverview } from "@/lib/query/dashboard";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: overview } = useDashboardOverview();

  const navigation = [
    { href: "/dashboard", label: "Overview", icon: ChartLineData01Icon },
    { href: "/dashboard/inbox", label: "Inbox", icon: WhatsappIcon, count: overview?.conversations },
    { href: "/dashboard/products", label: "Products", icon: PackageIcon },
    { href: "/dashboard/inventory", label: "Inventory", icon: PackageIcon },
    { href: "/dashboard/invoices", label: "Invoices", icon: InvoiceIcon },
    { href: "/dashboard/customers", label: "Customers", icon: UserGroupIcon },
    { href: "/dashboard/books", label: "Books", icon: ChartLineData01Icon },
    { href: "/dashboard/approvals", label: "Approvals", icon: CheckmarkCircle02Icon, count: overview?.approvals },
    { href: "/dashboard/settings", label: "Settings", icon: AiBrain01Icon },
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
        <div className="mt-auto rounded-xl border border-border/70 bg-background/75 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className={cn("size-2 rounded-full", overview?.business.whatsappConnected ? "bg-[#34d399]" : "bg-muted-foreground/40")} />
            {overview?.business.whatsappConnected ? "WhatsApp connected" : "WhatsApp not connected"}
          </div>
          <p className="mt-2 truncate text-xs leading-5 text-muted-foreground">{overview?.business.name ?? "Loading…"}</p>
        </div>
      </aside>
      <div className="lg:pl-64">{children}</div>
    </div>
  );
}
