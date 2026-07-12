"use client";

import { useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  AiBrain01Icon,
  ArrowRight02Icon,
  ChartLineData01Icon,
  CheckmarkCircle02Icon,
  InvoiceIcon,
  PackageIcon,
  ShieldIcon,
  WhatsappIcon,
} from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/dashboard", label: "Overview", icon: ChartLineData01Icon, active: true },
  { href: "/dashboard/inbox", label: "Inbox", icon: WhatsappIcon, count: "4" },
  { href: "/dashboard/products", label: "Products", icon: PackageIcon },
  { href: "/dashboard/inventory", label: "Inventory", icon: PackageIcon },
  { href: "/dashboard/invoices", label: "Invoices", icon: InvoiceIcon },
  { href: "/dashboard/customers", label: "Customers", icon: WhatsappIcon },
  { href: "/dashboard/books", label: "Books", icon: ChartLineData01Icon },
  { href: "/dashboard/approvals", label: "Approvals", icon: CheckmarkCircle02Icon, count: "3" },
  { href: "/dashboard/settings", label: "Settings", icon: AiBrain01Icon },
];

const activity = [
  { icon: WhatsappIcon, label: "New WhatsApp order", detail: "Nimal's Hardware · 2 min ago", tone: "text-[#25D366]" },
  { icon: InvoiceIcon, label: "Invoice INV-0218 drafted", detail: "LKR 122,500 · awaiting approval", tone: "text-primary" },
  { icon: PackageIcon, label: "Low stock alert", detail: "Cement bags · 14 remaining", tone: "text-[#f59e0b]" },
];

const metrics = [
  { label: "Today&apos;s sales", value: "LKR 384,200", note: "+18.4% vs yesterday", icon: ChartLineData01Icon },
  { label: "Conversations", value: "14", note: "3 need a reply", icon: WhatsappIcon },
  { label: "Pending approvals", value: "3", note: "Worth your attention", icon: CheckmarkCircle02Icon },
  { label: "Low-stock items", value: "4", note: "Cement is running low", icon: PackageIcon },
];

export function DashboardPreview() {
  const [approved, setApproved] = useState(false);
  const [showActivity, setShowActivity] = useState(true);

  return (
    <div className="min-h-svh bg-muted/30 text-foreground">
      <aside className="dashboard-sidebar fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-border/70 p-4 lg:flex lg:flex-col">
        <Link href="/" className="flex items-center gap-2.5 px-2 py-3">
          <span className="btn-purple flex size-9 items-center justify-center rounded-xl">
            <HugeiconsIcon icon={AiBrain01Icon} size={19} strokeWidth={1.8} />
          </span>
          <span className="text-sm font-semibold tracking-wide">Deskops <span className="text-primary">AI</span></span>
        </Link>

        <p className="mt-9 px-3 font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">Workspace</p>
        <nav className="mt-3 space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                item.active ? "bg-primary/10 font-medium text-primary shadow-[inset_0_0_0_1px_rgba(110,67,220,0.12)]" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <HugeiconsIcon icon={item.icon} size={18} strokeWidth={1.8} />
              {item.label}
              {item.count && <span className="ml-auto rounded-md bg-primary px-1.5 py-0.5 font-mono text-[10px] text-white">{item.count}</span>}
            </Link>
          ))}
        </nav>

        <div className="mt-auto rounded-xl border border-border/70 bg-background/75 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium"><span className="size-2 rounded-full bg-[#34d399]" /> WhatsApp connected</div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">Nimal&apos;s Hardware<br />+94 77 482 0192</p>
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-xl px-2 py-2">
          <span className="flex size-9 items-center justify-center rounded-full bg-[rgb(128,81,249)] font-mono text-xs">NP</span>
          <div className="min-w-0"><p className="truncate text-sm font-medium">Nimal Perera</p><p className="truncate text-xs text-muted-foreground">Owner</p></div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-18 items-center justify-between border-b border-border/70 bg-background/85 px-4 backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-3 lg:hidden"><span className="btn-purple flex size-9 items-center justify-center rounded-xl"><HugeiconsIcon icon={AiBrain01Icon} size={18} /></span><span className="text-sm font-semibold tracking-wide">Deskops AI</span></div>
          <p className="hidden font-mono text-xs text-muted-foreground lg:block">Sunday, 12 July · Colombo</p>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="hidden rounded-full border border-[#34d399]/20 bg-[#34d399]/10 px-3 py-1 text-[#047857] sm:inline-flex"><span className="mr-1.5 size-1.5 animate-pulse rounded-full bg-[#34d399]" /> All agents online</Badge>
            <Button className="btn-purple h-10 rounded-md border-0 px-4 text-sm"><HugeiconsIcon icon={Add01Icon} size={17} /> New invoice</Button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div><p className="font-mono text-xs tracking-[0.2em] text-primary uppercase">Sunday briefing</p><h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">Good morning, <span className="text-primary">Nimal.</span></h1><p className="mt-3 text-muted-foreground">Your AI back office is handling the desk. Here&apos;s what needs you.</p></div>
            <Button variant="outline" className="h-10 rounded-md bg-background px-4" onClick={() => setShowActivity((value) => !value)}>{showActivity ? "Hide activity" : "Show activity"}</Button>
          </div>

          <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <Card key={metric.label} className="border-border/80 shadow-sm"><CardContent className="p-5"><div className="flex items-start justify-between"><p className="text-sm text-muted-foreground">{metric.label}</p><span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><HugeiconsIcon icon={metric.icon} size={18} strokeWidth={1.8} /></span></div><p className="mt-6 text-2xl font-semibold tracking-tight">{metric.label === "Pending approvals" && approved ? "2" : metric.value}</p><p className="mt-1.5 text-xs text-muted-foreground">{metric.label === "Pending approvals" && approved ? "One sent just now" : metric.note}</p></CardContent></Card>
            ))}
          </section>

          <section className="mt-7 grid gap-7 xl:grid-cols-[1.35fr_0.85fr]">
            <Card className="overflow-hidden border-primary/20 shadow-[0_18px_50px_-26px_rgba(110,67,220,0.4)]"><CardContent className="p-0"><div className="flex items-center justify-between border-b border-border/70 bg-primary/[0.03] px-5 py-4 sm:px-6"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-primary text-white"><HugeiconsIcon icon={CheckmarkCircle02Icon} size={20} /></span><div><p className="font-semibold">Needs your approval</p><p className="text-xs text-muted-foreground">Invoice draft · received 2 min ago</p></div></div><Badge className="rounded-md bg-primary/10 text-primary hover:bg-primary/10">Priority</Badge></div><div className="p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-sm text-muted-foreground">Nimal&apos;s Hardware · WhatsApp order</p><h2 className="mt-2 text-xl font-semibold">50 bags of cement</h2><p className="mt-1 text-sm text-muted-foreground">Friday delivery · 64 bags in stock</p></div><p className="text-right text-xl font-semibold">LKR 122,500</p></div><div className="mt-5 grid grid-cols-3 gap-2 rounded-xl bg-muted/60 p-3 text-center text-xs"><div><p className="text-muted-foreground">Subtotal</p><p className="mt-1 font-medium">122,500</p></div><div><p className="text-muted-foreground">Tax</p><p className="mt-1 font-medium">0</p></div><div><p className="text-muted-foreground">Total</p><p className="mt-1 font-medium">122,500</p></div></div><div className="mt-5 flex flex-wrap gap-3"><Button disabled={approved} onClick={() => setApproved(true)} className={cn("h-11 rounded-md border-0 px-5", approved ? "bg-[#059669] text-white hover:bg-[#059669]" : "btn-purple")}><HugeiconsIcon icon={CheckmarkCircle02Icon} size={17} />{approved ? "Approved & sent" : "Approve & send"}</Button><Button variant="outline" className="h-11 rounded-md px-5">Edit first</Button></div></div></CardContent></Card>

            <Card className="border-border/80"><CardContent className="p-0"><div className="flex items-center justify-between px-5 py-5 sm:px-6"><div><p className="font-semibold">Today&apos;s insight</p><p className="mt-1 text-xs text-muted-foreground">Generated from your live books</p></div><HugeiconsIcon icon={AiBrain01Icon} size={22} className="text-primary" /></div><div className="mx-5 rounded-xl bg-primary/[0.06] p-5 sm:mx-6"><p className="text-sm leading-6 text-foreground/85">You&apos;re on track for your strongest Sunday this month. Cement demand is up, but reorder before Wednesday to avoid a stock-out.</p><div className="mt-4 flex items-center gap-2 text-xs text-[#047857]"><HugeiconsIcon icon={ShieldIcon} size={15} /> Numbers verified against your books</div></div><button type="button" className="flex w-full items-center justify-between px-5 py-5 text-left text-sm font-medium sm:px-6" onClick={() => setShowActivity((value) => !value)}>Recent activity <HugeiconsIcon icon={ArrowRight02Icon} size={17} className={cn("transition-transform duration-200", showActivity && "rotate-90")} /></button><div className="overflow-hidden px-5 sm:px-6"><div className="t-panel-slide space-y-4 pb-5" data-open={showActivity}>{activity.map((item) => <div key={item.label} className="flex gap-3"><span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted", item.tone)}><HugeiconsIcon icon={item.icon} size={16} /></span><div><p className="text-sm font-medium">{item.label}</p><p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p></div></div>)}</div></div></CardContent></Card>
          </section>

          <section className="mt-7 grid gap-7 lg:grid-cols-2"><Card className="border-border/80"><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="font-heading tracking-wide">Agent activity</p><p className="mt-1 text-xs text-muted-foreground">Live orchestration trace</p></div><Badge variant="secondary" className="rounded-full bg-accent">3 active</Badge></div><div className="mt-5 space-y-3">{["Inventory checked cement stock", "Sales agent drafted INV-0218", "Books agent updated today&apos;s ledger"].map((item, index) => <div key={item} className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/30 px-4 py-3"><span className="font-mono text-xs text-primary">0{index + 1}</span><p className="text-sm">{item}</p><span className="ml-auto size-2 rounded-full bg-[#34d399]" /></div>)}</div></CardContent></Card><Card className="surface-dark border-0 text-white"><CardContent className="p-6"><p className="font-mono text-xs tracking-[0.2em] text-white/45 uppercase">Quick action</p><h2 className="font-heading mt-4 text-3xl leading-tight tracking-wide">Start a new<br /><span className="text-[rgb(160,124,255)]">conversation.</span></h2><p className="mt-3 max-w-sm text-sm leading-6 text-white/60">Draft a customer reply with grounded stock, price, and invoice context.</p><Button className="btn-purple mt-6 h-11 rounded-md border-0 px-5">Open inbox <HugeiconsIcon icon={ArrowRight02Icon} size={17} /></Button></CardContent></Card></section>
        </main>
      </div>
    </div>
  );
}
