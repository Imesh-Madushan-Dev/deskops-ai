import { createInventoryTools } from "./inventory";
import { createCustomerTools } from "./customer";
import { createBooksTools } from "./books";
import { createSalesTools } from "./sales";
import { createOwnerTools } from "./owner";
import type { ConversationToolContext, ToolContext, ToolSurface } from "./context";

export type { ToolContext, ToolSurface } from "./context";

/**
 * Which tools a run may use, decided by whose text is driving it. This is a security boundary,
 * not an ergonomic one, so it is stated here once rather than emerging from who happens to hold
 * a conversation id.
 *
 * Per the architecture doc, specialists are scoped tool groups the orchestrator calls directly,
 * not independently running agent processes.
 */
export function buildToolset(context: ToolContext & { surface: ToolSurface }) {
  const read = {
    ...createInventoryTools(context),
    ...createCustomerTools(context),
    ...createBooksTools(context),
  };

  if (context.surface === "customer") {
    // This surface runs against the service-role client (getCurrentBusiness honours
    // businessOverride) on text a customer wrote, so it gets the conversation tools and nothing
    // that writes to the catalog, the ledger, or customer records outside this chat.
    // Sales tools need a real conversation to target; without one the run stays read-only.
    return context.conversationId && context.chatId
      ? { ...read, ...createSalesTools(context as ConversationToolContext) }
      : read;
  }

  // Owner surface: a signed-in owner in the dashboard. Every write here goes through db/ helpers
  // that scope to the business via RLS.
  return { ...read, ...createOwnerTools() };
}
