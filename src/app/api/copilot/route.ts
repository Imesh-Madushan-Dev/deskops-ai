import { z } from "zod";
import { runOrchestrator } from "@/lib/agents/orchestrator";
import { getCurrentBusiness } from "@/lib/db/auth";
import { assistantErrorMessage, assistantErrorResponse } from "@/lib/ai/errors";
import { parseChatMessages } from "@/lib/ai/messages";
import { checkAgentLimit } from "@/lib/ai/ratelimit";

// `nullish`, not `optional`: the dock sends `modelId: null` until the owner picks a model, and
// `optional()` rejects null — which failed every message on a fresh session before one was picked.
const requestSchema = z.object({ path: z.string().max(300).nullish(), modelId: z.string().max(120).nullish() });

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** Turns the dashboard path the owner is viewing into a system-prompt note. Only ids are
 *  trusted from the client — names come from RLS-scoped lookups, so a forged id resolves
 *  to nothing and the note is simply omitted. */
async function resolvePageContext(path: string | undefined): Promise<string | undefined> {
  if (!path) return undefined;
  const entity = new RegExp(`^/dashboard/(products|customers|invoices)/(${UUID})$`, "i").exec(path);
  if (!entity) {
    const section = /^\/dashboard\/?([a-z/-]*)/i.exec(path)?.[1]?.split("/")[0];
    return section ? `The owner is currently viewing the "${section}" page of their dashboard.` : undefined;
  }

  const { supabase } = await getCurrentBusiness();
  const [, table, id] = entity;
  if (table === "products") {
    const { data } = await supabase.from("products").select("name,sku,stock_qty,price").eq("id", id).maybeSingle();
    return data ? `The owner is currently viewing the product "${data.name}" (id ${id}, sku ${data.sku ?? "—"}, stock ${data.stock_qty}, price ${data.price}).` : undefined;
  }
  if (table === "customers") {
    const { data } = await supabase.from("customers").select("name").eq("id", id).maybeSingle();
    return data ? `The owner is currently viewing the customer "${data.name ?? "Unnamed"}" (id ${id}).` : undefined;
  }
  const { data } = await supabase.from("invoices").select("number,status,total").eq("id", id).maybeSingle();
  return data ? `The owner is currently viewing invoice ${data.number} (id ${id}, status ${data.status}, total ${data.total}).` : undefined;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  const chat = await parseChatMessages((body as { messages?: unknown } | null)?.messages);
  if (!parsed.success || !chat) return assistantErrorResponse(null, "bad_request");

  try {
    const { business } = await getCurrentBusiness();
    if (!(await checkAgentLimit(business.id))) return assistantErrorResponse(null, "rate_limited");

    const contextNote = await resolvePageContext(parsed.data.path ?? undefined).catch(() => undefined);
    const result = await runOrchestrator({
      message: chat.message,
      history: chat.history,
      surface: "owner",
      // Fast, not thinking: the thinking model burns the scarcest per-model daily quota and
      // was the config that intermittently finished a tool-using run with no answer at all.
      // The dock's picker reaches the deeper models in one click when a question needs it.
      tier: "fast",
      modelId: parsed.data.modelId ?? undefined,
      contextNote: contextNote
        ? `You are chatting with the business owner inside their dashboard (not with a customer). ${contextNote}`
        : "You are chatting with the business owner inside their dashboard (not with a customer).",
    });
    return result.toUIMessageStreamResponse({ onError: assistantErrorMessage, sendReasoning: result.thinks });
  } catch (error) {
    return assistantErrorResponse(error);
  }
}
