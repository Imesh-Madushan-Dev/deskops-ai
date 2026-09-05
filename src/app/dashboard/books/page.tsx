"use client";

import { useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, ChartLineData01Icon, DollarCircleIcon, PieChartIcon, Wallet01Icon } from "@hugeicons/core-free-icons";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBooksReport, useCreateLedgerEntry, useLedgerEntries } from "@/lib/query/books";
import { useDashboardOverview } from "@/lib/query/dashboard";
import { formatMoney } from "@/lib/utils/money";
import { cn } from "@/lib/utils";
import { EmptyState, FilterChips, PageIntro, PageShell, Panel, StatCard, StatusPill } from "@/components/dashboard/ui";

const DAYS = 14;
type TypeFilter = "all" | "income" | "expense";

function BooksTooltip({ active, payload, label, currency }: { active?: boolean; payload?: { name?: string; value?: number | string; color?: string }[]; label?: string; currency: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/70 bg-popover px-3 py-2 text-xs shadow-md">
      <p className="text-muted-foreground">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="mt-1 flex items-center gap-1.5 font-mono tabular-nums">
          <span className="size-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-muted-foreground capitalize">{entry.name}</span> {formatMoney(Number(entry.value ?? 0), currency)}
        </p>
      ))}
    </div>
  );
}

export default function BooksPage() {
  const { data: entries, isLoading } = useLedgerEntries();
  const { data: report } = useBooksReport();
  // Bars are scaled to the largest category, so they compare sizes rather than all sitting full.
  const maxCategoryAmount = Math.max(...(report?.byCategory.map((r) => Math.abs(r.amount)) ?? [0]), 1);
  const { data: overview } = useDashboardOverview();
  const createEntry = useCreateLedgerEntry();
  const [open, setOpen] = useState(false);
  const [entryType, setEntryType] = useState<"income" | "expense">("expense");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const currency = overview?.business.currency ?? "LKR";

  const series = useMemo(() => {
    const days = Array.from({ length: DAYS }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (DAYS - 1 - i));
      return { key: d.toISOString().slice(0, 10), label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), income: 0, expense: 0 };
    });
    const byKey = new Map(days.map((d) => [d.key, d]));
    for (const entry of entries ?? []) {
      const day = byKey.get(entry.occurred_at.slice(0, 10));
      if (day) day[entry.entry_type] += entry.amount;
    }
    return days;
  }, [entries]);

  const filtered = (entries ?? []).filter((e) => typeFilter === "all" || e.entry_type === typeFilter);

  async function submit(formData: FormData) {
    setError(null);
    try {
      await createEntry.mutateAsync({ entryType, amount: Number(formData.get("amount") ?? 0), category: String(formData.get("category") ?? "") });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add entry.");
    }
  }

  return (
    <PageShell
      crumbs={["Books"]}
      actions={
        <>
          <Button className="btn-purple h-9 rounded-lg border-0 px-4 text-sm" onClick={() => setOpen(true)}><HugeiconsIcon icon={Add01Icon} size={16} /> Add entry</Button>
        </>
      }
    >
      <PageIntro eyebrow="Ledger" title="Books" description="Income and expenses, written automatically after every sale — the numbers the Books agent reports from." />

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Income" value={report ? formatMoney(report.income, currency) : "—"} hint="this month" icon={ChartLineData01Icon} tone="brand" />
        <StatCard label="Expenses" value={report ? formatMoney(report.expense, currency) : "—"} hint="this month" icon={Wallet01Icon} />
        <StatCard label="Net" value={report ? formatMoney(report.net, currency) : "—"} hint={report && report.net >= 0 ? "in the black" : "in the red"} icon={DollarCircleIcon} />
      </section>

      <Panel className="mt-6" title="Cash flow" sub={`Income vs expenses, last ${DAYS} days`}>
        <div className="h-64 px-2 pt-4 pb-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} margin={{ top: 4, right: 12, left: 4, bottom: 0 }} barGap={2}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} minTickGap={24} />
              <YAxis tickLine={false} axisLine={false} width={44} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
              <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.5 }} content={<BooksTooltip currency={currency} />} />
              <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} formatter={(value: string) => <span className="text-muted-foreground capitalize">{value}</span>} />
              <Bar dataKey="income" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={18} />
              <Bar dataKey="expense" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel className="mt-6" title="By category" sub="This month · positive is income, negative is spend">
        <div className="divide-y divide-border/60">
          {report?.byCategory.length === 0 && <EmptyState icon={PieChartIcon} title="No entries this month" hint="Categories appear here as the ledger fills up." />}
          {report?.byCategory.map((row) => {
            const positive = row.amount >= 0;
            const pct = Math.max(4, Math.round((Math.abs(row.amount) / maxCategoryAmount) * 100));
            return (
              <div key={row.category} className="flex items-center gap-4 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-medium">{row.category}</p>
                    <span className={cn("font-mono text-sm tabular-nums", positive ? "text-[#047857] dark:text-[#34d399]" : "text-destructive")}>
                      {formatMoney(row.amount, currency)}
                    </span>
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

      <Panel
        className="mt-6"
        title="Ledger entries"
        action={
          <FilterChips<TypeFilter>
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { value: "all", label: "All", count: entries?.length },
              { value: "income", label: "Income" },
              { value: "expense", label: "Expense" },
            ]}
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">Loading…</TableCell></TableRow>}
            {!isLoading && filtered.length === 0 && (
              <TableRow className="hover:bg-transparent"><TableCell colSpan={4} className="p-0">
                <EmptyState icon={Wallet01Icon} title="No entries" hint="Paid invoices write income here automatically; add expenses manually." />
              </TableCell></TableRow>
            )}
            {filtered.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="text-muted-foreground">{new Date(entry.occurred_at).toLocaleDateString()}</TableCell>
                <TableCell className="font-medium">{entry.category}</TableCell>
                <TableCell><StatusPill tone={entry.entry_type === "income" ? "ok" : "neutral"} dot={false}>{entry.entry_type}</StatusPill></TableCell>
                <TableCell className={cn("text-right font-mono tabular-nums", entry.entry_type === "income" ? "text-[#047857]" : "text-destructive")}>
                  {entry.entry_type === "income" ? "+" : "−"}{formatMoney(entry.amount, currency)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add ledger entry</DialogTitle></DialogHeader>
          <form action={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={entryType} onValueChange={(v) => setEntryType(v as "income" | "expense")}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="income">Income</SelectItem><SelectItem value="expense">Expense</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label htmlFor="amount">Amount</Label><Input id="amount" name="amount" type="number" min="0" step="0.01" required /></div>
            <div className="space-y-1.5"><Label htmlFor="category">Category</Label><Input id="category" name="category" required /></div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <DialogFooter><Button type="submit" disabled={createEntry.isPending} className="btn-purple border-0">{createEntry.isPending ? "Saving…" : "Add entry"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
