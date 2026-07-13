import "server-only";

import { z } from "zod";
import { getCurrentBusiness } from "@/lib/db/auth";
import { PROVIDER_CATALOG, isProviderId } from "@/lib/ai/provider";
import type { Json } from "@/types/database";

export const businessInputSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  currency: z.string().trim().regex(/^[A-Z]{3}$/).optional(),
  timezone: z.string().trim().min(1).optional(),
  whatsappSession: z.string().trim().max(120).optional().nullable(),
  aiProvider: z.enum(Object.keys(PROVIDER_CATALOG) as [string, ...string[]]).optional(),
  aiModel: z.string().trim().max(120).optional(),
  autoApproveReplies: z.boolean().optional(),
  autoApproveInvoices: z.boolean().optional(),
});
export type BusinessInput = z.infer<typeof businessInputSchema>;

export async function updateBusiness(input: BusinessInput) {
  const { supabase, business } = await getCurrentBusiness();

  let settingsUpdate: Json | undefined;
  if (input.aiProvider !== undefined || input.autoApproveReplies !== undefined || input.autoApproveInvoices !== undefined) {
    const current = (typeof business.settings === "object" && business.settings !== null && !Array.isArray(business.settings) ? business.settings : {}) as Record<string, Json>;
    settingsUpdate = { ...current };

    if (input.aiProvider !== undefined) {
      if (!isProviderId(input.aiProvider)) throw new Error("Unknown AI provider.");
      const models: readonly string[] = PROVIDER_CATALOG[input.aiProvider].models;
      const model = input.aiModel && models.includes(input.aiModel) ? input.aiModel : models[0];
      settingsUpdate.ai = { provider: input.aiProvider, model };
    }
    if (input.autoApproveReplies !== undefined || input.autoApproveInvoices !== undefined) {
      const automation = (typeof current.automation === "object" && current.automation !== null && !Array.isArray(current.automation) ? current.automation : {}) as Record<string, Json>;
      if (input.autoApproveReplies !== undefined) automation.autoApproveReplies = input.autoApproveReplies;
      if (input.autoApproveInvoices !== undefined) automation.autoApproveInvoices = input.autoApproveInvoices;
      settingsUpdate.automation = automation;
    }
  }

  const { data, error } = await supabase
    .from("businesses")
    .update({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.currency !== undefined && { currency: input.currency }),
      ...(input.timezone !== undefined && { timezone: input.timezone }),
      ...(input.whatsappSession !== undefined && { whatsapp_session: input.whatsappSession }),
      ...(settingsUpdate !== undefined && { settings: settingsUpdate }),
    })
    .eq("id", business.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listTeamMembers() {
  const { supabase, business } = await getCurrentBusiness();
  const { data, error } = await supabase.from("business_members").select("user_id, role, created_at").eq("business_id", business.id).order("created_at");
  if (error) throw error;
  return data;
}
