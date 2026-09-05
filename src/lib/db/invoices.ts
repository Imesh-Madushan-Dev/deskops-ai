import "server-only";

import { z } from "zod";
import { getCurrentBusiness } from "@/lib/db/auth";
import { calculateInvoiceTotals } from "@/lib/utils/money";
import { bumpInvoiceNumber } from "@/lib/utils/invoice";

export const invoiceItemInputSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  description: z.string().trim().min(1).max(200),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
});

export const invoiceInputSchema = z.object({
  customerId: z.string().uuid().optional().nullable(),
  taxRate: z.number().min(0).max(1).default(0),
  items: z.array(invoiceItemInputSchema).min(1),
});
export type InvoiceInput = z.infer<typeof invoiceInputSchema>;

/** Derived from the HIGHEST existing number, never from the row count: deleting a customer hard-deletes
 *  their invoices (delete_customer_cascade), so count+1 would hand out a number that already exists and
 *  collide with the unique (business_id, number) index. Concurrent drafts are caught by that same index
 *  and retried in createInvoice. */
async function nextInvoiceNumber(supabase: Awaited<ReturnType<typeof getCurrentBusiness>>["supabase"], businessId: string) {
  const { data, error } = await supabase
    .from("invoices")
    .select("number")
    .eq("business_id", businessId)
    .not("number", "is", null)
    .order("number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return bumpInvoiceNumber(data?.number ?? null);
}

export async function listInvoices() {
  const { supabase, business } = await getCurrentBusiness();
  const { data, error } = await supabase
    .from("invoices")
    .select("*, customers(name, whatsapp_number)")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getInvoice(id: string) {
  const { supabase, business } = await getCurrentBusiness();
  const [invoice, items] = await Promise.all([
    supabase.from("invoices").select("*, customers(name, whatsapp_number)").eq("business_id", business.id).eq("id", id).maybeSingle(),
    supabase.from("invoice_items").select("*").eq("business_id", business.id).eq("invoice_id", id).order("description"),
  ]);
  if (invoice.error) throw invoice.error;
  if (items.error) throw items.error;
  if (!invoice.data) return null;
  return { ...invoice.data, items: items.data };
}

export async function createInvoice(input: InvoiceInput, override?: { businessId: string }) {
  const { supabase, business } = await getCurrentBusiness(override);
  const { subtotal, tax, total } = calculateInvoiceTotals(input.items.map((i) => ({ quantity: i.quantity, unitPrice: i.unitPrice })), input.taxRate);
  const insertWithNumber = (number: string) =>
    supabase.from("invoices").insert({ business_id: business.id, customer_id: input.customerId || null, number, subtotal, tax, total }).select().single();

  // Two chats drafting at once both read the same highest number; the unique (business_id, number)
  // index rejects the loser, so re-read and retry rather than failing the sale.
  let invoice: Awaited<ReturnType<typeof insertWithNumber>>["data"] = null;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3 && !invoice; attempt += 1) {
    const { data, error } = await insertWithNumber(await nextInvoiceNumber(supabase, business.id));
    if (!error) {
      invoice = data;
      break;
    }
    if ((error as { code?: string }).code !== "23505") throw error;
    lastError = error;
  }
  if (!invoice) throw lastError;

  const { error: itemsError } = await supabase.from("invoice_items").insert(
    input.items.map((item) => ({
      business_id: business.id,
      invoice_id: invoice.id,
      product_id: item.productId || null,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      line_total: Math.round(item.quantity * item.unitPrice * 100) / 100,
    })),
  );
  if (itemsError) throw itemsError;
  return invoice;
}

/** Thrown when a revise/cancel is attempted on a paid invoice — callers map it to a friendly response. */
export class InvoicePaidError extends Error {
  constructor() {
    super("PAID");
    this.name = "InvoicePaidError";
  }
}

/** Replaces an unpaid invoice's items and recomputes totals in place (same invoice number). Resets it to
 *  a draft so the corrected version is re-sent. Refuses once the invoice is paid. */
export async function reviseInvoice(id: string, items: InvoiceInput["items"], override?: { businessId: string }) {
  const { supabase, business } = await getCurrentBusiness(override);
  const { data: current, error: fetchError } = await supabase.from("invoices").select("status").eq("business_id", business.id).eq("id", id).maybeSingle();
  if (fetchError) throw fetchError;
  if (!current) throw new Error("Invoice not found");
  if (current.status === "paid") throw new InvoicePaidError();

  const { subtotal, tax, total } = calculateInvoiceTotals(items.map((i) => ({ quantity: i.quantity, unitPrice: i.unitPrice })), 0);
  await supabase.from("invoice_items").delete().eq("business_id", business.id).eq("invoice_id", id);
  const { error: itemsError } = await supabase.from("invoice_items").insert(
    items.map((item) => ({
      business_id: business.id,
      invoice_id: id,
      product_id: item.productId || null,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      line_total: Math.round(item.quantity * item.unitPrice * 100) / 100,
    })),
  );
  if (itemsError) throw itemsError;

  const { data: invoice, error: updateError } = await supabase
    .from("invoices")
    .update({ subtotal, tax, total, status: "draft", issued_at: null })
    .eq("business_id", business.id)
    .eq("id", id)
    .select()
    .single();
  if (updateError) throw updateError;
  return invoice;
}

export async function markInvoiceSent(id: string) {
  const { supabase, business } = await getCurrentBusiness();
  const { error } = await supabase.from("invoices").update({ status: "sent", issued_at: new Date().toISOString() }).eq("business_id", business.id).eq("id", id).eq("status", "draft");
  if (error) throw error;
}

/** Runs the atomic record_sale() Postgres function — never reimplement this math/flow in app code. */
export async function recordSale(id: string) {
  const { supabase } = await getCurrentBusiness();
  const { error } = await supabase.rpc("record_sale", { p_invoice_id: id });
  if (error) throw error;
}

export async function voidInvoice(id: string) {
  const { supabase, business } = await getCurrentBusiness();
  const { error } = await supabase.from("invoices").update({ status: "void" }).eq("business_id", business.id).eq("id", id).neq("status", "paid");
  if (error) throw error;
}
