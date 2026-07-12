import "server-only";

import { z } from "zod";
import { getCurrentBusiness } from "@/lib/db/auth";

export const businessInputSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  currency: z.string().trim().regex(/^[A-Z]{3}$/).optional(),
  timezone: z.string().trim().min(1).optional(),
  whatsappSession: z.string().trim().max(120).optional().nullable(),
});
export type BusinessInput = z.infer<typeof businessInputSchema>;

export async function updateBusiness(input: BusinessInput) {
  const { supabase, business } = await getCurrentBusiness();
  const { data, error } = await supabase
    .from("businesses")
    .update({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.currency !== undefined && { currency: input.currency }),
      ...(input.timezone !== undefined && { timezone: input.timezone }),
      ...(input.whatsappSession !== undefined && { whatsapp_session: input.whatsappSession }),
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
