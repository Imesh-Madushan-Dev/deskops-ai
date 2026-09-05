import "server-only";

import { createGoogle } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
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
        // The only current Flash-Lite — Google ships no Lite variant above 3.5.
        id: "gemini-3.5-flash-lite",
        label: "Gemini 3.5 Flash Lite",
        tier: "fast",
        // Cheapest tier still reasons a little; thoughts stay off to keep WhatsApp snappy.
        providerOptions: { google: { thinkingConfig: { thinkingLevel: "minimal" } } },
        usdIn: 0.3,
        usdOut: 2.5,
      },
      {
        id: "gemini-3.7-flash",
        label: "Gemini 3.7 Flash",
        tier: "standard",
        providerOptions: { google: { thinkingConfig: { thinkingLevel: "low", includeThoughts: true } } },
        // Promotional rate through 2026-12-31; rises to 1.5 / 7.5 after.
        usdIn: 0.75,
        usdOut: 3.75,
      },
      {
        // Not Pro: gemini-3.1-pro-preview has a free-tier quota of literally 0, so a project
        // without billing 429s on every copilot run. The newest flash, thinking dialled up.
        // Swap to "gemini-3.1-pro-preview" (usdIn 2 / usdOut 12) once billing is enabled.
        id: "gemini-3.8-flash",
        label: "Gemini 3.8 Flash",
        tier: "thinking",
        providerOptions: { google: { thinkingConfig: { thinkingLevel: "high", includeThoughts: true } } },
        usdIn: 0.75,
        usdOut: 3.75,
      },
    ],
  },
  openai: {
    label: "OpenAI",
    envKey: "OPENAI_API_KEY",
    models: [
      { id: "gpt-5.6-luna", label: "GPT-5.6 Luna", tier: "fast", usdIn: 0.2, usdOut: 1.2 },
      { id: "gpt-5.6-terra", label: "GPT-5.6 Terra", tier: "standard", usdIn: 2, usdOut: 12 },
      {
        // Flagship, and priced like one — the picker reaches it per question, nothing routes
        // here by default.
        id: "gpt-6-astra",
        label: "GPT-6 Astra",
        tier: "thinking",
        providerOptions: { openai: { reasoningEffort: "high", reasoningSummary: "auto" } },
        usdIn: 10,
        usdOut: 50,
      },
    ],
  },
  anthropic: {
    label: "Anthropic Claude",
    envKey: "ANTHROPIC_API_KEY",
    models: [
      // Ids are complete as-is — never append a date suffix.
      { id: "claude-haiku-4-5", label: "Haiku 4.5", tier: "fast", usdIn: 1, usdOut: 5 },
      { id: "claude-sonnet-5", label: "Sonnet 5", tier: "standard", usdIn: 2, usdOut: 10 },
      {
        id: "claude-opus-5",
        label: "Opus 5",
        tier: "thinking",
        // 'adaptive' lets the model decide how long to think; 'summarized' is what makes the
        // reasoning stream back at all — 'omitted' (the default) thinks but sends nothing to render.
        providerOptions: { anthropic: { thinking: { type: "adaptive", display: "summarized" } } },
        usdIn: 5,
        usdOut: 25,
      },
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

/** Finds a model anywhere in the catalog. The dock lets an owner reach any provider's models per
 *  question, so an id no longer has to belong to their saved provider — it only has to be a real
 *  catalog entry, which is what keeps a forged id from naming an arbitrary model. */
function findCatalogModel(modelId: string): { providerId: ProviderId; def: ModelDef } | null {
  for (const providerId of Object.keys(PROVIDER_CATALOG) as ProviderId[]) {
    const def = (PROVIDER_CATALOG[providerId].models as readonly ModelDef[]).find((model) => model.id === modelId);
    if (def) return { providerId, def };
  }
  return null;
}

function instantiate(id: ProviderId) {
  if (id === "anthropic") return createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  if (id === "openai") return createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
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
 *  `modelId` is a per-run override from the copilot's picker, and may name a model from ANY
 *  provider — the saved provider is the default for the agents, not a cage around the dock. It
 *  comes from the client, so it only wins when it names a real catalog model whose provider has
 *  an API key; anything else falls through to the tier. */
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
  // A cross-provider override brings its own provider with it, so usage is billed and logged
  // against the provider that actually ran.
  const override = modelId ? findCatalogModel(modelId) : null;
  const providerId = override && providerHasKey(override.providerId) ? override.providerId : selection.providerId;
  const models = PROVIDER_CATALOG[providerId].models as readonly ModelDef[];
  const def =
    (providerId === override?.providerId ? override.def : undefined) ??
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
