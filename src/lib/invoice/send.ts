import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsappImageData, sendWhatsappMessage } from "@/lib/waha/client";
import { renderInvoiceImagePng } from "@/lib/invoice/image";

/** Sends an invoice to the customer as a formatted image (a real invoice document) with a short caption.
 *  Falls back to the plain-text `fallbackBody` if WAHA isn't configured or the image can't be rendered,
 *  so the flow never breaks. Returns what was actually sent so the caller can record the message. */
export async function sendInvoiceToCustomer(input: {
  session: string;
  chatId: string;
  invoiceId: string;
  businessId: string;
  caption: string;
  fallbackBody: string;
}): Promise<{ sent: boolean; providerMessageId: string | null; recordedBody: string }> {
  const supabase = createAdminClient();
  try {
    const [{ data: invoice }, { data: items }, { data: biz }] = await Promise.all([
      supabase.from("invoices").select("number, subtotal, tax, total, created_at").eq("id", input.invoiceId).eq("business_id", input.businessId).single(),
      supabase.from("invoice_items").select("description, quantity, unit_price, line_total").eq("invoice_id", input.invoiceId).eq("business_id", input.businessId),
      supabase.from("businesses").select("name, currency").eq("id", input.businessId).single(),
    ]);
    if (!invoice || !biz) throw new Error("invoice or business not found");

    const base64 = await renderInvoiceImagePng({
      businessName: biz.name,
      currency: biz.currency,
      number: invoice.number,
      dateISO: invoice.created_at,
      items: items ?? [],
      subtotal: Number(invoice.subtotal),
      tax: Number(invoice.tax),
      total: Number(invoice.total),
    });

    const send = await sendWhatsappImageData(input.session, input.chatId, base64, "image/png", `${invoice.number}.png`, input.caption);
    if (send.sent) return { sent: true, providerMessageId: send.providerMessageId, recordedBody: input.caption };
    // WAHA not configured — record locally as text so the dashboard/books stay correct.
    return { sent: false, providerMessageId: null, recordedBody: input.fallbackBody };
  } catch {
    // Rendering or the image API failed — never leave the customer hanging; send the plain text instead.
    const send = await sendWhatsappMessage(input.session, input.chatId, input.fallbackBody);
    return { sent: send.sent, providerMessageId: send.sent ? (send.providerMessageId ?? null) : null, recordedBody: input.fallbackBody };
  }
}
