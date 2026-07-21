import { tool } from "ai";
import { z } from "zod";
import { getCurrentBusiness } from "@/lib/db/auth";
import { createInvoice } from "@/lib/db/invoices";
import { createApproval } from "@/lib/db/approvals";
import { formatMoney } from "@/lib/utils/money";
import { contactLabel } from "@/lib/utils/contact";
import { sendWhatsappImage } from "@/lib/waha/client";
import type { ConversationToolContext } from "./context";

export function createSalesTools(context: ConversationToolContext) {
  const draftAndQueueInvoice = tool({
    description: "Draft an invoice for the items discussed and queue it for the owner's approval before sending to the customer. Prices/totals are computed from the real catalog, never invented.",
    inputSchema: z.object({
      customerId: z.string().uuid().optional().describe("Existing customer id if known"),
      items: z
        .array(z.object({ productId: z.string().uuid().optional(), description: z.string(), quantity: z.number().int().min(1), unitPrice: z.number().min(0) }))
        .min(1),
      customerMessage: z
        .string()
        .min(1)
        .max(2000)
        .optional()
        .describe("A SHORT friendly intro line in the customer's own language (e.g. 'Here's your invoice 😊'). Do NOT include the price, total, or invoice number — those are appended automatically and correctly formatted. Do NOT wrap numbers in asterisks."),
    }),
    execute: async ({ customerId, items, customerMessage }) => {
      const { supabase, business } = await getCurrentBusiness(context.businessOverride);

      // Idempotency: a customer confirming ("ok", "yes") must NOT spawn a second invoice. If we already
      // drafted one for this chat recently, return it instead of creating a duplicate.
      // ponytail: 15-min window; widen/narrow only if genuine separate orders in one chat need it.
      const since = new Date(Date.now() - 15 * 60_000).toISOString();
      const { data: recent } = await supabase
        .from("approvals")
        .select("payload")
        .eq("business_id", business.id)
        .eq("conversation_id", context.conversationId)
        .eq("action_type", "send_invoice")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (recent) {
        const existingId = (recent.payload as { invoiceId?: string }).invoiceId;
        const { data: existing } = existingId ? await supabase.from("invoices").select("number, total").eq("id", existingId).maybeSingle() : { data: null };
        return {
          status: "already_drafted" as const,
          invoiceNumber: existing?.number,
          note: "An invoice was already drafted for this chat and is being handled. Do NOT create another. Just reassure the customer their order is confirmed — no new invoice, no repeating the price.",
        };
      }

      // Stock guard: never draft an invoice for more than we actually have. The model must tell the
      // customer the real available quantity BEFORE any invoice — not invoice 100 when 60 are in stock.
      const productIds = items.map((i) => i.productId).filter((id): id is string => Boolean(id));
      if (productIds.length) {
        const { data: stockRows } = await supabase.from("products").select("id, name, stock_qty").eq("business_id", business.id).in("id", productIds);
        const stockById = new Map((stockRows ?? []).map((p) => [p.id, p]));
        const shortfalls = items
          .filter((i) => i.productId && (stockById.get(i.productId)?.stock_qty ?? 0) < i.quantity)
          .map((i) => ({ product: stockById.get(i.productId!)?.name ?? i.description, requested: i.quantity, available: stockById.get(i.productId!)?.stock_qty ?? 0 }));
        if (shortfalls.length) {
          return {
            status: "insufficient_stock" as const,
            shortfalls,
            note: "Do NOT create this invoice. Tell the customer the exact available quantity for each item below, and ask if they'd like that quantity instead — or offer to request more from the owner with escalateToOwner. Never invoice more than the available stock.",
          };
        }
      }

      const invoice = await createInvoice({ customerId: customerId ?? null, items, taxRate: 0 }, context.businessOverride);
      const friendly = customerMessage?.trim() || "Here's your quote — reply to confirm and we'll get it ready.";
      // The model writes customerMessage BEFORE the invoice exists, so it can't include the number; and
      // its own *bold* often breaks (e.g. Sinhala suffixes glued to a closing *). Append the number and
      // total deterministically so both always render correctly — money formatting stays in code.
      // The invoice is sent as a formatted image; `caption` is the friendly line shown with it, and
      // `body` is the plain-text fallback (WAHA off / image render fails) — both carry number + total.
      const body = `${friendly}\n\n🧾 ${invoice.number} · ${formatMoney(invoice.total, business.currency)}`;
      const approval = await createApproval(
        {
          actionType: "send_invoice",
          conversationId: context.conversationId,
          payload: { conversationId: context.conversationId, chatId: context.chatId, invoiceId: invoice.id, caption: friendly, body },
        },
        context.businessOverride,
      );
      return {
        invoiceNumber: invoice.number,
        total: invoice.total,
        approvalId: approval.id,
        status: "awaiting_owner_approval" as const,
        note: `Invoice ${invoice.number} was drafted and its full message (with number and total) is being sent/queued automatically. Do NOT write the invoice details, number, or price yourself, and do NOT create another invoice. Reply with EMPTY text.`,
      };
    },
  });

  const getCustomerContext = tool({
    description:
      "Get the full picture of THIS customer you're chatting with — their profile (name, notes, email) and their invoices with the actual items they bought. Use whenever the customer asks about their invoices, orders, or past purchases, or when you need to know their history to answer.",
    inputSchema: z.object({}),
    execute: async () => {
      const { supabase, business } = await getCurrentBusiness(context.businessOverride);
      const { data: conv } = await supabase.from("conversations").select("customer_id").eq("id", context.conversationId).maybeSingle();
      if (!conv?.customer_id) return { found: false as const, note: "This chat has no saved customer record yet — no history to show." };

      const [{ data: customer }, { data: invoices }] = await Promise.all([
        supabase.from("customers").select("name, notes, email, whatsapp_number").eq("business_id", business.id).eq("id", conv.customer_id).maybeSingle(),
        supabase
          .from("invoices")
          .select("number, status, total, created_at, invoice_items(description, quantity, unit_price)")
          .eq("business_id", business.id)
          .eq("customer_id", conv.customer_id)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      return {
        found: true as const,
        customer: { name: customer?.name ?? null, notes: customer?.notes ?? null, email: customer?.email ?? null },
        invoices: (invoices ?? []).map((i) => ({
          number: i.number,
          status: i.status,
          total: formatMoney(i.total, business.currency),
          items: (i.invoice_items ?? []).map((it) => ({ item: it.description, quantity: it.quantity, unitPrice: formatMoney(it.unit_price, business.currency) })),
        })),
      };
    },
  });

  const sendProductImage = tool({
    description:
      "Send a product's photo to the customer as a WhatsApp image message. ONLY use when the conversation is about ONE specific product AND the customer asked to see it (or said yes to your offer). Never send images unprompted or for whole lists.",
    inputSchema: z.object({
      productId: z.string().uuid().describe("The product id from checkStock"),
      caption: z.string().max(500).optional().describe("Short natural caption in the customer's language — like a shop assistant texting, e.g. 'This is the canvas tote, 2,800 LKR 😊'. No catalog punctuation or em dashes."),
    }),
    execute: async ({ productId, caption }) => {
      const { supabase, business } = await getCurrentBusiness(context.businessOverride);
      const { data: product, error } = await supabase
        .from("products")
        .select("name, price, image_url")
        .eq("business_id", business.id)
        .eq("id", productId)
        .single();
      if (error) throw error;
      if (!product.image_url) return { sent: false, note: "This product has no image — tell the customer a photo isn't available right now." };

      const naturalName = product.name.replace(/\s*—\s*/g, " ");
      const send = await sendWhatsappImage(business.whatsapp_session ?? "default", context.chatId, product.image_url, caption ?? naturalName);
      await supabase.from("messages").insert({
        business_id: business.id,
        conversation_id: context.conversationId,
        direction: "outbound",
        sender: "agent",
        body: caption ?? product.name,
        media_url: product.image_url,
        provider_message_id: send.sent ? send.providerMessageId : null,
      });
      return { sent: send.sent, note: send.sent ? "Image sent with its caption — the customer already sees it. Reply with EMPTY text unless they asked something else." : "WhatsApp is not connected — image not sent." };
    },
  });

  // Plain conversational replies are not a tool — the agent just writes them as its answer, and the
  // worker either auto-sends (automation on) or queues them for approval. Only money actions gate here.
  const escalateToOwner = tool({
    description:
      "Send a request to the business OWNER for something you are NOT allowed to decide yourself — a discount or special price, or a quantity beyond current stock that needs restocking. Use this instead of pretending you'll 'check with the team'. Only call it when the customer actually made such a request.",
    inputSchema: z.object({
      requestType: z.enum(["discount", "bulk_or_restock", "other"]),
      summary: z.string().min(1).max(500).describe("Clear one-line summary in English for the owner to read, e.g. 'Wants 10% discount on Ceramic Mug' or 'Wants 100 Ceramic Mugs, only 60 in stock'."),
    }),
    execute: async ({ requestType, summary }) => {
      const { supabase, business } = await getCurrentBusiness(context.businessOverride);
      const { data: conv } = await supabase.from("conversations").select("customers(name, whatsapp_number)").eq("id", context.conversationId).maybeSingle();
      const who = contactLabel(conv?.customers ?? null);
      const body = `🔔 Customer request (${requestType}) from ${who}:\n${summary}`;
      await createApproval(
        {
          actionType: "customer_request",
          conversationId: context.conversationId,
          payload: { conversationId: context.conversationId, chatId: context.chatId, body, requestType },
        },
        context.businessOverride,
      );
      return { status: "sent_to_owner" as const, note: "The request is now with the owner. Tell the customer you've passed it to the owner and will update them — do NOT promise a specific outcome (no discount amount, no delivery date)." };
    },
  });

  return { draftAndQueueInvoice, sendProductImage, getCustomerContext, escalateToOwner };
}
