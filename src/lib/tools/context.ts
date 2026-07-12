/** Bound to the conversation the orchestrator is currently handling — the model never chooses
 *  which real WhatsApp chat to message, it only decides whether to invoke a tool.
 *  `businessOverride` is set only when running from the service-role job worker (no owner session). */
export type ToolContext = {
  conversationId: string;
  chatId: string;
  businessOverride?: { businessId: string };
};
