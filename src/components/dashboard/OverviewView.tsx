"use client";

import Link from "next/link";
import { useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  AiBrain01Icon,
  ArrowRight02Icon,
  Cancel01Icon,
  ChartLineData01Icon,
  CheckmarkCircle02Icon,
  PackageIcon,
  ShieldIcon,
  Tick02Icon,
  WhatsappIcon,
} from "@hugeicons/core-free-icons";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils/money";
import { contactLabel } from "@/lib/utils/contact";
import { useDashboardOverview } from "@/lib/query/dashboard";
import { useApprovals, useDecideApproval } from "@/lib/query/approvals";
import { useConversations } from "@/lib/query/conversations";
import { useInsight } from "@/lib/query/insights";
import { useInventory } from "@/lib/query/inventory";
import { useLedgerEntries } from "@/lib/query/books";
import { approvalMeta, describeApproval, EmptyState, InitialsAvatar, PageShell, Panel, relativeTime, StatCard, StatusPill } from "@/components/dashboard/ui";

const DAYS = 14;

function useRevenueSeries() {
  const { data: entries } = useLedgerEntries();
  return useMemo(() => {
    const days = Array.from({ length: DAYS }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (DAYS - 1 - i));
      return { key: d.toISOString().slice(0, 10), label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), income: 0 };
    });
    const byKey = new Map(days.map((d) => [d.key, d]));
    for (const entry of entries ?? []) {
      if (entry.entry_type !== "income") continue;
      const day = byKey.get(entry.occurred_at.slice(0, 10));
      if (day) day.income += entry.amount;
    }
    return days;
  }, [entries]);
}

function RevenueTooltip({ active, payload, label, currency }: { active?: boolean; payload?: { value?: number | string }[]; label?: string; currency: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/70 bg-popover px-3 py-2 text-xs shadow-md">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono font-semibold tabular-nums">{formatMoney(Number(payload[0]?.value ?? 0), currency)}</p>
    </div>
  );
}

export function OverviewView() {
  const { data: overview } = useDashboardOverview();
  const { data: approvals } = useApprovals();
  const { data: conversations } = useConversations();
  const { data: inventory } = useInventory();
  const decide = useDecideApproval();
  const today = new Date().toISOString().slice(0, 10);
  const { data: insight } = useInsight(today);
  const series = useRevenueSeries();

  const currency = overview?.business.currency ?? "LKR";
  const pending = approvals ?? [];
  const revenue14d = series.reduce((sum, d) => sum + d.income, 0);
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";

  return (
    <PageShell
      crumbs={["Overview"]}
      actions={<Link href="/dashboard/invoices/new"><Button className="btn-purple h-9 rounded-lg border-0 px-4 text-sm"><HugeiconsIcon icon={Add01Icon} size={16} /> New invoice</Button></Link>}
    >
      <div className="mb-6">
        <p className="font-mono text-[11px] tracking-[0.2em] text-primary uppercase">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} · {overview?.business.name ?? "…"}
        </p>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight sm:text-4xl">{greeting}.</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your AI back office worked the desk — here&apos;s what needs a human.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Sales today" value={overview ? formatMoney(overview.salesToday, currency) : "—"} hint={`${formatMoney(revenue14d, currency)} last ${DAYS} days`} icon={ChartLineData01Icon} href="/dashboard/books" tone="brand" />
        <StatCard label="Awaiting reply" value={overview?.conversations ?? "—"} hint="open conversations" icon={WhatsappIcon} href="/dashboard/inbox" />
        <StatCard label="Approvals" value={overview?.approvals ?? "—"} hint="actions waiting on you" icon={CheckmarkCircle02Icon} href="/dashboard/approvals" />
        <StatCard label="Low stock" value={overview?.lowStock ?? "—"} hint="items at reorder level" icon={PackageIcon} href="/dashboard/inventory" />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Panel title="Revenue" sub={`Income booked to the ledger, last ${DAYS} days`} action={<Link href="/dashboard/books/reports" className="text-xs font-medium text-primary hover:underline">Reports →</Link>}>
            <div className="h-64 px-2 pt-4 pb-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} minTickGap={24} />
                  <YAxis tickLine={false} axisLine={false} width={44} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                  <Tooltip cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }} content={<RevenueTooltip currency={currency} />} />
                  <Area type="monotone" dataKey="income" stroke="var(--chart-1)" strokeWidth={2} fill="url(#revFill)" activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Waiting for approval" sub={pending.length > 0 ? `${pending.length} action${pending.length === 1 ? "" : "s"} held at the guardrail` : "Nothing is held — the agent is keeping up"} action={pending.length > 0 ? <StatusPill tone="warn" dot={false}>{pending.length} held</StatusPill> : undefined}>
            <div className="divide-y divide-border/60">
              {pending.slice(0, 5).map((item) => {
                const meta = approvalMeta[item.action_type] ?? { label: item.action_type, icon: CheckmarkCircle02Icon };
                return (
                  <div key={item.id} className="flex items-center gap-3 px-5 py-3.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><HugeiconsIcon icon={meta.icon} size={16} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{describeApproval(item.payload)}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{meta.label} · {relativeTime(item.created_at)}</p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <Button size="sm" onClick={() => decide.mutate({ id: item.id, action: "approve", actionType: item.action_type })} className="btn-purple h-8 rounded-lg border-0 px-3 text-xs"><HugeiconsIcon icon={Tick02Icon} size={14} /> Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => decide.mutate({ id: item.id, action: "reject", actionType: item.action_type })} className="h-8 rounded-lg px-2.5 text-xs" aria-label="Reject"><HugeiconsIcon icon={Cancel01Icon} size={14} /></Button>
                    </div>
                  </div>
                );
              })}
              {pending.length === 0 && <EmptyState icon={CheckmarkCircle02Icon} title="All clear" hint="Money and message actions will queue here for your one-tap approval." className="py-10" />}
              {pending.length > 5 && (
                <Link href="/dashboard/approvals" className="flex items-center justify-center gap-1.5 px-5 py-3 text-sm font-medium text-primary hover:bg-primary/5">
                  View all {pending.length} approvals <HugeiconsIcon icon={ArrowRight02Icon} size={15} />
                </Link>
              )}
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel className="border-primary/25 bg-linear-to-b from-primary/5 to-transparent">
            <div className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Today&apos;s insight</p>
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-white"><HugeiconsIcon icon={AiBrain01Icon} size={16} /></span>
              </div>
              <p className="mt-3 text-sm leading-6 text-foreground/85">{insight?.summary ?? "No insight yet for today — the Books agent writes one after your first sale."}</p>
              <p className="mt-4 flex items-center gap-1.5 text-xs text-[#047857]"><HugeiconsIcon icon={ShieldIcon} size={14} /> Numbers verified against your ledger</p>
            </div>
          </Panel>

          <Panel title="Recent conversations" action={<Link href="/dashboard/inbox" className="text-xs font-medium text-primary hover:underline">Inbox →</Link>}>
            <div className="divide-y divide-border/60">
              {(conversations ?? []).slice(0, 5).map((c) => (
                <Link key={c.id} href={`/dashboard/inbox?c=${c.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40">
                  <InitialsAvatar name={contactLabel(c.customers)} className="size-8 text-[10px]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{contactLabel(c.customers)}</p>
                    <p className="text-xs text-muted-foreground">{relativeTime(c.last_message_at)}</p>
                  </div>
                  <StatusPill tone={c.status === "open" ? "brand" : "neutral"} dot={false}>{c.status}</StatusPill>
                </Link>
              ))}
              {(conversations ?? []).length === 0 && <EmptyState icon={WhatsappIcon} title="No conversations yet" hint="Customer WhatsApp messages will land here." className="py-8" />}
            </div>
          </Panel>

          <Panel title="Low stock" action={<Link href="/dashboard/inventory" className="text-xs font-medium text-primary hover:underline">Inventory →</Link>}>
            <div className="divide-y divide-border/60">
              {(inventory?.lowStock ?? []).slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">reorder at {item.reorder_level}</p>
                  </div>
                  <StatusPill tone={item.stock_qty === 0 ? "bad" : "warn"} dot={false}>{item.stock_qty} left</StatusPill>
                </div>
              ))}
              {(inventory?.lowStock ?? []).length === 0 && <EmptyState icon={PackageIcon} title="Stock is healthy" hint="Items at or below their reorder level will show here." className="py-8" />}
            </div>
          </Panel>
        </div>
      </section>
    </PageShell>
  );
}
