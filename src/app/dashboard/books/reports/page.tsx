"use client";

import { Card, CardContent } from "@/components/ui/card";
import { PageHeaderBar, PageTitle } from "@/components/dashboard/PageHeader";
import { useBooksReport } from "@/lib/query/books";
import { useDashboardOverview } from "@/lib/query/dashboard";
import { formatMoney } from "@/lib/utils/money";

export default function BooksReportsPage() {
  const { data: report, isLoading } = useBooksReport();
  const { data: overview } = useDashboardOverview();
  const currency = overview?.business.currency ?? "LKR";

  return (
    <>
      <PageHeaderBar title="Reports" backHref="/dashboard/books" />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-8 sm:py-10">
        <PageTitle eyebrow="This month" title="Business reports" description="Income, expenses, and category breakdowns for the current month." />

        {isLoading && <p className="mt-8 text-center text-sm text-muted-foreground">Loading…</p>}
        {report && (
          <>
            <section className="mt-8 grid gap-4 sm:grid-cols-3">
              <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Income</p><p className="mt-2 text-2xl font-semibold text-[#047857]">{formatMoney(report.income, currency)}</p></CardContent></Card>
              <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Expenses</p><p className="mt-2 text-2xl font-semibold text-destructive">{formatMoney(report.expense, currency)}</p></CardContent></Card>
              <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Net</p><p className="mt-2 text-2xl font-semibold">{formatMoney(report.net, currency)}</p></CardContent></Card>
            </section>

            <Card className="mt-7 border-border/80">
              <CardContent className="p-0">
                <div className="border-b border-border/70 px-5 py-4"><h2 className="font-semibold">By category</h2></div>
                <div className="divide-y divide-border/70">
                  {report.byCategory.length === 0 && <p className="px-5 py-6 text-sm text-muted-foreground">No entries this month.</p>}
                  {report.byCategory.map((row) => (
                    <div key={row.category} className="flex items-center justify-between px-5 py-3 text-sm">
                      <span>{row.category}</span>
                      <span className={row.amount < 0 ? "text-destructive" : "text-[#047857]"}>{formatMoney(row.amount, currency)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </>
  );
}
