import "server-only";

import { createGoogle } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGroq } from "@ai-sdk/groq";
import type { LanguageModel } from "ai";

/** Which surface is asking. The owner picks one provider (and their preferred everyday model);
 *  each call site picks the tier it needs within that provider — WhatsApp customers wait in real
 *  time, the dashboard copilot can afford to think. */
export type ModelTier = "fast" | "standard" | "thinking";

/** Provider options cross the wire as JSON, so `unknown` won't do. */
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

type ModelDef = {
  id: string;
  label: string;
  tier: ModelTier;
  /** Passed straight to streamText. Absent = this model does no extended thinking. */
  providerOptions?: Record<string, Record<string, JsonValue>>;
  /** USD per 1M tokens, for model_usage.cost_usd. Reasoning tokens bill at the output rate. */
  usdIn: number;
  usdOut: number;
};

/** Provider catalog: what the settings UI offers and what resolveModel accepts.
 *  API keys stay in env — users pick provider/model, never paste keys into the app.
 *  Every provider declares exactly one model per tier; that invariant is what lets each
 *  surface ask for a tier without adding a second owner-facing setting. */
export const PROVIDER_CATALOG = {
  google: {
    label: "Google Gemini",
    envKey: "GEMINI_API_KEY",
    models: [
      {
        id: "gemini-3.5-flash-lite",
        label: "Gemini 3.5 Flash Lite",
        tier: "fast",
        // Cheapest tier still reasons a little; thoughts stay off to keep WhatsApp snappy.
        providerOptions: { google: { thinkingConfig: { thinkingLevel: "minimal" } } },
        usdIn: 0.1,
        usdOut: 0.4,
      },
      {
        id: "gemini-3.6-flash",
        label: "Gemini 3.6 Flash",
        tier: "standard",
        providerOptions: { google: { thinkingConfig: { thinkingLevel: "low", includeThoughts: true } } },
        usdIn: 0.3,
        usdOut: 2.5,
      },
      {
        // Not Pro: gemini-3.1-pro-preview has a free-tier quota of literally 0, so a project
        // without billing 429s on every copilot run. The newest flash, thinking dialled up.
        // Swap to "gemini-3.1-pro-preview" (usdIn 1.25 / usdOut 10) once billing is enabled.
        id: "gemini-3.7-flash",
        label: "Gemini 3.7 Flash",
        tier: "thinking",
        providerOptions: { google: { thinkingConfig: { thinkingLevel: "high", includeThoughts: true } } },
        usdIn: 0.3,
        usdOut: 2.5,
      },
    ],
  },
  openai: {
    label: "OpenAI",
    envKey: "OPENAI_API_KEY",
    models: [
      { id: "gpt-5-nano", label: "GPT-5 Nano", tier: "fast", usdIn: 0.05, usdOut: 0.4 },
      { id: "gpt-5.2", label: "GPT-5.2", tier: "standard", usdIn: 1.25, usdOut: 10 },
      {
        id: "gpt-5.2-pro",
        label: "GPT-5.2 Pro",
        tier: "thinking",
        providerOptions: { openai: { reasoningEffort: "high", reasoningSummary: "auto" } },
        usdIn: 15,
        usdOut: 120,
      },
    ],
  },
  anthropic: {
    label: "Anthropic Claude",
    envKey: "ANTHROPIC_API_KEY",
    models: [
      { id: "claude-haiku-4-5-20251001", label: "Haiku 4.5", tier: "fast", usdIn: 1, usdOut: 5 },
      { id: "claude-sonnet-5", label: "Sonnet 5", tier: "standard", usdIn: 3, usdOut: 15 },
      {
        id: "claude-opus-5",
        label: "Opus 5",
        tier: "thinking",
        // 'adaptive' lets the model decide how long to think; 'summarized' is what makes the
        // reasoning stream back at all — 'omitted' thinks but sends nothing to render.
        providerOptions: { anthropic: { thinking: { type: "adaptive", display: "summarized" } } },
        usdIn: 5,
        usdOut: 25,
      },
    ],
  },
  groq: {
    label: "Groq",
    envKey: "GROQ_API_KEY",
    models: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B", tier: "fast", usdIn: 0.59, usdOut: 0.79 },
      { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B", tier: "standard", usdIn: 0.15, usdOut: 0.75 },
      { id: "deepseek-r1-distill-llama-70b", label: "DeepSeek R1 70B", tier: "thinking", usdIn: 0.75, usdOut: 0.99 },
    ],
  },
} as const satisfies Record<string, { label: string; envKey: string; models: readonly ModelDef[] }>;

export type ProviderId = keyof typeof PROVIDER_CATALOG;

export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === "string" && value in PROVIDER_CATALOG;
}

export function providerHasKey(id: ProviderId) {
  return Boolean(process.env[PROVIDER_CATALOG[id].envKey]);
}

/** The models a provider offers, one per tier. Ids are unique within a provider — a duplicate
 *  silently costs the picker a tier, so scripts/check-model-catalog.ts asserts it. */
export function providerModels(id: ProviderId): ModelDef[] {
  return [...(PROVIDER_CATALOG[id].models as readonly ModelDef[])];
}

export function providerModelIds(id: ProviderId): string[] {
  return providerModels(id).map((model) => model.id);
}

function modelForTier(id: ProviderId, tier: ModelTier): ModelDef {
  const models = PROVIDER_CATALOG[id].models as readonly ModelDef[];
  // The catalog guarantees one per tier; the fallback is a safety net, not a code path.
  return models.find((model) => model.tier === tier) ?? models[0];
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
  const catalog = providerModelIds(providerId);
  const saved = typeof ai?.model === "string" && ai.provider === providerId && catalog.includes(ai.model) ? ai.model : null;
  // ponytail: no saved pick => cheapest tier (Gemini 3.5 Flash Lite on Google).
  return { providerId, modelName: saved ?? modelForTier(providerId, "fast").id };
}

/** Resolves the model for a surface. "standard" honours the owner's saved pick; "fast" and
 *  "thinking" take the provider's model for that tier — the owner chose a provider, not a
 *  latency profile for every surface at once.
 *
 *  `modelId` is a per-run override from the copilot's picker. It comes from the client, so it
 *  only wins when it names a model in the business's own provider catalog — otherwise the tier
 *  applies and a forged id is simply ignored. */
export function resolveModel(
  settings: unknown,
  tier: ModelTier = "standard",
  modelId?: string,
): {
  model: LanguageModel;
  providerId: ProviderId;
  modelName: string;
  providerOptions?: Record<string, Record<string, JsonValue>>;
  usdIn: number;
  usdOut: number;
} {
  const selection = resolveModelSelection(settings);
  const { providerId } = selection;
  const models = PROVIDER_CATALOG[providerId].models as readonly ModelDef[];
  const requested = modelId ? models.find((model) => model.id === modelId) : undefined;
  const def =
    requested ??
    (tier === "standard"
      ? models.find((model) => model.id === selection.modelName) ?? modelForTier(providerId, "standard")
      : modelForTier(providerId, tier));

  return {
    model: instantiate(providerId)(def.id),
    providerId,
    modelName: def.id,
    providerOptions: def.providerOptions,
    usdIn: def.usdIn,
    usdOut: def.usdOut,
  };
}

/** Embeddings stay on Gemini regardless of the chat provider — embeddings.embedding is fixed at vector(768) to match it. */
export const EMBEDDING_MODEL_NAME = "text-embedding-004";
const embeddingProvider = createGoogle({ apiKey: process.env.GEMINI_API_KEY });
export const embeddingModel = embeddingProvider.textEmbeddingModel(EMBEDDING_MODEL_NAME);
