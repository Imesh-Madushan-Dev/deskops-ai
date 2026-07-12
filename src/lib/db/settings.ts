import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/** Reads businesses.settings.automation.autoApproveReplies. When true, the agent's plain-text
 *  replies are sent to the customer without owner approval (money actions still gate). */
export function readAutoReply(settings: unknown): boolean {
  return (settings as { automation?: { autoApproveReplies?: unknown } } | null)?.automation?.autoApproveReplies === true;
}

export async function isAutoReplyEnabled(businessId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("businesses").select("settings").eq("id", businessId).single();
  return readAutoReply(data?.settings);
}
