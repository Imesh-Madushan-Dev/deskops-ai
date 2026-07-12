import "server-only";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getCurrentBusiness, requireUser } from "@/lib/db/auth";
import { markInvoiceSent, recordSale } from "@/lib/db/invoices";
import { createReorder } from "@/lib/db/inventory";
import { sendWhatsappMessage } from "@/lib/waha/client";
import type { Json } from "@/types/database";

const sendMessagePayload = z.object({ conversationId: z.string().uuid(), chatId: z.string(), body: z.string() });
const sendInvoicePayload = z.object({ conversationId: z.string().uuid(), chatId: z.string(), invoiceId: z.string().uuid(), body: z.string() });
const markInvoicePaidPayload = z.object({ invoiceId: z.string().uuid() });
const reorderPayload = z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1) });

export type ApprovalActionType = "send_message" | "send_invoice" | "mark_invoice_paid" | "reorder";

export async function listApprovals(status: "pending" | "approved" | "rejected" | "expired" | "executed" | "failed" = "pending") {
  const { supabase, business } = await getCurrentBusiness();
  const { data, error } = await supabase.from("approvals").select("*").eq("business_id", business.id).eq("status", status).order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** Called by the agent layer to queue a money/message action — nothing here executes until an owner approves it. */
export async function createApproval(input: { actionType: ApprovalActionType; payload: Record<string, Json>; conversationId?: string | null; idempotencyKey?: string }, override?: { businessId: string }) {
  const { supabase, business } = await getCurrentBusiness(override);
  const { data, error } = await supabase
    .from("approvals")
    .insert({
      business_id: business.id,
      conversation_id: input.conversationId ?? null,
      action_type: input.actionType,
      payload: input.payload,
      idempotency_key: input.idempotencyKey ?? randomUUID(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function rejectApproval(id: string) {
  const { supabase, business, userId } = await requireUserBusiness();
  const { error } = await supabase
    .from("approvals")
    .update({ status: "rejected", decided_by: userId, decided_at: new Date().toISOString() })
    .eq("business_id", business.id)
    .eq("id", id)
    .eq("status", "pending");
  if (error) throw error;
}

/** One-tap owner approval: executes synchronously and idempotently — no job queue needed for this fast, user-initiated path. */
export async function approveApproval(id: string) {
  const { supabase, business, userId } = await requireUserBusiness();

  const { data: approval, error: fetchError } = await supabase.from("approvals").select("*").eq("business_id", business.id).eq("id", id).single();
  if (fetchError) throw fetchError;
  if (approval.status !== "pending") return approval;
  if (new Date(approval.expires_at) < new Date()) {
    await supabase.from("approvals").update({ status: "expired" }).eq("id", id);
    throw new Error("This approval has expired.");
  }

  const { error: claimError } = await supabase
    .from("approvals")
    .update({ status: "approved", decided_by: userId, decided_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending");
  if (claimError) throw claimError;

  try {
    await executeApproval(approval.action_type as ApprovalActionType, approval.payload, business);
    const { data: executed, error: executedError } = await supabase.from("approvals").update({ status: "executed" }).eq("id", id).select().single();
    if (executedError) throw executedError;
    return executed;
  } catch (error) {
    await supabase.from("approvals").update({ status: "failed" }).eq("id", id);
    throw error;
  }
}

async function executeApproval(actionType: ApprovalActionType, payload: unknown, business: { id: string; whatsapp_session: string | null }) {
  const { supabase } = await getCurrentBusiness();

  if (actionType === "send_message") {
    const { conversationId, chatId, body } = sendMessagePayload.parse(payload);
    const result = await sendWhatsappMessage(business.whatsapp_session ?? "default", chatId, body);
    const { error } = await supabase
      .from("messages")
      .insert({ business_id: business.id, conversation_id: conversationId, direction: "outbound", sender: "agent", body, provider_message_id: result.sent ? result.providerMessageId : null });
    if (error) throw error;
    await supabase.from("conversations").update({ last_message_at: new Date().toISOString(), awaiting_reply: false }).eq("id", conversationId);
    return;
  }

  if (actionType === "send_invoice") {
    const { conversationId, chatId, invoiceId, body } = sendInvoicePayload.parse(payload);
    await markInvoiceSent(invoiceId);
    const result = await sendWhatsappMessage(business.whatsapp_session ?? "default", chatId, body);
    const { error } = await supabase
      .from("messages")
      .insert({ business_id: business.id, conversation_id: conversationId, direction: "outbound", sender: "agent", body, provider_message_id: result.sent ? result.providerMessageId : null });
    if (error) throw error;
    return;
  }

  if (actionType === "mark_invoice_paid") {
    const { invoiceId } = markInvoicePaidPayload.parse(payload);
    await recordSale(invoiceId);
    return;
  }

  if (actionType === "reorder") {
    const { productId, quantity } = reorderPayload.parse(payload);
    await createReorder({ productId, quantity });
    return;
  }
}

async function requireUserBusiness() {
  const { userId } = await requireUser();
  const { supabase, business } = await getCurrentBusiness();
  return { supabase, business, userId };
}
