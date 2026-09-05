import { z } from "zod";
import { runOrchestrator } from "@/lib/agents/orchestrator";
import { getConversation } from "@/lib/db/conversations";
import { assistantErrorMessage, assistantErrorResponse } from "@/lib/ai/errors";
import { parseChatMessages } from "@/lib/ai/messages";
import { checkAgentLimit } from "@/lib/ai/ratelimit";

const runSchema = z.object({ conversationId: z.string().uuid() });

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = runSchema.safeParse(body);
  const chat = await parseChatMessages((body as { messages?: unknown } | null)?.messages);
  if (!parsed.success || !chat) return assistantErrorResponse(null, "bad_request");

  try {
    const conversation = await getConversation(parsed.data.conversationId);
    if (!conversation) return assistantErrorResponse(null, "bad_request");
    const chatId = conversation.customers?.whatsapp_number;
    if (!chatId) return assistantErrorResponse(null, "bad_request");
    if (!(await checkAgentLimit(conversation.business_id))) return assistantErrorResponse(null, "rate_limited");

    const result = await runOrchestrator({
      conversationId: parsed.data.conversationId,
      chatId,
      message: chat.message,
      history: chat.history,
      surface: "customer",
    });
    return result.toUIMessageStreamResponse({ onError: assistantErrorMessage, sendReasoning: result.thinks });
  } catch (error) {
    return assistantErrorResponse(error);
  }
}
