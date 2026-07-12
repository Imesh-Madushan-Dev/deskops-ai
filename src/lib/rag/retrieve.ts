import "server-only";

import { embedText, toVectorLiteral } from "@/lib/ai/embeddings";
import { getCurrentBusiness } from "@/lib/db/auth";

/** Top-k pgvector similarity search scoped to the current business via match_embeddings(). */
export async function retrieveContext(query: string, matchCount = 6, override?: { businessId: string }) {
  const { supabase, business } = await getCurrentBusiness(override);
  const embedding = await embedText(query);
  const { data, error } = await supabase.rpc("match_embeddings", {
    p_business_id: business.id,
    query_embedding: toVectorLiteral(embedding),
    match_count: matchCount,
  });
  if (error) throw error;
  return data;
}
