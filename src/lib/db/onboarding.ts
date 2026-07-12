import "server-only";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const businessNameSchema = z.string().trim().min(1).max(120);

export async function ensureOwnerBusiness(input: { businessName: string }) {
  const businessName = businessNameSchema.parse(input.businessName);
  const supabase = await createClient();
  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;

  if (claimsError || !userId) {
    throw new Error("You must be signed in to create a workspace.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_user_id", userId)
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return existing;

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .insert({ owner_user_id: userId, name: businessName })
    .select("id")
    .single();

  if (businessError) throw businessError;

  const { error: membershipError } = await supabase
    .from("business_members")
    .upsert({ business_id: business.id, user_id: userId, role: "owner" });

  if (membershipError) throw membershipError;
  return business;
}
