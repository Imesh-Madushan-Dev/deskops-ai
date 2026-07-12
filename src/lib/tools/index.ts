import { createInventoryTools } from "./inventory";
import { createCustomerTools } from "./customer";
import { createBooksTools } from "./books";
import { createSalesTools } from "./sales";
import type { ToolContext } from "./context";

export type { ToolContext } from "./context";

/** All specialist tools in one set — per the architecture doc, specialists are scoped tool groups
 *  the orchestrator calls directly, not independently running agent processes. */
export function buildToolset(context: ToolContext) {
  return {
    ...createInventoryTools(context),
    ...createCustomerTools(context),
    ...createBooksTools(context),
    ...createSalesTools(context),
  };
}
