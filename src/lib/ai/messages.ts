import "server-only";

import { convertToModelMessages, safeValidateUIMessages, type ModelMessage, type UIMessage } from "ai";

const MAX_MESSAGES = 40;
const MAX_CHARS = 4000;

/** useChat posts `{ messages: UIMessage[] }`. runOrchestrator wants prior turns plus the new
 *  message separately, which is exactly how a chat request already splits. Returns null when the
 *  body is unusable — an empty thread, a thread that doesn't end on the user, or oversized input. */
export async function parseChatMessages(
  raw: unknown,
): Promise<{ history: ModelMessage[]; message: string } | null> {
  const validated = await safeValidateUIMessages({ messages: raw });
  if (!validated.success) return null;

  const messages = validated.data.slice(-MAX_MESSAGES);
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") return null;

  const message = textOf(last).trim();
  if (!message || message.length > MAX_CHARS) return null;

  return { history: await convertToModelMessages(messages.slice(0, -1)), message };
}

function textOf(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("");
}
