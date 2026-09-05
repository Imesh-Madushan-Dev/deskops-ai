import "server-only";

type Automation = { autoApproveReplies?: unknown; autoApproveInvoices?: unknown };

/** When true, the agent's plain-text replies are sent to the customer without owner approval. */
export function readAutoReply(settings: unknown): boolean {
  return (settings as { automation?: Automation } | null)?.automation?.autoApproveReplies === true;
}

/** When true, invoices the agent drafts are sent to the customer without owner approval. */
export function readAutoInvoice(settings: unknown): boolean {
  return (settings as { automation?: Automation } | null)?.automation?.autoApproveInvoices === true;
}
