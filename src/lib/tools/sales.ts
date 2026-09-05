import { tool } from "ai";
import { z } from "zod";
import { getCurrentBusiness } from "@/lib/db/auth";
import { createInvoice, reviseInvoice, voidInvoice, InvoicePaidError } from "@/lib/db/invoices";
import { createApproval } from "@/lib/db/approvals";
import { formatMoney } from "@/lib/utils/money";
import { sameOrder, statedByCustomer } from "@/lib/utils/invoice";
import { contactLabel } from "@/lib/utils/contact";
import { sendWhatsappImage } from "@/lib/waha/client";
import { sendInvoiceToCustomer } from "@/lib/invoice/send";
import type { ConversationToolContext } from "./context";

type InvoiceItems = { productId?: string; description: string; quantity: number; unitPrice: number }[];

export function createSalesTools(context: ConversationToolContext) {
  // Resolve the customer this chat belongs to (invoices bill to them; details are gathered against them).
  async function currentCustomerId(supabase: Awaited<ReturnType<typeof getCurrentBusiness>>["supabase"]) {
    const { data } = await supabase.from("conversations").select("customer_id").eq("id", context.conversationId).maybeSingle();
    return data?.customer_id ?? null;
  }

  // The invoice last drafted/sent in THIS chat — the one revise/cancel act on.
  async function currentInvoiceId(supabase: Awaited<ReturnType<typeof getCurrentBusiness>>["supabase"], businessId: string) {
    const { data } = await supabase
      .from("approvals")
      .select("payload")
      .eq("business_id", businessId)
      .eq("conversation_id", context.conversationId)
      .eq("action_type", "send_invoice")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data?.payload as { invoiceId?: string })?.invoiceId ?? null;
  }

  // That invoice with its live status and items — what tells us whether a "make me an invoice" is a
  // genuine new order, a duplicate of one already sent, or an edit of one still awaiting approval.
  async function currentInvoice(supabase: Awaited<ReturnType<typeof getCurrentBusiness>>["supabase"], businessId: string) {
    const id = await currentInvoiceId(supabase, businessId);
    if (!id) return null;
    const { data } = await supabase
      .from("invoices")
      .select("id, number, status, total, invoice_items(description, quantity, unit_price)")
      .eq("business_id", businessId)
      .eq("id", id)
      .maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      number: data.number ?? "",
      status: data.status,
      total: Number(data.total),
      items: (data.invoice_items ?? []).map((i) => ({ description: i.description, quantity: i.quantity, unitPrice: Number(i.unit_price) })),
    };
  }

  // Never invoice more than stock. Returns the lines we can't fulfil (empty = all good).
  async function stockShortfalls(supabase: Awaited<ReturnType<typeof getCurrentBusiness>>["supabase"], businessId: string, items: InvoiceItems) {
    const productIds = items.map((i) => i.productId).filter((id): id is string => Boolean(id));
    if (!productIds.length) return [];
    const { data: stockRows } = await supabase.from("products").select("id, name, stock_qty").eq("business_id", businessId).in("id", productIds);
    const stockById = new Map((stockRows ?? []).map((p) => [p.id, p]));
    return items
      .filter((i) => i.productId && (stockById.get(i.productId)?.stock_qty ?? 0) < i.quantity)
      .map((i) => ({ product: stockById.get(i.productId!)?.name ?? i.description, requested: i.quantity, available: stockById.get(i.productId!)?.stock_qty ?? 0 }));
  }

  // Queue the (updated) invoice to be sent as a PDF document with a friendly caption.
  async function queueInvoiceSend(business: { currency: string }, invoice: { id: string; number: string; total: number }, friendly: string) {
    const body = `${friendly}\n\n🧾 ${invoice.number} · ${formatMoney(invoice.total, business.currency)}`;
    return createApproval(
      { actionType: "send_invoice", conversationId: context.conversationId, payload: { conversationId: context.conversationId, chatId: context.chatId, invoiceId: invoice.id, caption: friendly, body } },
      context.businessOverride,
    );
  }

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

      // Duplicate guard, keyed on the ORDER rather than on a clock. The old 15-minute window let a
      // "send it again" 40 minutes later through as a second invoice for the same items, and — because
      // it never looked at approvals.status — told customers to wait for an approval that had already
      // executed. Both answers now come from the invoice's own live status.
      const open = await currentInvoice(supabase, business.id);
      if (open && (open.status === "draft" || open.status === "sent")) {
        if (sameOrder(open.items, items)) {
          return open.status === "sent"
            ? {
                status: "already_sent" as const,
                invoiceNumber: open.number,
                note: `Invoice ${open.number} for these exact items was already approved and sent to this customer. Do NOT create another and do NOT tell them to wait for approval. If they want the file again, call resendInvoice.`,
              }
            : {
                status: "already_drafted" as const,
                invoiceNumber: open.number,
                note: `Invoice ${open.number} for these exact items is already drafted and waiting for the owner's confirmation. Do NOT create another — tell the customer it's being confirmed and will reach them shortly.`,
              };
        }
        if (open.status === "draft") {
          return {
            status: "revise_instead" as const,
            invoiceNumber: open.number,
            note: `Invoice ${open.number} is still waiting for the owner's confirmation and its items differ from what you just passed. Call reviseInvoice with the FULL corrected item list instead of creating a second invoice.`,
          };
        }
      }

      // Stock guard: never draft an invoice for more than we actually have. The model must tell the
      // customer the real available quantity BEFORE any invoice — not invoice 100 when 60 are in stock.
      const shortfalls = await stockShortfalls(supabase, business.id, items);
      if (shortfalls.length) {
        return {
          status: "insufficient_stock" as const,
          shortfalls,
          note: "Do NOT create this invoice. Tell the customer the exact available quantity for each item below, and ask if they'd like that quantity instead — or offer to request more from the owner with escalateToOwner. Never invoice more than the available stock.",
        };
      }

      // Billing details guard: an invoice must have a real Bill To. Collect name + address + phone first.
      const cid = customerId ?? (await currentCustomerId(supabase));
      const { data: cust } = cid ? await supabase.from("customers").select("name, address, phone").eq("business_id", business.id).eq("id", cid).maybeSingle() : { data: null };
      const missing = ["name", "address", "phone"].filter((f) => !((cust as Record<string, string | null> | null)?.[f]?.toString().trim()));
      if (missing.length) {
        return {
          status: "need_customer_details" as const,
          missing,
          note: `Before making the invoice, ask the customer for their ${missing.join(", ")} and save it with saveCustomerDetails. Do NOT create the invoice until name, address, and phone are all on file.`,
        };
      }

      const invoice = await createInvoice({ customerId: cid, items, taxRate: 0 }, context.businessOverride);
      const friendly = customerMessage?.trim() || "Here's your quote — reply to confirm and we'll get it ready.";
      const approval = await queueInvoiceSend(business, invoice, friendly);
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

  const saveCustomerDetails = tool({
    description:
      "Save the customer's billing details (full name, delivery address, contact phone) onto their profile. Call this after asking for the details the invoice needs — always before draftAndQueueInvoice if any were missing.",
    inputSchema: z.object({
      name: z.string().trim().min(1).max(120).optional(),
      address: z.string().trim().min(1).max(500).optional(),
      phone: z.string().trim().min(3).max(40).optional(),
    }),
    execute: async ({ name, address, phone }) => {
      const { supabase, business } = await getCurrentBusiness(context.businessOverride);
      const cid = await currentCustomerId(supabase);
      if (!cid) return { saved: false as const, note: "No customer record for this chat yet." };

      const fields = [
        ["name", name, "text"],
        ["address", address, "text"],
        ["phone", phone, "phone"],
      ].filter(([, value]) => value) as ["name" | "address" | "phone", string, "text" | "phone"][];
      if (!fields.length) return { saved: false as const, note: "Nothing to save — ask for the missing detail first." };

      // A detail the customer never typed must never reach a Bill To. Everything is checked against
      // their own messages, so the agent cannot satisfy the invoice guard with a plausible guess.
      const { data: inbound } = await supabase
        .from("messages")
        .select("body")
        .eq("business_id", business.id)
        .eq("conversation_id", context.conversationId)
        .eq("direction", "inbound")
        .order("created_at", { ascending: false })
        .limit(30);
      const said = (inbound ?? []).map((m) => m.body ?? "").join(" ");

      const verified = fields.filter(([, value, kind]) => statedByCustomer(said, value, kind));
      const notStated = fields.filter((f) => !verified.includes(f)).map(([field]) => field);
      if (!verified.length) {
        return {
          saved: false as const,
          notStated,
          note: `The customer has not told you their ${notStated.join(", ")} — do NOT guess it, and never reuse their WhatsApp number as the phone unless they typed it. Ask them for it and save only what they actually reply.`,
        };
      }

      const patch: { name?: string; address?: string; phone?: string } = {};
      for (const [field, value] of verified) patch[field] = value;
      await supabase.from("customers").update(patch).eq("business_id", business.id).eq("id", cid);
      return {
        saved: true as const,
        savedFields: Object.keys(patch),
        ...(notStated.length ? { notStated } : {}),
        note: notStated.length
          ? `Saved ${Object.keys(patch).join(", ")}. The ${notStated.join(", ")} was NOT saved because the customer never told you — ask for it before invoicing.`
          : "Saved. If name, address and phone are now all on file, you can create the invoice.",
      };
    },
  });

  const reviseInvoiceTool = tool({
    description:
      "Change the items on the CURRENT invoice for this chat when the customer edits their order (different quantity, add/remove an item) — instead of creating a new invoice. Recomputes totals and re-sends the updated invoice. Only works while the invoice is not yet paid.",
    inputSchema: z.object({
      items: z.array(z.object({ productId: z.string().uuid().optional(), description: z.string(), quantity: z.number().int().min(1), unitPrice: z.number().min(0) })).min(1).describe("The FULL corrected item list (not just the change)."),
      customerMessage: z.string().min(1).max(2000).optional().describe("Short friendly line in the customer's language, e.g. 'Updated your invoice 👍'. No price/number — added automatically."),
    }),
    execute: async ({ items, customerMessage }) => {
      const { supabase, business } = await getCurrentBusiness(context.businessOverride);
      const invoiceId = await currentInvoiceId(supabase, business.id);
      if (!invoiceId) return { status: "no_invoice" as const, note: "There's no invoice for this chat yet — use draftAndQueueInvoice to create one." };

      const shortfalls = await stockShortfalls(supabase, business.id, items);
      if (shortfalls.length) return { status: "insufficient_stock" as const, shortfalls, note: "Tell the customer the real available quantity; do not revise beyond stock." };

      try {
        const invoice = await reviseInvoice(invoiceId, items, context.businessOverride);
        await queueInvoiceSend(business, invoice, customerMessage?.trim() || "Here's your updated invoice.");
        return { status: "revised" as const, invoiceNumber: invoice.number, note: "Invoice updated and the corrected version is being sent. Do NOT write the price/number yourself. Reply with EMPTY text." };
      } catch (e) {
        if (e instanceof InvoicePaidError) return { status: "already_paid" as const, note: "This invoice is already paid and cannot be changed. Use escalateToOwner if the customer needs a refund or correction." };
        throw e;
      }
    },
  });

  const resendInvoiceTool = tool({
    description:
      "Re-send the customer the invoice PDF they were already sent, when they ask for it again ('send again', 'ආයේ එවන්න', 'resend my invoice', 'I lost the file'). This is the SAME invoice — it creates nothing new and needs no owner approval. Never draft a second invoice for an order that already has one.",
    inputSchema: z.object({
      customerMessage: z
        .string()
        .min(1)
        .max(500)
        .optional()
        .describe("Short friendly line in the customer's own language, e.g. 'Here it is again 😊'. Do NOT include the price or invoice number — the file already carries them."),
    }),
    execute: async ({ customerMessage }) => {
      const { supabase, business } = await getCurrentBusiness(context.businessOverride);
      const invoice = await currentInvoice(supabase, business.id);
      if (!invoice) return { status: "no_invoice" as const, note: "There's no invoice for this chat yet — nothing to re-send. Use draftAndQueueInvoice if they want one." };
      if (invoice.status === "draft")
        return {
          status: "awaiting_owner_approval" as const,
          invoiceNumber: invoice.number,
          note: `Invoice ${invoice.number} hasn't been confirmed by the owner yet, so there is no sent file to re-send. Tell the customer it's being confirmed and will reach them shortly.`,
        };
      if (invoice.status === "void") return { status: "cancelled" as const, invoiceNumber: invoice.number, note: `Invoice ${invoice.number} was cancelled. Do not re-send it — ask the customer if they'd like to order again.` };

      const caption = customerMessage?.trim() || "Here's your invoice again.";
      const body = `${caption}

🧾 ${invoice.number} · ${formatMoney(invoice.total, business.currency)}`;
      const send = await sendInvoiceToCustomer({
        session: business.whatsapp_session ?? "default",
        chatId: context.chatId,
        invoiceId: invoice.id,
        businessId: business.id,
        caption,
        fallbackBody: body,
      });
      await supabase.from("messages").insert({
        business_id: business.id,
        conversation_id: context.conversationId,
        direction: "outbound",
        sender: "agent",
        body: send.recordedBody,
        provider_message_id: send.providerMessageId,
      });
      return {
        status: send.sent ? ("sent" as const) : ("not_connected" as const),
        invoiceNumber: invoice.number,
        note: send.sent
          ? "The invoice PDF is on its way with its caption — the customer already sees it. Reply with EMPTY text."
          : "WhatsApp isn't connected, so the invoice text was recorded but not delivered. Do not promise it was sent.",
      };
    },
  });

  const cancelInvoice = tool({
    description: "Cancel/void the CURRENT invoice for this chat when the customer cancels their order. Only works while the invoice is not yet paid.",
    inputSchema: z.object({}),
    execute: async () => {
      const { supabase, business } = await getCurrentBusiness(context.businessOverride);
      const invoiceId = await currentInvoiceId(supabase, business.id);
      if (!invoiceId) return { status: "no_invoice" as const, note: "There's no invoice for this chat to cancel." };
      const { data: inv } = await supabase.from("invoices").select("number, status").eq("business_id", business.id).eq("id", invoiceId).maybeSingle();
      if (inv?.status === "paid") return { status: "already_paid" as const, note: "This invoice is already paid — it can't be cancelled here. Use escalateToOwner for a refund." };
      await voidInvoice(invoiceId);
      return { status: "cancelled" as const, invoiceNumber: inv?.number, note: `Invoice ${inv?.number ?? ""} is cancelled. Tell the customer their order/invoice has been cancelled.` };
    },
  });

  return { draftAndQueueInvoice, resendInvoice: resendInvoiceTool, sendProductImage, getCustomerContext, escalateToOwner, saveCustomerDetails, reviseInvoice: reviseInvoiceTool, cancelInvoice };
}
