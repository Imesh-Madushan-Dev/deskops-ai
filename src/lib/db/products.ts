import "server-only";

import { z } from "zod";
import { getCurrentBusiness } from "@/lib/db/auth";

export const productInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  sku: z.string().trim().max(60).optional().nullable(),
  price: z.number().min(0),
  cost: z.number().min(0).optional().nullable(),
  stockQty: z.number().int().min(0).default(0),
  reorderLevel: z.number().int().min(0).default(0),
  imageUrl: z.string().trim().url().max(2000).optional().nullable().or(z.literal("").transform(() => null)),
  categoryName: z.string().trim().max(80).optional().nullable(),
  supplierName: z.string().trim().max(120).optional().nullable(),
  isActive: z.boolean().default(true),
});
export type ProductInput = z.infer<typeof productInputSchema>;

async function resolveCategoryId(supabase: Awaited<ReturnType<typeof getCurrentBusiness>>["supabase"], businessId: string, name?: string | null) {
  if (!name) return null;
  const { data, error } = await supabase
    .from("product_categories")
    .upsert({ business_id: businessId, name }, { onConflict: "business_id,name" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function resolveSupplierId(supabase: Awaited<ReturnType<typeof getCurrentBusiness>>["supabase"], businessId: string, name?: string | null) {
  if (!name) return null;
  const { data: existing, error: findError } = await supabase
    .from("suppliers")
    .select("id")
    .eq("business_id", businessId)
    .eq("name", name)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) return existing.id as string;
  const { data, error } = await supabase.from("suppliers").insert({ business_id: businessId, name }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function listProducts() {
  const { supabase, business } = await getCurrentBusiness();
  const { data, error } = await supabase
    .from("products")
    .select("*, product_categories(name), suppliers(name)")
    .eq("business_id", business.id)
    .order("name");
  if (error) throw error;
  return data;
}

export async function getProduct(id: string) {
  const { supabase, business } = await getCurrentBusiness();
  const { data, error } = await supabase
    .from("products")
    .select("*, product_categories(name), suppliers(name)")
    .eq("business_id", business.id)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createProduct(input: ProductInput) {
  const { supabase, business } = await getCurrentBusiness();
  const categoryId = await resolveCategoryId(supabase, business.id, input.categoryName);
  const supplierId = await resolveSupplierId(supabase, business.id, input.supplierName);
  const { data, error } = await supabase
    .from("products")
    .insert({
      business_id: business.id,
      name: input.name,
      sku: input.sku || null,
      price: input.price,
      cost: input.cost ?? null,
      image_url: input.imageUrl ?? null,
      stock_qty: input.stockQty,
      reorder_level: input.reorderLevel,
      category_id: categoryId,
      supplier_id: supplierId,
      is_active: input.isActive,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProduct(id: string, input: Partial<ProductInput>) {
  const { supabase, business } = await getCurrentBusiness();
  const categoryId = input.categoryName !== undefined ? await resolveCategoryId(supabase, business.id, input.categoryName) : undefined;
  const supplierId = input.supplierName !== undefined ? await resolveSupplierId(supabase, business.id, input.supplierName) : undefined;
  const { data, error } = await supabase
    .from("products")
    .update({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.sku !== undefined && { sku: input.sku || null }),
      ...(input.price !== undefined && { price: input.price }),
      ...(input.cost !== undefined && { cost: input.cost }),
      ...(input.imageUrl !== undefined && { image_url: input.imageUrl }),
      ...(input.stockQty !== undefined && { stock_qty: input.stockQty }),
      ...(input.reorderLevel !== undefined && { reorder_level: input.reorderLevel }),
      ...(categoryId !== undefined && { category_id: categoryId }),
      ...(supplierId !== undefined && { supplier_id: supplierId }),
      ...(input.isActive !== undefined && { is_active: input.isActive }),
    })
    .eq("business_id", business.id)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function archiveProduct(id: string) {
  const { supabase, business } = await getCurrentBusiness();
  const { error } = await supabase.from("products").update({ is_active: false }).eq("business_id", business.id).eq("id", id);
  if (error) throw error;
}

/** Runs the atomic adjust_stock() Postgres function and returns the resulting quantity.
 *  Never split this back into a client-side read-update-insert: stock_movements is server-written
 *  (clients hold only SELECT on it), so the movement insert is denied by RLS while the quantity
 *  update has already committed — an error next to a number that silently moved. */
export async function adjustStock(id: string, delta: number, reason: "restock" | "adjustment", refId?: string) {
  const { supabase } = await getCurrentBusiness();
  const { data, error } = await supabase.rpc("adjust_stock", { p_product_id: id, p_delta: delta, p_reason: reason, p_ref_id: refId ?? null });
  if (error) throw error;
  return data;
}
