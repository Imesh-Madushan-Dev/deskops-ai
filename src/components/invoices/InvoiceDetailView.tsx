"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeaderBar, PageTitle } from "@/components/dashboard/PageHeader";
import { useInvoice, useInvoiceAction } from "@/lib/query/invoices";
import { useDashboardOverview } from "@/lib/query/dashboard";
import { formatMoney } from "@/lib/utils/money";

const statusVariant: Record<string, "secondary" | "outline" | "default" | "destructive"> = { draft: "outline", sent: "secondary", paid: "default", void: "destructive" };

export function InvoiceDetailView({ invoiceId }: { invoiceId: string }) {
  const { data: invoice, isLoading } = useInvoice(invoiceId);
  const { data: overview } = useDashboardOverview();
  const action = useInvoiceAction(invoiceId);
  const [error, setError] = useState<string | null>(null);
  const currency = overview?.business.currency ?? "LKR";

  async function run(next: "send" | "record_sale" | "void") {
    setError(null);
    try {
      await action.mutateAsync(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update invoice.");
    }
  }

  if (isLoading) return <main className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">Loading…</main>;
  if (!invoice) return <main className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">Invoice not found.</main>;

  return (
    <>
      <PageHeaderBar title="Invoice" />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-8 sm:py-10">
        <PageTitle
          eyebrow={invoice.customers?.name ?? invoice.customers?.whatsapp_number ?? "No customer"}
          title={invoice.number}
          description="Owner-initiated actions here are the human-in-the-loop step — no separate approval needed."
          action={<Badge variant={statusVariant[invoice.status]} className="h-fit capitalize">{invoice.status}</Badge>}
        />

        <Card className="mt-8 border-border/80">
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Description</TableHead><TableHead>Qty</TableHead><TableHead>Unit price</TableHead><TableHead>Line total</TableHead></TableRow></TableHeader>
              <TableBody>
                {invoice.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{formatMoney(item.unit_price, currency)}</TableCell>
                    <TableCell>{formatMoney(item.line_total, currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="grid grid-cols-3 gap-2 border-t border-border/70 p-4 text-center text-sm">
              <div><p className="text-muted-foreground">Subtotal</p><p className="mt-1 font-medium">{formatMoney(invoice.subtotal, currency)}</p></div>
              <div><p className="text-muted-foreground">Tax</p><p className="mt-1 font-medium">{formatMoney(invoice.tax, currency)}</p></div>
              <div><p className="text-muted-foreground">Total</p><p className="mt-1 font-medium">{formatMoney(invoice.total, currency)}</p></div>
            </div>
          </CardContent>
        </Card>

        {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}

        <div className="mt-6 flex flex-wrap gap-3">
          {invoice.status === "draft" && <Button onClick={() => run("send")} disabled={action.isPending} className="btn-purple border-0">Mark sent</Button>}
          {(invoice.status === "draft" || invoice.status === "sent") && <Button onClick={() => run("record_sale")} disabled={action.isPending} className="btn-purple border-0">Record payment</Button>}
          {invoice.status !== "paid" && invoice.status !== "void" && <Button variant="outline" onClick={() => run("void")} disabled={action.isPending}>Void invoice</Button>}
        </div>
      </main>
    </>
  );
}
