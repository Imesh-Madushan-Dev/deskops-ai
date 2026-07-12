import "server-only";

import { createHash } from "node:crypto";
import { embed } from "ai";
import { embeddingModel } from "@/lib/ai/provider";

export async function embedText(text: string) {
  const { embedding } = await embed({ model: embeddingModel, value: text });
  return embedding;
}

export function contentHash(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

/** pgvector's Postgres client wants the literal `[1,2,3]` string form, not a JS array. */
export function toVectorLiteral(embedding: number[]) {
  return `[${embedding.join(",")}]`;
}
