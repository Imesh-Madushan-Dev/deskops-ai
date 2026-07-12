import "server-only";

import { z } from "zod";
import { getCurrentBusiness } from "@/lib/db/auth";

export async function listLowStock() {
  const { supabase, business } = await getCurrentBusiness();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, sku, stock_qty, reorder_level")
    .eq("business_id", business.id)
    .eq("is_active", true)
    .order("stock_qty");
  if (error) throw error;
  return data.filter((p) => p.stock_qty <= p.reorder_level);
}

export async function listStockMovements() {
  const { supabase, business } = await getCurrentBusiness();
  const { data, error } = await supabase
    .from("stock_movements")
    .select("*, products(name)")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data;
}

export const reorderInputSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1),
});
export type ReorderInput = z.infer<typeof reorderInputSchema>;

export async function listReorders() {
  const { supabase, business } = await getCurrentBusiness();
  const { data, error } = await supabase
    .from("reorders")
    .select("*, products(name, sku), suppliers(name)")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createReorder(input: ReorderInput) {
  const { supabase, business } = await getCurrentBusiness();
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("supplier_id")
    .eq("business_id", business.id)
    .eq("id", input.productId)
    .single();
  if (productError) throw productError;
  const { data, error } = await supabase
    .from("reorders")
    .insert({ business_id: business.id, product_id: input.productId, supplier_id: product.supplier_id, quantity: input.quantity })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function markReorderStatus(id: string, status: "ordered" | "received") {
  const { supabase, business } = await getCurrentBusiness();
  const { data: reorder, error: fetchError } = await supabase.from("reorders").select("product_id, quantity, status").eq("business_id", business.id).eq("id", id).single();
  if (fetchError) throw fetchError;

  const { error: updateError } = await supabase.from("reorders").update({ status }).eq("business_id", business.id).eq("id", id);
  if (updateError) throw updateError;

  if (status === "received" && reorder.status !== "received") {
    const { data: product, error: productError } = await supabase.from("products").select("stock_qty").eq("business_id", business.id).eq("id", reorder.product_id).single();
    if (productError) throw productError;
    const { error: stockError } = await supabase.from("products").update({ stock_qty: product.stock_qty + reorder.quantity }).eq("business_id", business.id).eq("id", reorder.product_id);
    if (stockError) throw stockError;
    const { error: movementError } = await supabase
      .from("stock_movements")
      .insert({ business_id: business.id, product_id: reorder.product_id, delta: reorder.quantity, reason: "restock", ref_id: id });
    if (movementError) throw movementError;
  }
}
