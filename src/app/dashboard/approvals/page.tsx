"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeaderBar, PageTitle } from "@/components/dashboard/PageHeader";
import { useApprovals, useDecideApproval } from "@/lib/query/approvals";

const actionLabel: Record<string, string> = {
  send_message: "Send WhatsApp reply",
  send_invoice: "Send invoice",
  mark_invoice_paid: "Mark invoice paid",
  reorder: "Create reorder",
};

export default function ApprovalsPage() {
  const { data: approvals, isLoading } = useApprovals();
  const decide = useDecideApproval();

  return (
    <>
      <PageHeaderBar title="Approvals" />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-8 sm:py-10">
        <PageTitle eyebrow={`${approvals?.length ?? 0} waiting for you`} title="Approvals" description="Nothing leaves Deskops until you give the go-ahead." />

        <div className="mt-8 space-y-4">
          {decide.isError && (
            <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {decide.error instanceof Error ? decide.error.message : "Action failed."}
            </p>
          )}
          {isLoading && <p className="text-center text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && approvals?.length === 0 && (
            <Card className="border-border/80"><CardContent className="py-16 text-center text-sm text-muted-foreground">Nothing pending — you&apos;re all caught up.</CardContent></Card>
          )}
          {approvals?.map((approval) => (
            <Card key={approval.id} className="overflow-hidden border-primary/20">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Badge className="rounded-md bg-primary/10 text-primary hover:bg-primary/10">{actionLabel[approval.action_type] ?? approval.action_type}</Badge>
                    <p className="mt-3 text-sm text-muted-foreground">{describePayload(approval.payload)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Requested {new Date(approval.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button disabled={decide.isPending} onClick={() => decide.mutate({ id: approval.id, action: "approve" })} className="btn-purple h-10 rounded-md border-0 px-5">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={17} /> Approve
                  </Button>
                  <Button variant="outline" disabled={decide.isPending} onClick={() => decide.mutate({ id: approval.id, action: "reject" })} className="h-10 rounded-md px-5">
                    <HugeiconsIcon icon={Cancel01Icon} size={17} /> Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}

function describePayload(payload: Record<string, unknown>) {
  if (typeof payload.body === "string") return payload.body;
  if (typeof payload.invoiceId === "string") return `Invoice ${payload.invoiceId}`;
  return JSON.stringify(payload);
}
