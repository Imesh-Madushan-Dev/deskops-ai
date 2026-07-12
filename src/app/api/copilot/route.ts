import { createTextStreamResponse, toTextStream, type ModelMessage } from "ai";
import { z } from "zod";
import { runOrchestrator } from "@/lib/agents/orchestrator";
import { getCurrentBusiness } from "@/lib/db/auth";

const requestSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(4000) }))
    .min(1)
    .max(40),
  path: z.string().max(300).optional(),
});

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
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });

  const { messages, path } = parsed.data;
  const last = messages[messages.length - 1];
  if (last.role !== "user") return Response.json({ error: "Last message must be from the user." }, { status: 400 });

  try {
    const contextNote = await resolvePageContext(path).catch(() => undefined);
    const result = await runOrchestrator({
      message: last.content,
      history: messages.slice(0, -1) as ModelMessage[],
      contextNote: contextNote
        ? `You are chatting with the business owner inside their dashboard (not with a customer). ${contextNote}`
        : "You are chatting with the business owner inside their dashboard (not with a customer).",
    });
    return createTextStreamResponse({ stream: toTextStream({ stream: result.fullStream }) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Copilot run failed" }, { status: 500 });
  }
}
