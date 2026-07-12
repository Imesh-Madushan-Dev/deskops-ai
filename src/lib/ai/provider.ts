import "server-only";

import { createGoogle } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGroq } from "@ai-sdk/groq";
import type { LanguageModel } from "ai";

/** Provider catalog: what the settings UI offers and what resolveModel accepts.
 *  API keys stay in env — users pick provider/model, never paste keys into the app. */
export const PROVIDER_CATALOG = {
  google: {
    label: "Google Gemini",
    envKey: "GEMINI_API_KEY",
    models: ["gemini-3.1-flash-lite"],
  },
  openai: {
    label: "OpenAI",
    envKey: "OPENAI_API_KEY",
    models: ["gpt-5-mini", "gpt-5", "gpt-5-nano"],
  },
  anthropic: {
    label: "Anthropic Claude",
    envKey: "ANTHROPIC_API_KEY",
    models: ["claude-sonnet-5", "claude-opus-4-8", "claude-haiku-4-5-20251001"],
  },
  groq: {
    label: "Groq",
    envKey: "GROQ_API_KEY",
    models: ["llama-3.3-70b-versatile", "openai/gpt-oss-120b", "openai/gpt-oss-20b"],
  },
} as const;

export type ProviderId = keyof typeof PROVIDER_CATALOG;

export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === "string" && value in PROVIDER_CATALOG;
}

export function providerHasKey(id: ProviderId) {
  return Boolean(process.env[PROVIDER_CATALOG[id].envKey]);
}

function instantiate(id: ProviderId) {
  if (id === "anthropic") return createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  if (id === "openai") return createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  if (id === "groq") return createGroq({ apiKey: process.env.GROQ_API_KEY });
  return createGoogle({ apiKey: process.env.GEMINI_API_KEY });
}

/** Reads the per-business AI choice from businesses.settings ({ ai: { provider, model } }),
 *  falling back to the AI_PROVIDER env var, then to Google. Unknown/keyless providers and
 *  models not in the catalog fall back safely so a bad setting can never break agent runs. */
export function resolveModelSelection(settings: unknown): { providerId: ProviderId; modelName: string } {
  const ai = (settings as { ai?: { provider?: unknown; model?: unknown } } | null)?.ai;
  const envDefault = isProviderId(process.env.AI_PROVIDER) ? process.env.AI_PROVIDER : "google";
  const providerId = isProviderId(ai?.provider) && providerHasKey(ai.provider) ? ai.provider : envDefault;
  const catalog: readonly string[] = PROVIDER_CATALOG[providerId].models;
  const modelName = typeof ai?.model === "string" && ai.provider === providerId && catalog.includes(ai.model) ? ai.model : catalog[0];
  return { providerId, modelName };
}

export function resolveModel(settings: unknown): { model: LanguageModel; providerId: ProviderId; modelName: string } {
  const { providerId, modelName } = resolveModelSelection(settings);
  return { model: instantiate(providerId)(modelName), providerId, modelName };
}

/** Embeddings stay on Gemini regardless of the chat provider — embeddings.embedding is fixed at vector(768) to match it. */
export const EMBEDDING_MODEL_NAME = "text-embedding-004";
const embeddingProvider = createGoogle({ apiKey: process.env.GEMINI_API_KEY });
export const embeddingModel = embeddingProvider.textEmbeddingModel(EMBEDDING_MODEL_NAME);
