import { getCurrentBusiness } from "@/lib/db/auth";
import { readAutoReply } from "@/lib/db/settings";

export async function getDashboardOverview() {
  const { supabase, business } = await getCurrentBusiness();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [conversations, approvals, products, invoices] = await Promise.all([
    supabase.from("conversations").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("status", "open").eq("awaiting_reply", true),
    supabase.from("approvals").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("status", "pending"),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("business_id", business.id).lte("stock_qty", 0),
    supabase.from("invoices").select("total").eq("business_id", business.id).eq("status", "paid").gte("created_at", today.toISOString()),
  ]);
  for (const result of [conversations, approvals, products, invoices]) if (result.error) throw result.error;
  const salesToday = (invoices.data ?? []).reduce((sum, invoice) => sum + Number(invoice.total), 0);
  return {
    business: { ...business, whatsappSession: business.whatsapp_session, whatsappConnected: Boolean(business.whatsapp_session), autoApproveReplies: readAutoReply(business.settings) },
    conversations: conversations.count ?? 0,
    approvals: approvals.count ?? 0,
    lowStock: products.count ?? 0,
    salesToday,
  };
}
