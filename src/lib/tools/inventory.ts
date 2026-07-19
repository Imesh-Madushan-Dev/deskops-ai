import { tool } from "ai";
import { z } from "zod";
import { getCurrentBusiness } from "@/lib/db/auth";
import type { ToolContext } from "./context";

export function createInventoryTools(context: ToolContext) {
  const checkStock = tool({
    description:
      "Look up products with stock quantity, unit price, and image. Omit `query` to list ALL products (use this when the customer asks what products are available).",
    inputSchema: z.object({
      query: z.string().optional().describe("Product name or SKU to search for. Omit to list every active product."),
    }),
    execute: async ({ query }) => {
      const { supabase, business } = await getCurrentBusiness(context.businessOverride);
      let builder = supabase
        .from("products")
        .select("id, name, sku, price, stock_qty, reorder_level, image_url")
        .eq("business_id", business.id)
        .eq("is_active", true)
        .order("name");
      // Strip PostgREST filter syntax characters — query text can come from a customer's message.
      const safe = query?.replace(/[,()]/g, " ").trim();
      if (safe) builder = builder.or(`name.ilike.%${safe}%,sku.ilike.%${safe}%`).limit(10);
      else builder = builder.limit(100);
      const { data, error } = await builder;
      if (error) throw error;
      return { currency: business.currency, matches: data };
    },
  });

  return { checkStock };
}
