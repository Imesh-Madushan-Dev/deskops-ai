"use client";

import Link from "next/link";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { StatusPill } from "@/components/dashboard/ui";
import { useCustomer, useDeleteCustomer } from "@/lib/query/customers";
import { useDashboardOverview } from "@/lib/query/dashboard";
import { contactLabel } from "@/lib/utils/contact";
import { formatMoney } from "@/lib/utils/money";
import { relativeTime } from "@/components/dashboard/ui";

const invoiceTone = { draft: "neutral", sent: "brand", paid: "ok", void: "bad" } as const;

export function CustomerSheet({ customerId, onClose }: { customerId: string | null; onClose: () => void }) {
  return (
    <Sheet open={Boolean(customerId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-xl">
        {customerId && <CustomerBody customerId={customerId} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  );
}

function CustomerBody({ customerId, onClose }: { customerId: string; onClose: () => void }) {
  const { data: customer, isLoading } = useCustomer(customerId);
  const { data: overview } = useDashboardOverview();
  const deleteCustomer = useDeleteCustomer();
  const currency = overview?.business.currency ?? "LKR";

  async function handleDelete() {
    try {
      await deleteCustomer.mutateAsync(customerId);
      toast.success("Customer deleted");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't delete the customer.");
    }
  }

  if (isLoading) {
    return (
      <>
        <SheetHeader>
          <SheetTitle>Customer</SheetTitle>
          <SheetDescription>Loading…</SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">
          <Spinner />
        </div>
      </>
    );
  }

  if (!customer) {
    return (
      <SheetHeader>
        <SheetTitle>Customer not found</SheetTitle>
        <SheetDescription>It may have been deleted.</SheetDescription>
      </SheetHeader>
    );
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>{customer.name ?? "Unnamed customer"}</SheetTitle>
        <SheetDescription>
          {contactLabel({ whatsapp_number: customer.whatsapp_number })}
          {customer.email ? ` · ${customer.email}` : ""}
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 space-y-5 px-4">
        {customer.notes && <p className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm">{customer.notes}</p>}

        <section>
          <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Conversations</h3>
          <div className="divide-y divide-border/60 rounded-lg border border-border/70">
            {customer.conversations.length === 0 && <p className="px-3 py-3 text-sm text-muted-foreground">No conversations yet.</p>}
            {customer.conversations.map((conversation) => (
              <Link
                key={conversation.id}
                href={`/dashboard/inbox?c=${conversation.id}`}
                className="flex items-center justify-between px-3 py-2.5 text-sm hover:bg-muted/40"
              >
                <span className="capitalize">{conversation.status}</span>
                <span className="text-xs text-muted-foreground">{relativeTime(conversation.last_message_at)}</span>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Invoices</h3>
          <div className="divide-y divide-border/60 rounded-lg border border-border/70">
            {customer.invoices.length === 0 && <p className="px-3 py-3 text-sm text-muted-foreground">No invoices yet.</p>}
            {customer.invoices.map((invoice) => (
              <Link
                key={invoice.id}
                href={`/dashboard/invoices?invoice=${invoice.id}`}
                className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm hover:bg-muted/40"
              >
                <span className="font-mono">{invoice.number}</span>
                <span className="flex items-center gap-3">
                  <span className="font-mono tabular-nums">{formatMoney(invoice.total, currency)}</span>
                  <StatusPill tone={invoiceTone[invoice.status as keyof typeof invoiceTone] ?? "neutral"} dot={false}>
                    {invoice.status}
                  </StatusPill>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {overview?.isOwner && (
        <SheetFooter>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={deleteCustomer.isPending}>
                {deleteCustomer.isPending ? <Spinner /> : <HugeiconsIcon icon={Delete02Icon} size={16} />}
                Delete customer
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this customer?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes {customer.name ?? contactLabel({ whatsapp_number: customer.whatsapp_number })} and all their conversations, messages,
                  invoices, and ledger records. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={handleDelete}>
                  Delete permanently
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </SheetFooter>
      )}
    </>
  );
}
