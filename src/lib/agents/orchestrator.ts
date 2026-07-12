import "server-only";

import { stepCountIs, streamText } from "ai";
import { model, modelName, providerId } from "@/lib/ai/provider";
import { buildToolset } from "@/lib/tools";
import { orchestratorSystemPrompt } from "@/lib/agents/prompts/orchestrator";
import { retrieveContext } from "@/lib/rag/retrieve";
import { getCurrentBusiness } from "@/lib/db/auth";
import { truncateForModel } from "@/lib/ai/guardrails";

const MAX_STEPS = 6;

export async function runOrchestrator(input: { conversationId: string; chatId: string; message: string; businessOverride?: { businessId: string } }) {
  const { supabase, business } = await getCurrentBusiness(input.businessOverride);

  const grounding = await retrieveContext(input.message, 6, input.businessOverride).catch(() => []);
  const context = grounding.length
    ? `\n\nRelevant business context:\n${grounding.map((g) => `- (${g.source}) ${truncateForModel(g.content, 500)}`).join("\n")}`
    : "";

  const result = streamText({
    model,
    system: orchestratorSystemPrompt(business) + context,
    messages: [{ role: "user", content: input.message }],
    tools: buildToolset({ conversationId: input.conversationId, chatId: input.chatId, businessOverride: input.businessOverride }),
    stopWhen: stepCountIs(MAX_STEPS),
    onFinish: async ({ usage }) => {
      await supabase.from("model_usage").insert({
        business_id: business.id,
        provider: providerId,
        model: modelName,
        input_tokens: usage.inputTokens ?? 0,
        output_tokens: usage.outputTokens ?? 0,
      });
    },
  });

  return result;
}
