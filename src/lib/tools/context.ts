/** Bound to the conversation the orchestrator is currently handling — the model never chooses
 *  which real WhatsApp chat to message, it only decides whether to invoke a tool.
 *  `conversationId`/`chatId` are absent for the dashboard copilot (owner chat, no customer):
 *  the WhatsApp-sending sales tools are omitted from the toolset in that case.
 *  `businessOverride` is set only when running from the service-role job worker (no owner session). */
export type ToolContext = {
  conversationId?: string;
  chatId?: string;
  businessOverride?: { businessId: string };
};

/** A context bound to a real customer conversation — required by the sales tools. */
export type ConversationToolContext = ToolContext & {
  conversationId: string;
  chatId: string;
};
