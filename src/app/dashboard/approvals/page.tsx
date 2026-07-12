"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon, Cancel01Icon, InvoiceIcon, PackageIcon, WhatsappIcon, AiBrain01Icon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { PageHeaderBar, PageTitle } from "@/components/dashboard/PageHeader";
import { useApprovals, useDecideApproval } from "@/lib/query/approvals";
import { useDashboardOverview } from "@/lib/query/dashboard";
import { useUpdateBusiness } from "@/lib/query/settings";

const actionMeta: Record<string, { label: string; icon: typeof InvoiceIcon }> = {
  send_message: { label: "WhatsApp reply", icon: WhatsappIcon },
  send_invoice: { label: "Send invoice", icon: InvoiceIcon },
  mark_invoice_paid: { label: "Mark invoice paid", icon: InvoiceIcon },
  reorder: { label: "Create reorder", icon: PackageIcon },
};

export default function ApprovalsPage() {
  const { data: approvals, isLoading } = useApprovals();
  const { data: overview } = useDashboardOverview();
  const decide = useDecideApproval();
  const updateBusiness = useUpdateBusiness();
  const autoReply = overview?.business.autoApproveReplies ?? false;

  return (
    <>
      <PageHeaderBar title="Approvals" />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-8 sm:py-10">
        <PageTitle eyebrow={`${approvals?.length ?? 0} waiting for you`} title="Approvals" description="Nothing leaves Deskops until you give the go-ahead." />

        <Card className="mt-8 border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-4 p-5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><HugeiconsIcon icon={AiBrain01Icon} size={20} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Auto-reply to customer messages</p>
              <p className="text-xs text-muted-foreground">When on, the agent replies to customers automatically. Invoices and money actions always wait for you.</p>
            </div>
            <Switch
              checked={autoReply}
              disabled={updateBusiness.isPending || !overview}
              onCheckedChange={(checked) => updateBusiness.mutate({ autoApproveReplies: checked })}
              aria-label="Toggle auto-reply"
            />
          </CardContent>
        </Card>

        <div className="mt-6 space-y-4">
          {decide.isError && (
            <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {decide.error instanceof Error ? decide.error.message : "Action failed."}
            </p>
          )}
          {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && approvals?.length === 0 && (
            <Card className="border-border/80"><CardContent className="py-16 text-center text-sm text-muted-foreground">
              {autoReply ? "Auto-reply is on — replies send without waiting here. Money actions will still appear for approval." : "Nothing pending — you're all caught up."}
            </CardContent></Card>
          )}
          {approvals?.map((approval) => {
            const meta = actionMeta[approval.action_type] ?? { label: approval.action_type, icon: CheckmarkCircle02Icon };
            return (
              <Card key={approval.id} className="overflow-hidden border-border/80">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><HugeiconsIcon icon={meta.icon} size={19} /></span>
                    <div className="min-w-0 flex-1">
                      <Badge className="rounded-md bg-primary/10 text-primary hover:bg-primary/10">{meta.label}</Badge>
                      <p className="mt-2.5 text-sm text-foreground/90">{describePayload(approval.payload)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Requested {new Date(approval.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3 pl-0 sm:pl-13">
                    <Button disabled={decide.isPending} onClick={() => decide.mutate({ id: approval.id, action: "approve" })} className="btn-purple h-10 rounded-md border-0 px-5">
                      {decide.isPending ? <Spinner /> : <HugeiconsIcon icon={CheckmarkCircle02Icon} size={17} />} Approve &amp; send
                    </Button>
                    <Button variant="outline" disabled={decide.isPending} onClick={() => decide.mutate({ id: approval.id, action: "reject" })} className="h-10 rounded-md px-5">
                      <HugeiconsIcon icon={Cancel01Icon} size={17} /> Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
