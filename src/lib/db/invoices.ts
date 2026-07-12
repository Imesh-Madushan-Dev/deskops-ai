import "server-only";

import { z } from "zod";
import { getCurrentBusiness } from "@/lib/db/auth";
import { calculateInvoiceTotals } from "@/lib/utils/money";

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

async function nextInvoiceNumber(supabase: Awaited<ReturnType<typeof getCurrentBusiness>>["supabase"], businessId: string) {
  const { count, error } = await supabase.from("invoices").select("id", { count: "exact", head: true }).eq("business_id", businessId);
  if (error) throw error;
  return `INV-${String((count ?? 0) + 1).padStart(4, "0")}`;
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
  const number = await nextInvoiceNumber(supabase, business.id);

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert({ business_id: business.id, customer_id: input.customerId || null, number, subtotal, tax, total })
    .select()
    .single();
  if (invoiceError) throw invoiceError;

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
