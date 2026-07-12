import "server-only";

import { z } from "zod";
import { getCurrentBusiness } from "@/lib/db/auth";

export async function listConversations() {
  const { supabase, business } = await getCurrentBusiness();
  const { data, error } = await supabase
    .from("conversations")
    .select("*, customers(name, whatsapp_number)")
    .eq("business_id", business.id)
    .order("last_message_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return data;
}

export async function getConversation(id: string) {
  const { supabase, business } = await getCurrentBusiness();
  const [conversation, messages] = await Promise.all([
    supabase.from("conversations").select("*, customers(name, whatsapp_number)").eq("business_id", business.id).eq("id", id).maybeSingle(),
    supabase.from("messages").select("*").eq("business_id", business.id).eq("conversation_id", id).order("created_at"),
  ]);
  if (conversation.error) throw conversation.error;
  if (messages.error) throw messages.error;
  if (!conversation.data) return null;
  return { ...conversation.data, messages: messages.data };
}

export const outboundMessageSchema = z.object({ body: z.string().trim().min(1).max(4000) });

/** Owner replies from the dashboard write straight to messages; outbound WhatsApp sends still go through the approval gate. */
export async function recordOwnerMessage(conversationId: string, body: string) {
  const { supabase, business } = await getCurrentBusiness();
  const { data, error } = await supabase
    .from("messages")
    .insert({ business_id: business.id, conversation_id: conversationId, direction: "outbound", sender: "owner", body })
    .select()
    .single();
  if (error) throw error;
  await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("business_id", business.id).eq("id", conversationId);
  return data;
}

export async function setConversationStatus(id: string, status: "open" | "snoozed" | "closed") {
  const { supabase, business } = await getCurrentBusiness();
  const { error } = await supabase.from("conversations").update({ status }).eq("business_id", business.id).eq("id", id);
  if (error) throw error;
}
