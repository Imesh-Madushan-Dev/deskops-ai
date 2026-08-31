/** Whose text is driving the run — the owner in their dashboard, or a customer on WhatsApp.
 *  Required rather than defaulted: a new call site must state which side it is on instead of
 *  silently inheriting write access to the business. See buildToolset. */
export type ToolSurface = "owner" | "customer";

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
