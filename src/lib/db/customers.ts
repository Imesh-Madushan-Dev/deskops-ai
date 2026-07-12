import "server-only";

import { z } from "zod";
import { getCurrentBusiness } from "@/lib/db/auth";

export const customerInputSchema = z.object({
  name: z.string().trim().max(120).optional().nullable(),
  whatsappNumber: z.string().trim().min(5).max(20),
  email: z.string().trim().email().optional().nullable().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().nullable(),
});
export type CustomerInput = z.infer<typeof customerInputSchema>;

export async function listCustomers() {
  const { supabase, business } = await getCurrentBusiness();
  const { data, error } = await supabase.from("customers").select("*").eq("business_id", business.id).order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getCustomer(id: string) {
  const { supabase, business } = await getCurrentBusiness();
  const { data, error } = await supabase.from("customers").select("*").eq("business_id", business.id).eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getCustomerHistory(id: string) {
  const { supabase, business } = await getCurrentBusiness();
  const [invoices, conversations] = await Promise.all([
    supabase.from("invoices").select("id, number, status, total, created_at").eq("business_id", business.id).eq("customer_id", id).order("created_at", { ascending: false }),
    supabase.from("conversations").select("id, status, last_message_at").eq("business_id", business.id).eq("customer_id", id).order("last_message_at", { ascending: false }),
  ]);
  if (invoices.error) throw invoices.error;
  if (conversations.error) throw conversations.error;
  return { invoices: invoices.data, conversations: conversations.data };
}

export async function createCustomer(input: CustomerInput) {
  const { supabase, business } = await getCurrentBusiness();
  const { data, error } = await supabase
    .from("customers")
    .insert({ business_id: business.id, name: input.name || null, whatsapp_number: input.whatsappNumber, email: input.email || null, notes: input.notes || null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCustomer(id: string, input: Partial<CustomerInput>) {
  const { supabase, business } = await getCurrentBusiness();
  const { data, error } = await supabase
    .from("customers")
    .update({
      ...(input.name !== undefined && { name: input.name || null }),
      ...(input.whatsappNumber !== undefined && { whatsapp_number: input.whatsappNumber }),
      ...(input.email !== undefined && { email: input.email || null }),
      ...(input.notes !== undefined && { notes: input.notes || null }),
    })
    .eq("business_id", business.id)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
