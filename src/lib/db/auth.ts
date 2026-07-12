import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims.sub) redirect("/login");
  return { supabase, userId: data.claims.sub };
}

export async function getCurrentBusiness() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("businesses").select("id,name,currency,timezone").order("created_at").limit(1).maybeSingle();
  if (error) throw error;
  if (!data) redirect("/signup");
  return { supabase, business: data };
}
