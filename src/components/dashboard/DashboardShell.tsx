"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  AiBrain01Icon,
  ChartLineData01Icon,
  CheckmarkCircle02Icon,
  InvoiceIcon,
  PackageIcon,
  WhatsappIcon,
} from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/dashboard", label: "Overview", icon: ChartLineData01Icon },
  { href: "/dashboard/inbox", label: "Inbox", icon: WhatsappIcon, count: "4" },
  { href: "/dashboard/products", label: "Products", icon: PackageIcon },
  { href: "/dashboard/inventory", label: "Inventory", icon: PackageIcon },
  { href: "/dashboard/invoices", label: "Invoices", icon: InvoiceIcon },
  { href: "/dashboard/customers", label: "Customers", icon: WhatsappIcon },
  { href: "/dashboard/books", label: "Books", icon: ChartLineData01Icon },
  { href: "/dashboard/approvals", label: "Approvals", icon: CheckmarkCircle02Icon, count: "3" },
  { href: "/dashboard/settings", label: "Settings", icon: AiBrain01Icon },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

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
            return <Link key={item.href} href={item.href} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors", active ? "bg-primary/10 font-medium text-primary shadow-[inset_0_0_0_1px_rgba(110,67,220,0.12)]" : "text-muted-foreground hover:bg-muted hover:text-foreground")}><HugeiconsIcon icon={item.icon} size={18} strokeWidth={1.8} />{item.label}{item.count && <span className={cn("ml-auto rounded-md px-1.5 py-0.5 font-mono text-[10px]", active ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>{item.count}</span>}</Link>;
          })}
        </nav>
        <div className="mt-auto rounded-xl border border-border/70 bg-background/75 p-4 shadow-sm"><div className="flex items-center gap-2 text-sm font-medium"><span className="size-2 rounded-full bg-[#34d399]" /> WhatsApp connected</div><p className="mt-2 text-xs leading-5 text-muted-foreground">Nimal&apos;s Hardware<br />+94 77 482 0192</p></div>
        <div className="mt-4 flex items-center gap-3 rounded-xl px-2 py-2"><span className="flex size-9 items-center justify-center rounded-full bg-primary font-mono text-xs text-white">NP</span><div><p className="text-sm font-medium">Nimal Perera</p><p className="text-xs text-muted-foreground">Owner</p></div></div>
      </aside>
      <div className="lg:pl-64"><header className="sticky top-0 z-10 flex h-18 items-center justify-between border-b border-border/70 bg-background/85 px-4 backdrop-blur-xl sm:px-8"><div className="flex items-center gap-3 lg:hidden"><span className="btn-purple flex size-9 items-center justify-center rounded-xl"><HugeiconsIcon icon={AiBrain01Icon} size={18} /></span><span className="text-sm font-semibold">Deskops AI</span></div><p className="hidden font-mono text-xs text-muted-foreground lg:block">Sunday, 12 July · Colombo</p><div className="flex items-center gap-3"><Badge variant="secondary" className="hidden rounded-full border border-[#34d399]/20 bg-[#34d399]/10 px-3 py-1 text-[#047857] sm:inline-flex"><span className="mr-1.5 size-1.5 animate-pulse rounded-full bg-[#34d399]" /> All agents online</Badge><Button className="btn-purple h-10 rounded-md border-0 px-4 text-sm"><HugeiconsIcon icon={Add01Icon} size={17} /> New invoice</Button></div></header>{children}</div>
    </div>
  );
}
