import { tool } from "ai";
import { z } from "zod";
import { getBooksSummary } from "@/lib/db/ledger";
import { getCurrentBusiness } from "@/lib/db/auth";
import type { ToolContext } from "./context";

export function createBooksTools(context: ToolContext) {
  const getBooksSnapshot = tool({
    description: "Get income/expense totals for a date range, computed from the real ledger — never estimate this yourself.",
    inputSchema: z.object({ from: z.string().datetime(), to: z.string().datetime() }),
    execute: async ({ from, to }) => {
      const { business } = await getCurrentBusiness(context.businessOverride);
      const summary = await getBooksSummary({ from, to }, context.businessOverride);
      return { currency: business.currency, ...summary };
    },
  });

  return { getBooksSnapshot };
}
