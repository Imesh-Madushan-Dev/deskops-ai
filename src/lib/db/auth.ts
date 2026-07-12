import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims.sub) redirect("/login");
  return { supabase, userId: data.claims.sub };
}

/** `override` is for trusted server-only callers with no user session (the async job worker) —
 *  it swaps in the service-role client scoped to an already-resolved business id. Never accept
 *  an override sourced from client input. */
export async function getCurrentBusiness(override?: { businessId: string }) {
  if (override) {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("businesses").select("id,name,currency,timezone,whatsapp_session,settings").eq("id", override.businessId).single();
    if (error) throw error;
    return { supabase, business: data };
  }
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("businesses").select("id,name,currency,timezone,whatsapp_session,settings").order("created_at").limit(1).maybeSingle();
  if (error) throw error;
  if (!data) redirect("/onboarding");
  return { supabase, business: data };
}
