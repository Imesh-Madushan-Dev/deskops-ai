import { tool } from "ai";
import { z } from "zod";
import { getCurrentBusiness } from "@/lib/db/auth";
import { createInvoice } from "@/lib/db/invoices";
import { createApproval } from "@/lib/db/approvals";
import { formatMoney } from "@/lib/utils/money";
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
        .describe("The message to send the customer about this quote — write it in the customer's own language and WhatsApp style (*single asterisk* bold, friendly, short lines). Include the total."),
    }),
    execute: async ({ customerId, items, customerMessage }) => {
      const { business } = await getCurrentBusiness(context.businessOverride);
      const invoice = await createInvoice({ customerId: customerId ?? null, items, taxRate: 0 }, context.businessOverride);
      const body = customerMessage?.trim() || `Here's your quote ${invoice.number}: ${formatMoney(invoice.total, business.currency)}. Reply to confirm and we'll get it ready.`;
      const approval = await createApproval(
        {
          actionType: "send_invoice",
          conversationId: context.conversationId,
          payload: { conversationId: context.conversationId, chatId: context.chatId, invoiceId: invoice.id, body },
        },
        context.businessOverride,
      );
      return {
        invoiceNumber: invoice.number,
        total: invoice.total,
        approvalId: approval.id,
        status: "awaiting_owner_approval" as const,
        note: `Invoice ${invoice.number} was drafted successfully and is now with the owner for approval. Do NOT create another invoice for this. Just acknowledge the customer warmly and let them know their quote is being confirmed and will be sent shortly.`,
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
  return { draftAndQueueInvoice, sendProductImage };
}
