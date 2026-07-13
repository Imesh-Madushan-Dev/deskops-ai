"use client";

import { ChartLineData01Icon, DollarCircleIcon, PieChartIcon, Wallet01Icon } from "@hugeicons/core-free-icons";
import { useBooksReport } from "@/lib/query/books";
import { useDashboardOverview } from "@/lib/query/dashboard";
import { formatMoney } from "@/lib/utils/money";
import { cn } from "@/lib/utils";
import { EmptyState, PageIntro, PageShell, Panel, StatCard } from "@/components/dashboard/ui";

export default function BooksReportsPage() {
  const { data: report, isLoading } = useBooksReport();
  const { data: overview } = useDashboardOverview();
  const currency = overview?.business.currency ?? "LKR";
  const maxAmount = Math.max(...(report?.byCategory.map((r) => Math.abs(r.amount)) ?? [0]), 1);

  return (
    <PageShell crumbs={[{ label: "Books", href: "/dashboard/books" }, "Reports"]} width="max-w-4xl">
      <PageIntro eyebrow="This month" title="Reports" description="Deterministic summaries computed from the ledger — the same numbers the daily insight cites." />

      {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>}
      {report && (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Income" value={formatMoney(report.income, currency)} hint="this month" icon={ChartLineData01Icon} tone="brand" />
            <StatCard label="Expenses" value={formatMoney(report.expense, currency)} hint="this month" icon={Wallet01Icon} />
            <StatCard label="Net" value={formatMoney(report.net, currency)} hint={report.net >= 0 ? "profit" : "loss"} icon={DollarCircleIcon} />
          </section>

          <Panel className="mt-6" title="By category" sub="Positive is income, negative is spend">
            <div className="divide-y divide-border/60">
              {report.byCategory.length === 0 && <EmptyState icon={PieChartIcon} title="No entries this month" hint="Categories appear here as the ledger fills up." />}
              {report.byCategory.map((row) => {
                const positive = row.amount >= 0;
                const pct = Math.max(4, Math.round((Math.abs(row.amount) / maxAmount) * 100));
                return (
                  <div key={row.category} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-medium">{row.category}</p>
                        <span className={cn("font-mono text-sm tabular-nums", positive ? "text-[#047857]" : "text-destructive")}>{formatMoney(row.amount, currency)}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <span className={cn("block h-full rounded-full", positive ? "bg-chart-1" : "bg-chart-2")} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </>
      )}
    </PageShell>
  );
}
