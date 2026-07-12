import { createTextStreamResponse, toTextStream } from "ai";
import { z } from "zod";
import { runOrchestrator } from "@/lib/agents/orchestrator";
import { getConversation } from "@/lib/db/conversations";

const runSchema = z.object({ conversationId: z.string().uuid(), message: z.string().trim().min(1).max(4000) });

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = runSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });

  try {
    const conversation = await getConversation(parsed.data.conversationId);
    if (!conversation) return Response.json({ error: "Conversation not found" }, { status: 404 });
    const chatId = conversation.customers?.whatsapp_number;
    if (!chatId) return Response.json({ error: "This conversation has no linked customer." }, { status: 400 });

    const result = await runOrchestrator({ conversationId: parsed.data.conversationId, chatId, message: parsed.data.message });
    return createTextStreamResponse({ stream: toTextStream({ stream: result.fullStream }) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Agent run failed" }, { status: 500 });
  }
}
