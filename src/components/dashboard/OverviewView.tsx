"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { AiBrain01Icon, ArrowRight02Icon, CheckmarkCircle02Icon, ChartLineData01Icon, InvoiceIcon, PackageIcon, ShieldIcon, WhatsappIcon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils/money";
import { useDashboardOverview } from "@/lib/query/dashboard";
import { useApprovals } from "@/lib/query/approvals";
import { useInsight } from "@/lib/query/insights";

const actionLabel: Record<string, { label: string; icon: typeof InvoiceIcon }> = {
  send_message: { label: "WhatsApp reply", icon: WhatsappIcon },
  send_invoice: { label: "Send invoice", icon: InvoiceIcon },
  mark_invoice_paid: { label: "Mark invoice paid", icon: InvoiceIcon },
  reorder: { label: "Create reorder", icon: PackageIcon },
};

export function OverviewView() {
  const { data: overview } = useDashboardOverview();
  const { data: approvals } = useApprovals();
  const today = new Date().toISOString().slice(0, 10);
  const { data: insight } = useInsight(today);

  const currency = overview?.business.currency ?? "LKR";
  const metrics = [
    { label: "Today's sales", value: overview ? formatMoney(overview.salesToday, currency) : "—", icon: ChartLineData01Icon, href: "/dashboard/books" },
    { label: "Awaiting reply", value: overview?.conversations ?? "—", icon: WhatsappIcon, href: "/dashboard/inbox" },
    { label: "Pending approvals", value: overview?.approvals ?? "—", icon: CheckmarkCircle02Icon, href: "/dashboard/approvals" },
    { label: "Low-stock items", value: overview?.lowStock ?? "—", icon: PackageIcon, href: "/dashboard/inventory" },
  ];
  const pendingCount = approvals?.length ?? 0;

  return (
    <>
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border/70 bg-background/85 px-4 backdrop-blur-xl sm:px-8">
        <div className="flex items-center gap-3 lg:hidden">
          <span className="btn-purple flex size-9 items-center justify-center rounded-xl"><HugeiconsIcon icon={AiBrain01Icon} size={18} /></span>
          <span className="text-sm font-semibold tracking-wide">Deskops AI</span>
        </div>
        <p className="hidden text-sm font-medium text-muted-foreground lg:block">{overview?.business.name ?? ""}</p>
        <Link href="/dashboard/invoices/new"><Button className="btn-purple h-10 rounded-md border-0 px-4 text-sm">New invoice</Button></Link>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-10">
        <div>
          <p className="font-mono text-xs tracking-[0.2em] text-primary uppercase">Overview</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">Good to see you.</h1>
          <p className="mt-3 text-muted-foreground">Your AI back office is handling the desk. Here&apos;s what needs you.</p>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <Link key={metric.label} href={metric.href} className="group">
              <Card className="border-border/80 shadow-sm transition-colors group-hover:border-primary/40">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <p className="text-sm text-muted-foreground">{metric.label}</p>
                    <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><HugeiconsIcon icon={metric.icon} size={18} strokeWidth={1.8} /></span>
                  </div>
                  <p className="mt-6 text-2xl font-semibold tracking-tight">{metric.value}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </section>

        <section className="mt-7 grid gap-7 xl:grid-cols-[1.35fr_0.85fr]">
          <Card className="overflow-hidden border-primary/20 shadow-[0_18px_50px_-26px_rgba(110,67,220,0.4)]">
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b border-border/70 bg-primary/5 px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-white"><HugeiconsIcon icon={CheckmarkCircle02Icon} size={20} /></span>
                  <div>
                    <p className="font-semibold">Waiting for approval</p>
                    <p className="text-xs text-muted-foreground">{pendingCount > 0 ? `${pendingCount} item${pendingCount === 1 ? "" : "s"} need your go-ahead` : "You're all caught up"}</p>
                  </div>
                </div>
                {pendingCount > 0 && <Badge className="rounded-md bg-primary/10 text-primary hover:bg-primary/10">{pendingCount}</Badge>}
              </div>
              <div className="divide-y divide-border/70">
                {(approvals ?? []).slice(0, 4).map((item) => {
                  const meta = actionLabel[item.action_type] ?? { label: item.action_type, icon: CheckmarkCircle02Icon };
                  return (
                    <div key={item.id} className="flex items-center gap-3 px-5 py-4 sm:px-6">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-primary"><HugeiconsIcon icon={meta.icon} size={17} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{typeof item.payload.body === "string" ? item.payload.body : meta.label}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{meta.label} · {new Date(item.created_at).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  );
                })}
                {pendingCount === 0 && <div className="px-5 py-10 text-center text-sm text-muted-foreground sm:px-6">Nothing pending — the agent is keeping up.</div>}
              </div>
              <div className="border-t border-border/70 p-4 sm:px-6">
                <Link href="/dashboard/approvals">
                  <Button variant="outline" className="h-10 w-full rounded-md">View all approvals <HugeiconsIcon icon={ArrowRight02Icon} size={16} /></Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardContent className="p-0">
              <div className="flex items-center justify-between px-5 py-5 sm:px-6">
                <div><p className="font-semibold">Today&apos;s insight</p><p className="mt-1 text-xs text-muted-foreground">Generated from your live books</p></div>
                <HugeiconsIcon icon={AiBrain01Icon} size={22} className="text-primary" />
              </div>
              <div className="mx-5 rounded-xl bg-primary/6 p-5 sm:mx-6">
                <p className="text-sm leading-6 text-foreground/85">{insight?.summary ?? "No insight generated yet for today — check back after your first sale."}</p>
                <div className="mt-4 flex items-center gap-2 text-xs text-[#047857]"><HugeiconsIcon icon={ShieldIcon} size={15} /> Numbers verified against your books</div>
              </div>
              <div className="p-5 sm:px-6">
                <Link href="/dashboard/books/reports">
                  <Button variant="ghost" className="h-9 w-full justify-between rounded-md px-3 text-sm">View reports <HugeiconsIcon icon={ArrowRight02Icon} size={16} /></Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  );
}
