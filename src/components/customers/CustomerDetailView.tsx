"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeaderBar, PageTitle } from "@/components/dashboard/PageHeader";
import { useCustomer } from "@/lib/query/customers";
import { useDashboardOverview } from "@/lib/query/dashboard";
import { contactLabel } from "@/lib/utils/contact";
import { formatMoney } from "@/lib/utils/money";

export function CustomerDetailView({ customerId }: { customerId: string }) {
  const { data: customer, isLoading } = useCustomer(customerId);
  const { data: overview } = useDashboardOverview();
  const currency = overview?.business.currency ?? "LKR";

  if (isLoading) return <main className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">Loading…</main>;
  if (!customer) return <main className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">Customer not found.</main>;

  return (
    <>
      <PageHeaderBar title="Customer" backHref="/dashboard/customers" />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-8 sm:py-10">
        <PageTitle eyebrow={contactLabel({ whatsapp_number: customer.whatsapp_number })} title={customer.name ?? "Unnamed customer"} description={customer.notes ?? "No notes yet."} />

        <section className="mt-8 grid gap-7 lg:grid-cols-2">
          <Card className="border-border/80">
            <CardContent className="p-0">
              <div className="border-b border-border/70 px-5 py-4"><h2 className="font-semibold">Invoices</h2></div>
              <div className="divide-y divide-border/70">
                {customer.invoices.length === 0 && <p className="px-5 py-6 text-sm text-muted-foreground">No invoices yet.</p>}
                {customer.invoices.map((invoice) => (
                  <Link key={invoice.id} href={`/dashboard/invoices/${invoice.id}`} className="flex items-center justify-between px-5 py-3 text-sm hover:bg-muted/40">
                    <span>{invoice.number}</span>
                    <span className="flex items-center gap-3"><span>{formatMoney(invoice.total, currency)}</span><Badge variant="outline" className="capitalize">{invoice.status}</Badge></span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardContent className="p-0">
              <div className="border-b border-border/70 px-5 py-4"><h2 className="font-semibold">Conversations</h2></div>
              <div className="divide-y divide-border/70">
                {customer.conversations.length === 0 && <p className="px-5 py-6 text-sm text-muted-foreground">No conversations yet.</p>}
                {customer.conversations.map((conversation) => (
                  <Link key={conversation.id} href={`/dashboard/inbox/${conversation.id}`} className="flex items-center justify-between px-5 py-3 text-sm hover:bg-muted/40">
                    <span className="capitalize">{conversation.status}</span>
                    <span className="text-muted-foreground">{conversation.last_message_at ? new Date(conversation.last_message_at).toLocaleDateString() : "—"}</span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  );
}
