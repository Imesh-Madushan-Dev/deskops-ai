"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeaderBar, PageTitle } from "@/components/dashboard/PageHeader";
import { useInvoices } from "@/lib/query/invoices";
import { useDashboardOverview } from "@/lib/query/dashboard";
import { formatMoney } from "@/lib/utils/money";

const statusVariant: Record<string, "secondary" | "outline" | "default" | "destructive"> = { draft: "outline", sent: "secondary", paid: "default", void: "destructive" };

export default function InvoicesPage() {
  const { data: invoices, isLoading } = useInvoices();
  const { data: overview } = useDashboardOverview();
  const currency = overview?.business.currency ?? "LKR";

  return (
    <>
      <PageHeaderBar title="Invoices" />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-10">
        <PageTitle
          eyebrow="Sales desk"
          title="Invoices"
          description="Draft, approve, and track every invoice from a single ledger-backed view."
          action={<Link href="/dashboard/invoices/new"><Button className="btn-purple h-10 rounded-md border-0 px-4"><HugeiconsIcon icon={Add01Icon} size={17} /> New invoice</Button></Link>}
        />

        <Card className="mt-8 border-border/80">
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Number</TableHead><TableHead>Customer</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">Loading…</TableCell></TableRow>}
                {!isLoading && invoices?.length === 0 && <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">No invoices yet.</TableCell></TableRow>}
                {invoices?.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium"><Link href={`/dashboard/invoices/${invoice.id}`} className="hover:text-primary">{invoice.number}</Link></TableCell>
                    <TableCell className="text-muted-foreground">{invoice.customers?.name ?? invoice.customers?.whatsapp_number ?? "—"}</TableCell>
                    <TableCell>{formatMoney(invoice.total, currency)}</TableCell>
                    <TableCell><Badge variant={statusVariant[invoice.status]} className="capitalize">{invoice.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
