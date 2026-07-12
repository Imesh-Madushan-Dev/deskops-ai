import "server-only";

import { createGoogle } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";

/** Switches the model provider by env var so agent code never imports a vendor SDK directly. */
function resolveProvider() {
  const provider = process.env.AI_PROVIDER ?? "google";
  if (provider === "anthropic") return createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  if (provider === "openai") return createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return createGoogle({ apiKey: process.env.GEMINI_API_KEY });
}

const defaultModelId: Record<string, string> = {
  google: "gemini-2.5-flash",
  anthropic: "claude-sonnet-5",
  openai: "gpt-5-mini",
};

const defaultEmbeddingModelId: Record<string, string> = {
  google: "text-embedding-004",
};

const provider = resolveProvider();
const providerName = process.env.AI_PROVIDER ?? "google";

export const model = provider(defaultModelId[providerName] ?? defaultModelId.google);
export const modelName = defaultModelId[providerName] ?? defaultModelId.google;
export const providerId = providerName;

/** Embeddings stay on Gemini regardless of AI_PROVIDER — embeddings.embedding is fixed at vector(768) to match it. */
const embeddingProvider = createGoogle({ apiKey: process.env.GEMINI_API_KEY });
export const embeddingModel = embeddingProvider.textEmbeddingModel(defaultEmbeddingModelId.google);
