"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { StatusPill } from "@/components/dashboard/ui";
import { useInvoice, useInvoiceAction } from "@/lib/query/invoices";
import { useDashboardOverview } from "@/lib/query/dashboard";
import { formatMoney } from "@/lib/utils/money";
import { contactLabel } from "@/lib/utils/contact";

const statusTone = { draft: "neutral", sent: "brand", paid: "ok", void: "bad" } as const;

/** Keyed on the invoice id by the caller so switching rows remounts with fresh data. */
export function InvoiceSheet({ invoiceId, onClose }: { invoiceId: string | null; onClose: () => void }) {
  return (
    <Sheet open={Boolean(invoiceId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-xl">
        {invoiceId && <InvoiceBody invoiceId={invoiceId} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  );
}

function InvoiceBody({ invoiceId, onClose }: { invoiceId: string; onClose: () => void }) {
  const { data: invoice, isLoading } = useInvoice(invoiceId);
  const { data: overview } = useDashboardOverview();
  const action = useInvoiceAction(invoiceId);
  const currency = overview?.business.currency ?? "LKR";

  async function run(next: "send" | "record_sale" | "void", done: string) {
    try {
      await action.mutateAsync(next);
      toast.success(done);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't update the invoice.");
    }
  }

  if (isLoading) {
    return (
      <>
        <SheetHeader>
          <SheetTitle>Invoice</SheetTitle>
          <SheetDescription>Loading…</SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">
          <Spinner />
        </div>
      </>
    );
  }

  if (!invoice) {
    return (
      <SheetHeader>
        <SheetTitle>Invoice not found</SheetTitle>
        <SheetDescription>It may have been deleted.</SheetDescription>
      </SheetHeader>
    );
  }

  const open = invoice.status !== "paid" && invoice.status !== "void";

  return (
    <>
      <SheetHeader>
        <div className="flex items-center justify-between gap-3">
          <SheetTitle className="font-mono">{invoice.number}</SheetTitle>
          <StatusPill tone={statusTone[invoice.status]} dot={false}>
            {invoice.status}
          </StatusPill>
        </div>
        <SheetDescription>
          {contactLabel(invoice.customers)} · acting here is the human-in-the-loop step, so no separate approval is needed.
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 px-4">
        <div className="divide-y divide-border/60 rounded-lg border border-border/70">
          {invoice.items.map((item) => (
            <div key={item.id} className="flex items-baseline gap-3 px-3 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.description}</p>
                <p className="text-xs text-muted-foreground">
                  {item.quantity} × {formatMoney(item.unit_price, currency)}
                </p>
              </div>
              <span className="shrink-0 font-mono tabular-nums">{formatMoney(item.line_total, currency)}</span>
            </div>
          ))}
        </div>

        <dl className="mt-4 space-y-1.5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <dt>Subtotal</dt>
            <dd className="font-mono tabular-nums">{formatMoney(invoice.subtotal, currency)}</dd>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <dt>Tax</dt>
            <dd className="font-mono tabular-nums">{formatMoney(invoice.tax, currency)}</dd>
          </div>
          <div className="flex justify-between border-t border-border/70 pt-1.5 font-medium">
            <dt>Total</dt>
            <dd className="font-mono tabular-nums">{formatMoney(invoice.total, currency)}</dd>
          </div>
        </dl>
      </div>

      <SheetFooter className="flex-row flex-wrap gap-2">
        {invoice.status === "draft" && (
          <Button onClick={() => run("send", "Marked as sent")} disabled={action.isPending} className="btn-purple border-0">
            {action.isPending && <Spinner />}
            Mark sent
          </Button>
        )}
        {open && (
          <Button onClick={() => run("record_sale", "Payment recorded")} disabled={action.isPending} className="btn-purple border-0">
            Record payment
          </Button>
        )}
        {open && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              {/* Voiding writes a reversing entry to the ledger and can't be undone — colour it that way. */}
              <Button variant="destructive" disabled={action.isPending} className="ml-auto">
                Void invoice
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Void {invoice.number}?</AlertDialogTitle>
                <AlertDialogDescription>
                  The invoice stays on record as void and the ledger is reversed. This can&apos;t be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-white hover:bg-destructive/90"
                  onClick={() => {
                    void run("void", `${invoice.number} voided`).then(onClose);
                  }}
                >
                  Void invoice
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </SheetFooter>
    </>
  );
}
