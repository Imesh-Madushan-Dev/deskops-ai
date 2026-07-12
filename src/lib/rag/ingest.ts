import "server-only";

import { contentHash, embedText, toVectorLiteral } from "@/lib/ai/embeddings";
import { getCurrentBusiness } from "@/lib/db/auth";

type EmbeddingSource = "product" | "invoice" | "customer" | "doc";

/** Re-embeds only when content_hash changed, per the "never re-embed unchanged content" rule. */
export async function ingestEmbedding(source: EmbeddingSource, sourceId: string | null, content: string) {
  const { supabase, business } = await getCurrentBusiness();
  const hash = contentHash(content);

  let existingQuery = supabase.from("embeddings").select("id, content_hash").eq("business_id", business.id).eq("source", source);
  existingQuery = sourceId ? existingQuery.eq("source_id", sourceId) : existingQuery.is("source_id", null);
  const { data: existing, error: findError } = await existingQuery.maybeSingle();
  if (findError) throw findError;
  if (existing && existing.content_hash === hash) return;

  const embedding = await embedText(content);
  const row = { business_id: business.id, source, source_id: sourceId, content, content_hash: hash, embedding: toVectorLiteral(embedding) };

  if (existing) {
    const { error } = await supabase.from("embeddings").update(row).eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("embeddings").insert(row);
    if (error) throw error;
  }
}

export async function ingestDocument(input: { source: "doc" | "policy" | "faq"; title?: string; content: string }) {
  const { supabase, business } = await getCurrentBusiness();
  const hash = contentHash(input.content);
  const { data, error } = await supabase
    .from("documents")
    .insert({ business_id: business.id, source: input.source, title: input.title ?? null, content: input.content, content_hash: hash })
    .select()
    .single();
  if (error) throw error;
  await ingestEmbedding("doc", data.id, input.content);
  return data;
}
