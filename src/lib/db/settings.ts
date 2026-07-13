import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type Automation = { autoApproveReplies?: unknown; autoApproveInvoices?: unknown };

/** When true, the agent's plain-text replies are sent to the customer without owner approval. */
export function readAutoReply(settings: unknown): boolean {
  return (settings as { automation?: Automation } | null)?.automation?.autoApproveReplies === true;
}

/** When true, invoices the agent drafts are sent to the customer without owner approval. */
export function readAutoInvoice(settings: unknown): boolean {
  return (settings as { automation?: Automation } | null)?.automation?.autoApproveInvoices === true;
}

export async function isAutoReplyEnabled(businessId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("businesses").select("settings").eq("id", businessId).single();
  return readAutoReply(data?.settings);
}

export async function isAutoInvoiceEnabled(businessId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("businesses").select("settings").eq("id", businessId).single();
  return readAutoInvoice(data?.settings);
}
