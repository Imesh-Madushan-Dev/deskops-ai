import { tool } from "ai";
import { z } from "zod";
import { getCurrentBusiness } from "@/lib/db/auth";
import type { ToolContext } from "./context";

export function createInventoryTools(context: ToolContext) {
  const checkStock = tool({
    description: "Check stock quantity and unit price for a product by name or SKU.",
    inputSchema: z.object({ query: z.string().describe("Product name or SKU to search for") }),
    execute: async ({ query }) => {
      const { supabase, business } = await getCurrentBusiness(context.businessOverride);
      // Strip PostgREST filter syntax characters — query text can come from a customer's message.
      const safe = query.replace(/[,()]/g, " ").trim();
      const { data, error } = await supabase
        .from("products")
        .select("name, sku, price, stock_qty, reorder_level")
        .eq("business_id", business.id)
        .eq("is_active", true)
        .or(`name.ilike.%${safe}%,sku.ilike.%${safe}%`)
        .limit(5);
      if (error) throw error;
      return { currency: business.currency, matches: data };
    },
  });

  return { checkStock };
}
