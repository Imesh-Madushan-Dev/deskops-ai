import { tool } from "ai";
import { z } from "zod";
import { getCurrentBusiness } from "@/lib/db/auth";
import type { ToolContext } from "./context";

export function createCustomerTools(context: ToolContext) {
  const lookupCustomer = tool({
    description: "Look up a customer by WhatsApp number and their recent order history.",
    inputSchema: z.object({ whatsappNumber: z.string().describe("Customer's WhatsApp number") }),
    execute: async ({ whatsappNumber }) => {
      const { supabase, business } = await getCurrentBusiness(context.businessOverride);
      const { data: customer, error } = await supabase
        .from("customers")
        .select("id, name, whatsapp_number, notes")
        .eq("business_id", business.id)
        .eq("whatsapp_number", whatsappNumber)
        .maybeSingle();
      if (error) throw error;
      if (!customer) return { found: false as const };

      const { data: invoices, error: invoicesError } = await supabase
        .from("invoices")
        .select("number, status, total, created_at")
        .eq("business_id", business.id)
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (invoicesError) throw invoicesError;
      return { found: true as const, customer, recentInvoices: invoices };
    },
  });

  return { lookupCustomer };
}
