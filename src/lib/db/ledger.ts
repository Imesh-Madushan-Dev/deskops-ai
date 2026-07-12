import "server-only";

import { z } from "zod";
import { getCurrentBusiness } from "@/lib/db/auth";

export const ledgerEntryInputSchema = z.object({
  entryType: z.enum(["income", "expense"]),
  amount: z.number().min(0),
  category: z.string().trim().min(1).max(80),
  occurredAt: z.string().datetime().optional(),
});
export type LedgerEntryInput = z.infer<typeof ledgerEntryInputSchema>;

export async function listLedgerEntries(range?: { from: string; to: string }) {
  const { supabase, business } = await getCurrentBusiness();
  let query = supabase.from("ledger_entries").select("*").eq("business_id", business.id).order("occurred_at", { ascending: false });
  if (range) query = query.gte("occurred_at", range.from).lte("occurred_at", range.to);
  const { data, error } = await query.limit(200);
  if (error) throw error;
  return data;
}

export async function createLedgerEntry(input: LedgerEntryInput) {
  const { supabase, business } = await getCurrentBusiness();
  const { data, error } = await supabase
    .from("ledger_entries")
    .insert({ business_id: business.id, entry_type: input.entryType, amount: input.amount, category: input.category, occurred_at: input.occurredAt ?? new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getBooksSummary(range: { from: string; to: string }, override?: { businessId: string }) {
  const { supabase, business } = await getCurrentBusiness(override);
  const { data, error } = await supabase.from("ledger_entries").select("entry_type, amount, category, occurred_at").eq("business_id", business.id).gte("occurred_at", range.from).lte("occurred_at", range.to);
  if (error) throw error;
  const income = data.filter((e) => e.entry_type === "income").reduce((sum, e) => sum + Number(e.amount), 0);
  const expense = data.filter((e) => e.entry_type === "expense").reduce((sum, e) => sum + Number(e.amount), 0);
  const byCategory = new Map<string, number>();
  for (const entry of data) byCategory.set(entry.category, (byCategory.get(entry.category) ?? 0) + Number(entry.amount) * (entry.entry_type === "expense" ? -1 : 1));
  return { income, expense, net: income - expense, byCategory: Array.from(byCategory, ([category, amount]) => ({ category, amount })) };
}
