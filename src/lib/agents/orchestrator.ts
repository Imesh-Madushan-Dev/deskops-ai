import "server-only";

import { stepCountIs, streamText, type ModelMessage } from "ai";
import { modelShowsReasoning, resolveModel, type ModelTier } from "@/lib/ai/provider";
import { buildToolset, type ToolSurface } from "@/lib/tools";
import { customerSystemPrompt, ownerSystemPrompt } from "@/lib/agents/prompts/orchestrator";
import { retrieveContext } from "@/lib/rag/retrieve";
import { getCurrentBusiness } from "@/lib/db/auth";
import { truncateForModel } from "@/lib/ai/guardrails";
import type { SupabaseClient } from "@supabase/supabase-js";

/** A runaway guard, not a budget. The customer surface answers one question at a time and a
 *  person is waiting; an owner request ("add these three products then invoice Nimal") chains
 *  legitimately further, and running out of steps is what ends a turn with no answer at all. */
const MAX_STEPS: Record<ToolSurface, number> = { customer: 6, owner: 12 };

/** Facts the model would otherwise burn a tool call to learn. Three counted head-queries against
 *  indexed columns — cheap enough to run on the WhatsApp path too. Failures are non-fatal: a
 *  missing context block costs a tool call, a thrown error costs the whole run. */
async function buildAwareness(supabase: SupabaseClient, businessId: string) {
  const count = { count: "exact" as const, head: true };
  const [openChats, pendingApprovals, outOfStock] = await Promise.all([
    supabase.from("conversations").select("id", count).eq("business_id", businessId).eq("status", "open"),
    supabase.from("approvals").select("id", count).eq("business_id", businessId).eq("status", "pending"),
    supabase.from("products").select("id", count).eq("business_id", businessId).eq("stock_qty", 0),
  ]);

  return [
    `Open customer conversations: ${openChats.count ?? 0}`,
    `Actions waiting on the owner's approval: ${pendingApprovals.count ?? 0}`,
    `Products currently out of stock: ${outOfStock.count ?? 0}`,
  ].join("\n");
}

export async function runOrchestrator(input: {
  message: string;
  /** Whose text is driving this run. Decides the system prompt, the toolset, and the step budget.
   *  Required: it is the security boundary between the owner's dashboard and a customer's chat. */
  surface: ToolSurface;
  /** Prior turns for multi-turn chats (dashboard copilot). WhatsApp runs stay single-turn. */
  history?: ModelMessage[];
  /** Extra system-prompt line, e.g. what dashboard page the owner is currently viewing. */
  contextNote?: string;
  /** Which model the surface needs. WhatsApp customers wait in real time ("fast"); the dashboard
   *  copilot does multi-step analysis and can afford to think. Defaults to the owner's own pick. */
  tier?: ModelTier;
  /** Per-run model override from the copilot's picker. Validated in resolveModel against the
   *  business's provider, so an unknown or forged id falls back to the tier. */
  modelId?: string;
  conversationId?: string;
  chatId?: string;
  businessOverride?: { businessId: string };
}) {
  const { supabase, business } = await getCurrentBusiness(input.businessOverride);
  const { model, providerId, modelName, providerOptions, usdIn, usdOut } = resolveModel(business.settings, input.tier, input.modelId);
  const traceId = crypto.randomUUID();

  const [grounding, awareness] = await Promise.all([
    retrieveContext(input.message, 6, input.businessOverride).catch(() => []),
    buildAwareness(supabase, business.id).catch(() => null),
  ]);
  const context = grounding.length
    ? `\n\nRelevant business context:\n${grounding.map((g) => `- (${g.source}) ${truncateForModel(g.content, 500)}`).join("\n")}`
    : "";
  const note = input.contextNote ? `\n\n${input.contextNote}` : "";
  const facts = awareness
    ? `\n\n<context>\n${awareness}\n</context>\nEverything in <context> is already true — never re-read it with a tool.`
    : "";

  const systemPrompt = input.surface === "owner" ? ownerSystemPrompt(business) : customerSystemPrompt(business);

  const result = streamText({
    model,
    providerOptions,
    system: systemPrompt + note + facts + context,
    messages: [...(input.history ?? []), { role: "user", content: input.message }],
    tools: buildToolset({ surface: input.surface, conversationId: input.conversationId, chatId: input.chatId, businessOverride: input.businessOverride }),
    stopWhen: stepCountIs(MAX_STEPS[input.surface]),
    onFinish: async ({ usage }) => {
      const inputTokens = usage.inputTokens ?? 0;
      const outputTokens = usage.outputTokens ?? 0;
      await supabase.from("model_usage").insert({
        business_id: business.id,
        trace_id: traceId,
        provider: providerId,
        model: modelName,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        // Reasoning tokens bill at the output rate and the SDK already folds them into outputTokens.
        cost_usd: (inputTokens * usdIn + outputTokens * usdOut) / 1_000_000,
      });
    },
  });

  // Routes use this to keep a "Thought process" section off models that never emit one.
  return Object.assign(result, { thinks: modelShowsReasoning({ providerOptions }) });
}
