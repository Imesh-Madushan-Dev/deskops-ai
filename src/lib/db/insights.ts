import "server-only";

import { getCurrentBusiness } from "@/lib/db/auth";

export async function getDailyInsight(date: string) {
  const { supabase, business } = await getCurrentBusiness();
  const { data, error } = await supabase.from("daily_insights").select("*").eq("business_id", business.id).eq("for_date", date).maybeSingle();
  if (error) throw error;
  return data;
}
