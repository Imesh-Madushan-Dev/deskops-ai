import { tool } from "ai";
import { z } from "zod";
import { getCurrentBusiness } from "@/lib/db/auth";
import { createInvoice } from "@/lib/db/invoices";
import { createApproval } from "@/lib/db/approvals";
import { formatMoney } from "@/lib/utils/money";
import type { ToolContext } from "./context";

export function createSalesTools(context: ToolContext) {
  const draftAndQueueInvoice = tool({
    description: "Draft an invoice for the items discussed and queue it for the owner's approval before sending to the customer. Prices/totals are computed from the real catalog, never invented.",
    inputSchema: z.object({
      customerId: z.string().uuid().optional().describe("Existing customer id if known"),
      items: z
        .array(z.object({ productId: z.string().uuid().optional(), description: z.string(), quantity: z.number().int().min(1), unitPrice: z.number().min(0) }))
        .min(1),
    }),
    execute: async ({ customerId, items }) => {
      const { business } = await getCurrentBusiness(context.businessOverride);
      const invoice = await createInvoice({ customerId: customerId ?? null, items, taxRate: 0 }, context.businessOverride);
      const body = `Here's your quote ${invoice.number}: ${formatMoney(invoice.total, business.currency)}. Reply to confirm and we'll get it ready.`;
      const approval = await createApproval(
        {
          actionType: "send_invoice",
          conversationId: context.conversationId,
          payload: { conversationId: context.conversationId, chatId: context.chatId, invoiceId: invoice.id, body },
        },
        context.businessOverride,
      );
      return { invoiceNumber: invoice.number, total: invoice.total, approvalId: approval.id, status: "awaiting_owner_approval" as const };
    },
  });

  const draftReply = tool({
    description: "Draft a WhatsApp reply to the customer and queue it for the owner's one-tap approval. Never sends automatically.",
    inputSchema: z.object({ body: z.string().min(1).max(2000) }),
    execute: async ({ body }) => {
      const approval = await createApproval(
        {
          actionType: "send_message",
          conversationId: context.conversationId,
          payload: { conversationId: context.conversationId, chatId: context.chatId, body },
        },
        context.businessOverride,
      );
      return { approvalId: approval.id, status: "awaiting_owner_approval" as const };
    },
  });

  return { draftAndQueueInvoice, draftReply };
}
