"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Clock01Icon, DollarCircleIcon, InvoiceIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useInvoices, type Invoice } from "@/lib/query/invoices";
import { useDashboardOverview } from "@/lib/query/dashboard";
import { formatMoney } from "@/lib/utils/money";
import { contactLabel } from "@/lib/utils/contact";
import { EmptyState, FilterChips, PageIntro, PageShell, Panel, relativeTime, StatCard, StatusPill } from "@/components/dashboard/ui";

type StatusFilter = "all" | Invoice["status"];
const statusTone = { draft: "neutral", sent: "brand", paid: "ok", void: "bad" } as const;

export default function InvoicesPage() {
  const { data: invoices, isLoading } = useInvoices();
  const { data: overview } = useDashboardOverview();
  const [status, setStatus] = useState<StatusFilter>("all");
  const currency = overview?.business.currency ?? "LKR";

  const stats = useMemo(() => {
    const list = invoices ?? [];
    return {
      outstanding: list.filter((i) => i.status === "sent").reduce((s, i) => s + i.total, 0),
      paid: list.filter((i) => i.status === "paid").reduce((s, i) => s + i.total, 0),
      drafts: list.filter((i) => i.status === "draft").length,
      count: (s: Invoice["status"]) => list.filter((i) => i.status === s).length,
    };
  }, [invoices]);

  const filtered = (invoices ?? []).filter((i) => status === "all" || i.status === status);

  return (
    <PageShell
      crumbs={["Invoices"]}
      actions={<Link href="/dashboard/invoices/new"><Button className="btn-purple h-9 rounded-lg border-0 px-4 text-sm"><HugeiconsIcon icon={Add01Icon} size={16} /> New invoice</Button></Link>}
    >
      <PageIntro eyebrow="Sales desk" title="Invoices" description="Drafted by the Sales agent or by you — every total computed in code and backed by the ledger." />

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Outstanding" value={formatMoney(stats.outstanding, currency)} hint="sent, awaiting payment" icon={Clock01Icon} tone="brand" />
        <StatCard label="Collected" value={formatMoney(stats.paid, currency)} hint="paid invoices, all time" icon={DollarCircleIcon} />
        <StatCard label="Drafts" value={stats.drafts} hint="not yet sent" icon={InvoiceIcon} />
      </section>

      <Panel
        className="mt-6"
        title="All invoices"
        action={
          <FilterChips<StatusFilter>
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "All", count: invoices?.length },
              { value: "draft", label: "Draft", count: stats.count("draft") },
              { value: "sent", label: "Sent", count: stats.count("sent") },
              { value: "paid", label: "Paid", count: stats.count("paid") },
              { value: "void", label: "Void" },
            ]}
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Number</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden sm:table-cell">Created</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Loading…</TableCell></TableRow>}
            {!isLoading && filtered.length === 0 && (
              <TableRow className="hover:bg-transparent"><TableCell colSpan={5} className="p-0">
                <EmptyState icon={InvoiceIcon} title={status === "all" ? "No invoices yet" : `No ${status} invoices`} hint="Invoices the agent drafts from WhatsApp orders will appear here too." />
              </TableCell></TableRow>
            )}
            {filtered.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-mono text-sm font-medium"><Link href={`/dashboard/invoices/${invoice.id}`} className="hover:text-primary">{invoice.number}</Link></TableCell>
                <TableCell className="text-muted-foreground">{contactLabel(invoice.customers)}</TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">{relativeTime(invoice.created_at)}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{formatMoney(invoice.total, currency)}</TableCell>
                <TableCell><StatusPill tone={statusTone[invoice.status]} dot={false}>{invoice.status}</StatusPill></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
    </PageShell>
  );
}
