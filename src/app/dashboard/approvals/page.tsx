"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, CheckmarkCircle02Icon, InvoiceIcon, ShieldIcon, Tick02Icon, WhatsappIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { useApprovals, useDecideApproval } from "@/lib/query/approvals";
import { useDashboardOverview } from "@/lib/query/dashboard";
import { useUpdateBusiness } from "@/lib/query/settings";
import { approvalMeta, describeApproval, EmptyState, PageIntro, PageShell, Panel, relativeTime, StatusPill } from "@/components/dashboard/ui";

export default function ApprovalsPage() {
  const { data: approvals, isLoading } = useApprovals();
  const { data: overview } = useDashboardOverview();
  const decide = useDecideApproval();
  const updateBusiness = useUpdateBusiness();
  const autoReply = overview?.business.autoApproveReplies ?? false;
  const autoInvoice = overview?.business.autoApproveInvoices ?? false;
  const pending = approvals ?? [];
  // Captured once per mount — precise enough for a 4-hour expiry warning.
  const [now] = useState(() => Date.now());

  return (
    <PageShell crumbs={["Approvals"]} width="max-w-4xl">
      <PageIntro
        eyebrow="Human in the loop"
        title="Approvals"
        description="Every money or message action the agents draft stops here. Nothing reaches a customer until you tap approve."
        action={pending.length > 0 ? <StatusPill tone="warn" dot={false} className="px-3 py-1 text-sm">{pending.length} waiting</StatusPill> : <StatusPill tone="ok" dot={false} className="px-3 py-1 text-sm">All clear</StatusPill>}
      />

      <Panel title="Autopilot" sub="Choose which actions may skip the queue — money actions can always be held.">
        <div className="divide-y divide-border/60">
          <div className="flex items-center gap-4 px-5 py-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><HugeiconsIcon icon={WhatsappIcon} size={19} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Auto-reply to customer messages</p>
              <p className="text-xs text-muted-foreground">The agent answers customers automatically, without waiting for you.</p>
            </div>
            <Switch checked={autoReply} disabled={updateBusiness.isPending || !overview} onCheckedChange={(checked) => updateBusiness.mutate({ autoApproveReplies: checked })} aria-label="Toggle auto-reply" />
          </div>
          <div className="flex items-center gap-4 px-5 py-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><HugeiconsIcon icon={InvoiceIcon} size={19} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Auto-send invoices</p>
              <p className="text-xs text-muted-foreground">When off, agent-drafted invoices wait here before they reach the customer.</p>
            </div>
            <Switch checked={autoInvoice} disabled={updateBusiness.isPending || !overview} onCheckedChange={(checked) => updateBusiness.mutate({ autoApproveInvoices: checked })} aria-label="Toggle auto-send invoices" />
          </div>
        </div>
      </Panel>

      <div className="mt-6 space-y-4">
        {decide.isError && (
          <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {decide.error instanceof Error ? decide.error.message : "Action failed."}
          </p>
        )}
        {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && pending.length === 0 && (
          <Panel>
            <EmptyState
              icon={CheckmarkCircle02Icon}
              title={autoReply ? "Auto-reply is on" : "Nothing pending"}
              hint={autoReply ? "Replies send without waiting here — money actions will still stop for approval." : "You're all caught up. New drafts appear here in real time."}
            />
          </Panel>
        )}
        {pending.map((approval) => {
          const meta = approvalMeta[approval.action_type] ?? { label: approval.action_type, icon: CheckmarkCircle02Icon };
          const expiresSoon = new Date(approval.expires_at).getTime() - now < 4 * 3600_000;
          return (
            <Panel key={approval.id}>
              <div className="p-5">
                <div className="flex items-start gap-3.5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><HugeiconsIcon icon={meta.icon} size={19} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill tone="brand" dot={false}>{meta.label}</StatusPill>
                      <span className="text-xs text-muted-foreground">requested {relativeTime(approval.created_at)}</span>
                      {expiresSoon && <StatusPill tone="warn" dot={false}>expires {relativeTime(approval.expires_at)}</StatusPill>}
                    </div>
                    <p className="mt-2.5 rounded-xl border border-border/60 bg-muted/30 px-3.5 py-2.5 text-sm leading-6 whitespace-pre-wrap text-foreground/90">{describeApproval(approval.payload)}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2.5 sm:pl-13.5">
                  <Button disabled={decide.isPending} onClick={() => decide.mutate({ id: approval.id, action: "approve" })} className="btn-purple h-9 rounded-lg border-0 px-4">
                    {decide.isPending ? <Spinner /> : <HugeiconsIcon icon={Tick02Icon} size={16} />} Approve &amp; send
                  </Button>
                  <Button variant="outline" disabled={decide.isPending} onClick={() => decide.mutate({ id: approval.id, action: "reject" })} className="h-9 rounded-lg px-4">
                    <HugeiconsIcon icon={Cancel01Icon} size={16} /> Reject
                  </Button>
                  <span className="ml-auto hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:flex"><HugeiconsIcon icon={ShieldIcon} size={13} /> Idempotent — safe to retry</span>
                </div>
              </div>
            </Panel>
          );
        })}
      </div>
    </PageShell>
  );
}
