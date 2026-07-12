import { createInventoryTools } from "./inventory";
import { createCustomerTools } from "./customer";
import { createBooksTools } from "./books";
import { createSalesTools } from "./sales";
import type { ConversationToolContext, ToolContext } from "./context";

export type { ToolContext } from "./context";

/** All specialist tools in one set — per the architecture doc, specialists are scoped tool groups
 *  the orchestrator calls directly, not independently running agent processes.
 *  Sales tools (draft reply / queue invoice) need a real customer conversation to target,
 *  so they're only included when the run is bound to one. */
export function buildToolset(context: ToolContext) {
  const sales = context.conversationId && context.chatId ? createSalesTools(context as ConversationToolContext) : {};
  return {
    ...createInventoryTools(context),
    ...createCustomerTools(context),
    ...createBooksTools(context),
    ...sales,
  };
}
