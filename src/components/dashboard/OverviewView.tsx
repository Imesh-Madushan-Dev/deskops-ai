"use client";

import { useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { AiBrain01Icon, ArrowRight02Icon, CheckmarkCircle02Icon, ChartLineData01Icon, InvoiceIcon, PackageIcon, ShieldIcon, WhatsappIcon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/utils/money";
import { useDashboardOverview } from "@/lib/query/dashboard";
import { useApprovals, useDecideApproval } from "@/lib/query/approvals";
import { useInsight } from "@/lib/query/insights";

export function OverviewView() {
  const [showActivity, setShowActivity] = useState(true);
  const { data: overview } = useDashboardOverview();
  const { data: approvals } = useApprovals();
  const decide = useDecideApproval();
  const today = new Date().toISOString().slice(0, 10);
  const { data: insight } = useInsight(today);

  const currency = overview?.business.currency ?? "LKR";
  const metrics = [
    { label: "Today's sales", value: overview ? formatMoney(overview.salesToday, currency) : "—", icon: ChartLineData01Icon },
    { label: "Open conversations", value: overview?.conversations ?? "—", icon: WhatsappIcon },
    { label: "Pending approvals", value: overview?.approvals ?? "—", icon: CheckmarkCircle02Icon },
    { label: "Low-stock items", value: overview?.lowStock ?? "—", icon: PackageIcon },
  ];
  const topApproval = approvals?.[0];

  return (
    <>
      <header className="sticky top-0 z-10 flex h-18 items-center justify-between border-b border-border/70 bg-background/85 px-4 backdrop-blur-xl sm:px-8">
        <div className="flex items-center gap-3 lg:hidden">
          <span className="btn-purple flex size-9 items-center justify-center rounded-xl"><HugeiconsIcon icon={AiBrain01Icon} size={18} /></span>
          <span className="text-sm font-semibold tracking-wide">Deskops AI</span>
        </div>
        <p className="hidden font-mono text-xs text-muted-foreground lg:block">{overview?.business.name ?? ""}</p>
        <Link href="/dashboard/invoices/new"><Button className="btn-purple h-10 rounded-md border-0 px-4 text-sm">New invoice</Button></Link>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-xs tracking-[0.2em] text-primary uppercase">Overview</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">Good to see you.</h1>
            <p className="mt-3 text-muted-foreground">Your AI back office is handling the desk. Here&apos;s what needs you.</p>
          </div>
          <Button variant="outline" className="h-10 rounded-md bg-background px-4" onClick={() => setShowActivity((v) => !v)}>{showActivity ? "Hide insight" : "Show insight"}</Button>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.label} className="border-border/80 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><HugeiconsIcon icon={metric.icon} size={18} strokeWidth={1.8} /></span>
                </div>
                <p className="mt-6 text-2xl font-semibold tracking-tight">{metric.value}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mt-7 grid gap-7 xl:grid-cols-[1.35fr_0.85fr]">
          <Card className="overflow-hidden border-primary/20 shadow-[0_18px_50px_-26px_rgba(110,67,220,0.4)]">
            <CardContent className="p-0">
              {topApproval ? (
                <>
                  <div className="flex items-center justify-between border-b border-border/70 bg-primary/[0.03] px-5 py-4 sm:px-6">
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-white"><HugeiconsIcon icon={CheckmarkCircle02Icon} size={20} /></span>
                      <div><p className="font-semibold">Needs your approval</p><p className="text-xs text-muted-foreground capitalize">{topApproval.action_type.replace(/_/g, " ")}</p></div>
                    </div>
                    <Badge className="rounded-md bg-primary/10 text-primary hover:bg-primary/10">Priority</Badge>
                  </div>
                  <div className="p-5 sm:p-6">
                    <p className="text-sm text-muted-foreground">Awaiting your one-tap confirmation before anything is sent.</p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <Button disabled={decide.isPending} onClick={() => decide.mutate({ id: topApproval.id, action: "approve" })} className="btn-purple h-11 rounded-md border-0 px-5">
                        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={17} /> Approve & send
                      </Button>
                      <Link href="/dashboard/approvals"><Button variant="outline" className="h-11 rounded-md px-5">Review all</Button></Link>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">No approvals waiting — you&apos;re all caught up.</div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardContent className="p-0">
              <div className="flex items-center justify-between px-5 py-5 sm:px-6">
                <div><p className="font-semibold">Today&apos;s insight</p><p className="mt-1 text-xs text-muted-foreground">Generated from your live books</p></div>
                <HugeiconsIcon icon={AiBrain01Icon} size={22} className="text-primary" />
              </div>
              <div className="mx-5 rounded-xl bg-primary/[0.06] p-5 sm:mx-6">
                <p className="text-sm leading-6 text-foreground/85">{insight?.summary ?? "No insight generated yet for today — check back after your first sale."}</p>
                <div className="mt-4 flex items-center gap-2 text-xs text-[#047857]"><HugeiconsIcon icon={ShieldIcon} size={15} /> Numbers verified against your books</div>
              </div>
              <button type="button" className="flex w-full items-center justify-between px-5 py-5 text-left text-sm font-medium sm:px-6" onClick={() => setShowActivity((v) => !v)}>
                Pending approvals <HugeiconsIcon icon={ArrowRight02Icon} size={17} className={cn("transition-transform duration-200", showActivity && "rotate-90")} />
              </button>
              <div className="overflow-hidden px-5 sm:px-6">
                <div className="t-panel-slide space-y-4 pb-5" data-open={showActivity}>
                  {(approvals ?? []).slice(0, 4).map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-primary"><HugeiconsIcon icon={InvoiceIcon} size={16} /></span>
                      <div><p className="text-sm font-medium capitalize">{item.action_type.replace(/_/g, " ")}</p><p className="mt-0.5 text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</p></div>
                    </div>
                  ))}
                  {approvals?.length === 0 && <p className="text-sm text-muted-foreground">Nothing pending.</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  );
}
