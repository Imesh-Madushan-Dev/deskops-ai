"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageIntro, PageShell } from "@/components/dashboard/ui";
import { useCustomer, useDeleteCustomer } from "@/lib/query/customers";
import { useDashboardOverview } from "@/lib/query/dashboard";
import { contactLabel } from "@/lib/utils/contact";
import { formatMoney } from "@/lib/utils/money";

export function CustomerDetailView({ customerId }: { customerId: string }) {
  const router = useRouter();
  const { data: customer, isLoading } = useCustomer(customerId);
  const { data: overview } = useDashboardOverview();
  const deleteCustomer = useDeleteCustomer();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currency = overview?.business.currency ?? "LKR";

  if (isLoading) return <main className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">Loading…</main>;
  if (!customer) return <main className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">Customer not found.</main>;

  async function handleDelete() {
    setError(null);
    try {
      await deleteCustomer.mutateAsync(customerId);
      router.push("/dashboard/customers");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete customer.");
    }
  }

  return (
    <PageShell
      crumbs={[{ label: "Customers", href: "/dashboard/customers" }, customer.name ?? "Customer"]}
      width="max-w-3xl"
      actions={overview?.isOwner ? (
        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setConfirmOpen(true)}>
          <HugeiconsIcon icon={Delete02Icon} size={16} /> Delete
        </Button>
      ) : undefined}
    >
      <PageIntro eyebrow={contactLabel({ whatsapp_number: customer.whatsapp_number })} title={customer.name ?? "Unnamed customer"} description={customer.notes ?? "No notes yet."} />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete this customer?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            This permanently deletes <span className="font-medium text-foreground">{customer.name ?? contactLabel({ whatsapp_number: customer.whatsapp_number })}</span> and all their conversations, messages, invoices, and ledger records. This cannot be undone.
          </p>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={deleteCustomer.isPending}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteCustomer.isPending}>{deleteCustomer.isPending ? "Deleting…" : "Delete permanently"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </PageShell>
  );
}
