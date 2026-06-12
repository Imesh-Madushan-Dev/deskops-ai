# Deskops AI — Engineering Guide (for Claude Code)

<aside>
🤖

**Read this first.** This is the canonical context for any AI coding agent (Claude Code) working on Deskops AI. It defines the architecture, conventions, full DB design, performance rules, and the mistakes to avoid. When in doubt, follow this doc; if you deviate, say why.

</aside>

## 1. What we're building

Deskops AI is a multi-agent AI back-office for small businesses. An **Orchestrator** routes customer/owner intent to specialist agents (Customer, Sales/Invoicing, Inventory, Books) that call tools, retrieve grounded context (RAG), and pass through a **guardrails** layer before any real-world action. See the System Architecture page for diagrams.

**Stack:** Next.js (App Router) on Vercel · Vercel AI SDK · TanStack Query (client data) · Supabase (Postgres + pgvector + Auth) · WAHA for WhatsApp · Gemini (primary model, provider-swappable).

## 2. Project structure

The **full folder tree** — plus every page route and API route — lives on its own page: see [**Deskops AI — Project Structure & Routes**](./folder-structure.md) below. High-level map:

```
src/
├─ app/         # App Router: (auth), (dashboard) pages, api/ routes, providers.tsx
├─ components/  # UI (client)
├─ lib/
│  ├─ agents/   # Orchestrator + specialist agents
│  ├─ tools/    # Tool defs (zod schema + handler)
│  ├─ ai/       # Model provider switch, guardrails, embeddings
│  ├─ rag/      # Ingest + retrieve
│  ├─ db/       # Supabase clients + typed queries
│  ├─ query/    # TanStack Query (keys, hooks)
│  └─ waha/     # WhatsApp client + webhook verify
└─ types/       # Generated DB types
supabase/migrations/  ·  tests/  ·  middleware.ts
```

<aside>
📏

**Rule:** all agent logic lives in `lib/agents` and `lib/tools` — never inside React components or route handlers. Routes only validate input, authenticate, and delegate.

</aside>

## 3. Coding conventions

- **TypeScript strict mode**, no `any`. Validate all external input with **zod** (webhooks, tool args, API bodies).
- **Server Components by default**; use Client Components only for interactivity. Keep secrets server-side only.
- **Client data via TanStack Query** — never fetch with raw `useEffect`. Server Components read directly from `lib/db`.
- Database access only through `lib/db`; generate types with `supabase gen types typescript`.
- Pure functions for business math (totals, tax). No model output is ever trusted for numbers.
- Small, named tools with explicit zod input/output schemas. One responsibility each.

## 4. Agent layer (Vercel AI SDK)

Use the SDK's multi-step tool-calling loop. The Orchestrator decides which tools/agents to call; specialist logic is encapsulated as tools.

```tsx
// src/lib/tools/inventory.ts
import { tool } from "ai"
import { z } from "zod"
import { getStock } from "@/lib/db/products"

export const checkStock = tool({
  description: "Check stock and unit price for a product by name.",
  parameters: z.object({
    businessId: z.string().uuid(),
    query: z.string(),
  }),
  execute: async ({ businessId, query }) => {
    return getStock(businessId, query) // returns { name, stockQty, price }
  },
})
```

```tsx
// src/lib/agents/orchestrator.ts
import { generateText } from "ai"
import { model } from "@/lib/ai/provider" // gemini by default
import { tools } from "@/lib/tools"

export async function runOrchestrator(input: { businessId: string; message: string }) {
  return generateText({
    model,
    system: orchestratorSystemPrompt(input.businessId),
    messages: [{ role: "user", content: input.message }],
    tools,
    maxSteps: 6, // allow multi-step tool calling
  })
}
```

<aside>
🔌

**Provider-agnostic:** wrap the model in `lib/ai/provider.ts` so switching Gemini → Claude → GPT is a one-line change. Never import a vendor SDK directly in agent code.

</aside>

**MCP:** expose external integrations (Google Sheets, accounting) as MCP servers and connect them via the AI SDK's MCP client, so capabilities are pluggable without touching core agents.

## 5. Data fetching (TanStack Query)

All **client-side** reads/writes go through TanStack Query (React Query). Server Components still read directly from `lib/db` and may prefetch into the query cache for instant first paint.

```tsx
// src/app/providers.tsx
"use client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}
```

```tsx
// src/lib/query/keys.ts  — single source of truth for cache keys
export const qk = {
  products: (businessId: string) => ["products", businessId] as const,
  invoices: (businessId: string) => ["invoices", businessId] as const,
  approvals: (businessId: string) => ["approvals", businessId] as const,
  conversation: (id: string) => ["conversation", id] as const,
  insight: (businessId: string, date: string) => ["insight", businessId, date] as const,
}
```

```tsx
// src/lib/query/products.ts  — a typed query hook
import { useQuery } from "@tanstack/react-query"
import { qk } from "./keys"

export function useProducts(businessId: string) {
  return useQuery({
    queryKey: qk.products(businessId),
    queryFn: async () => {
      const res = await fetch(`/api/products?b=${businessId}`)
      if (!res.ok) throw new Error("Failed to load products")
      return (await res.json()) as Product[]
    },
  })
}
```

```tsx
// src/lib/query/approvals.ts  — mutation with optimistic update + invalidation
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { qk } from "./keys"

export function useApprove(businessId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/approvals/${id}`, { method: "POST" }).then((r) => r.json()),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.approvals(businessId) })
      const prev = qc.getQueryData<Approval[]>(qk.approvals(businessId))
      qc.setQueryData<Approval[]>(qk.approvals(businessId), (old = []) =>
        old.filter((a) => a.id !== id),
      )
      return { prev }
    },
    onError: (_e, _id, ctx) => qc.setQueryData(qk.approvals(businessId), ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.approvals(businessId) }),
  })
}
```

```tsx
// Server-side prefetch + hydration for instant first paint
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import { getProducts } from "@/lib/db/products"
import { qk } from "@/lib/query/keys"

export default async function Page({ businessId }: { businessId: string }) {
  const qc = new QueryClient()
  await qc.prefetchQuery({
    queryKey: qk.products(businessId),
    queryFn: () => getProducts(businessId),
  })
  return (
    <HydrationBoundary state={dehydrate(qc)}>
      {/* client components call useProducts(businessId) */}
    </HydrationBoundary>
  )
}
```

<aside>
📦

**TanStack rules:** one `qk` key factory (no hardcoded strings) · invalidate the relevant key after every mutation · use optimistic updates for snappy UX (approvals, stock) · prefetch on the server + `HydrationBoundary` · tune `staleTime` per query so you don't refetch constantly.

</aside>

## 6. Database design

The **complete schema** lives on its own page so this guide stays readable: see [**Deskops AI — Database Design**](Deskops%20AI%20%E2%80%94%20Database%20Design%2037cb2508c40e80e0b308ce7db628d3e5.md) below. That page is authoritative — keep `supabase/migrations` in sync with it.

<aside>
🗄️

**What's on the database page:** all 20+ tables (identity, customers, conversations, catalog, inventory, sales, payments, books, RAG, approvals, ops), the `vector` + `pgcrypto` extensions, the `auth_business_ids()` helper, `updated_at` triggers, the **pgvector** HNSW index + `match_embeddings()` similarity RPC, the atomic `record_sale()` transaction, and **RLS** enabled on every business-scoped table.

</aside>

**Non-negotiables (quick reference):**

- Every business-scoped table carries `business_id` and has **RLS** enabled from day one.
- Store money as `numeric(12,2)` — never floats.
- Stock + ledger + invoice status changes run inside `record_sale()` (one transaction).
- `idempotency_key` on approvals and `unique` constraints on `webhook_events` / `messages` prevent double-processing.
- `webhook_events` has no RLS — it's written only by the server-only `service_role` client.

## 7. Caching & performance

| Layer | Strategy |
| --- | --- |
| Client data | TanStack Query cache (staleTime + invalidation); optimistic updates for approvals/stock |
| RAG retrieval | Cache embeddings (never re-embed unchanged content via `content_hash`); HNSW index; top-k only (k=5–8) |
| Model calls | Cache deterministic sub-results; keep prompts short; pass only retrieved context, not whole tables |
| Server reads | Next.js Data Cache / `unstable_cache` for dashboards; prefetch + `HydrationBoundary`; revalidate on write |
| Hot keys | Optional Upstash Redis for session/conversation state + rate-limit counters |
| DB | Index every `business_id` and FK; use Supabase connection pooler (pgbouncer) for serverless |
- Stream agent responses to the UI (`streamText`) so the owner sees progress immediately.
- Run independent tool calls concurrently; await only what the next step needs.
- Keep embeddings dimension aligned with the model; re-embed only on content change (compare `content_hash`).

## 8. Best practices

- **Human-in-the-loop:** every money/message action writes an `approvals` row and waits. The agent never sends autonomously.
- **Deterministic math in code**, formatting in the model. Verify any number the model echoes against the DB.
- **Structured outputs:** use zod-validated tool results; reject/repair malformed model output instead of trusting it.
- **Observability:** log every agent step, tool call, and token cost with a `trace_id` (mirror into `model_usage`).
- **Migrations as source of truth** in `supabase/migrations`; never hand-edit prod schema.
- **Secrets** only in server env; rotate WAHA + Supabase keys.

## 9. What to avoid

<aside>
🚫

Anti-patterns that will cost points (and break in production).

</aside>

- ❌ Letting the model output prices/totals directly — always compute in code.
- ❌ Fetching client data with raw `useEffect` instead of TanStack Query.
- ❌ Calling vendor model SDKs directly in agents — go through the provider wrapper.
- ❌ Skipping RLS or using the service-role key client-side.
- ❌ One giant "do everything" prompt instead of small, composable tools.
- ❌ Auto-sending WhatsApp messages without the approval gate.
- ❌ Re-embedding unchanged content on every request (slow + costly).
- ❌ Storing money as float; doing tax math in the prompt.
- ❌ Blocking the webhook handler on a long agent run — enqueue and process async.
- ❌ Unbounded `maxSteps` / no timeout — cap tool loops and token budgets.

## 10. Things easy to miss

- **WAHA webhook security:** verify the shared secret/signature and that the session is yours before processing. Dedupe via `webhook_events`.
- **Idempotency everywhere:** WhatsApp and webhooks redeliver; dedupe by message id.
- **Rate limiting & abuse:** throttle inbound messages per number; cap model spend per business per day.
- **Cost guardrails:** track tokens per request in `model_usage`; set a hard monthly budget alarm.
- **Cold starts:** serverless + DB pooler; keep agent route warm if latency matters for the demo.
- **Timezone & currency:** store UTC, render in the business's locale (LKR, Asia/Colombo).
- **PII:** redact phone numbers/customer data from logs and model traces; document data retention.
- **Error UX:** if an agent fails, fall back to a human-handoff message, never silence.
- **Testing:** unit-test tools and math; record/replay a few end-to-end agent runs for the demo.
- **Accessibility & mobile:** owners will use the dashboard on a phone — design mobile-first.

## 11. Environment variables

```
# Model
GEMINI_API_KEY=
AI_PROVIDER=gemini            # gemini | anthropic | openai

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=    # server only, bypasses RLS

# WAHA
WAHA_BASE_URL=
WAHA_API_KEY=
WAHA_WEBHOOK_SECRET=

# Optional
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

[Deskops AI — Database Design](Deskops%20AI%20%E2%80%94%20Database%20Design%2037cb2508c40e80e0b308ce7db628d3e5.md)

[Deskops AI — Project Structure & Routes](Deskops%20AI%20%E2%80%94%20Project%20Structure%20&%20Routes%2016b2633602d94b5bb2d4b7dd492bff9b.md)