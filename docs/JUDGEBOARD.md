# Deskops AI — Agentic Use Cases (Judge Overview)

**One-liner:** Deskops AI is an AI back-office for small businesses. A customer messages the shop on WhatsApp; AI agents read it, check real stock and prices, draft the quote or invoice, and wait for the owner's one-tap approval before anything is sent. Every sale is booked automatically and the owner gets a verified daily insight.

Everything below is implemented and running in this repo — file paths are given so it can be verified.

---

## 1. The flagship agentic loop

> "Do you have 20 blue ones? How much?" → quote → approval → sale → books — with zero manual data entry.

1. **Inbound WhatsApp** — WAHA posts to `src/app/api/waha/webhook/route.ts`: signature verified, deduped via `webhook_events`, work enqueued, webhook returns instantly (never blocks on a model call).
2. **Async worker** (`src/lib/jobs/worker.ts`, triggered by pg_cron) picks up the job and runs the **Orchestrator**.
3. **Orchestrator** (`src/lib/agents/orchestrator.ts`) — a Vercel AI SDK multi-step tool loop (max 6 steps). It retrieves RAG context, then decides which specialist tools to call.
4. **Tools execute against the real database** — stock is checked, the customer's history looked up, an invoice drafted with totals computed *in code*.
5. **Guardrail** — the reply/invoice is written to the `approvals` table. The owner sees it in the dashboard (realtime), taps **Approve & send**, and only then does it reach the customer via WAHA.
6. **Books agent path** — on payment, `record_sale()` (one Postgres transaction) decrements stock, writes the ledger, and updates invoice status. A scheduled job then generates the **daily insight** from those deterministic numbers.

## 2. Multi-agent design

The Orchestrator routes intent to four specialists. Per the architecture doc, specialists are **scoped tool groups** invoked by one orchestrator (not free-running processes) — this keeps permission checks, tracing, and cost control in one place.

| Agent | Tools (in `src/lib/tools/`) | What it does |
|---|---|---|
| **Inventory** | `checkStock` | Real stock quantity + unit price by name/SKU |
| **Customer** | `lookupCustomer` | Customer profile + recent order history by WhatsApp number |
| **Sales / Invoicing** | `draftAndQueueInvoice` | Drafts an invoice from catalog prices and **queues it for approval** |
| **Books** | `getBooksSnapshot` | Income/expense totals for a date range, computed from the ledger |

Every tool has a zod input/output schema and one responsibility (`src/lib/tools/index.ts`). Sales tools are only mounted when the run is bound to a real customer conversation — the copilot can't accidentally invoice anyone.

## 3. RAG — grounded, not guessing

- Business data (products, invoices, customer history, docs) is chunked and embedded into a pgvector `embeddings` table (`src/lib/rag/ingest.ts`).
- Each agent run does a top-k similarity search **scoped to the business** through the `match_embeddings()` SQL function (`src/lib/rag/retrieve.ts`), and the hits are injected into the system prompt.
- `content_hash` prevents re-embedding unchanged content; HNSW index keeps retrieval fast.

## 4. Guardrails — the safety story

| Guardrail | Where |
|---|---|
| **Human-in-the-loop:** every money/outbound-message action becomes an `approvals` row; only owner/admin can approve; approvals expire in 24h and carry an idempotency key through execution and retries | `src/lib/db/approvals.ts`, worker, `/dashboard/approvals` |
| **Deterministic math:** all totals/tax computed in `src/lib/utils/money.ts`; the model only formats. `verifyAmountAgainstSource()` rejects any figure the model invents | `src/lib/ai/guardrails.ts` |
| **PII redaction:** phone numbers and emails stripped before anything hits logs or model traces (`redactPii`) | `src/lib/ai/guardrails.ts` |
| **Scope isolation:** Row Level Security on every business-scoped table; every query filtered by `business_id` | `supabase/migrations/` |
| **Bounded loops:** `stepCountIs(6)` caps tool steps; context is truncated; token usage of every run is logged to `model_usage` | orchestrator |
| **Configurable autopilot:** owner can enable auto-reply / auto-send-invoice per business — a deliberate, per-action opt-out of the queue, not a default | `/dashboard/approvals` |

## 5. Provider-agnostic model layer

`src/lib/ai/provider.ts` wraps Gemini (default), OpenAI, Anthropic, and Groq behind one `resolveModel()`. Each business picks its provider/model in **Settings → AI models**; unknown or keyless choices fall back safely. No vendor SDK is ever imported in agent code, so swapping models is a settings change, not a refactor.

## 6. Owner-facing agentic surfaces

- **Dashboard copilot** (`src/components/copilot/CopilotPanel.tsx` → `/api/copilot`): a streaming chat over the same orchestrator + tools, aware of which page the owner is viewing — "how much did I sell this week?" is answered from the ledger tool, not from memory.
- **Agent-drafted replies in the Inbox:** the owner can type a prompt and have the agent draft using live stock/customer context; the draft goes through approvals.
- **Daily insight** (`enqueueDailyInsightJobs` in the worker): one scheduled, idempotent insight per business per day, generated from deterministic metrics and shown on the Overview with a "numbers verified against your ledger" badge.
- **Realtime operations UI:** approvals, inbox, stock, and invoices update live via Supabase Realtime (`src/lib/query/realtime.ts`) — the owner watches the agent work.

## 7. Reliability & ops engineering

- **Idempotency everywhere:** webhook events, messages, jobs, and approval execution all dedupe by key — WhatsApp redeliveries can't double-send or double-charge.
- **Async job queue** with pg_cron trigger, batching, and retry; the webhook handler never blocks on an agent run.
- **Observability:** every run logs provider, model, and token counts to `model_usage` per business — the basis for cost caps.
- **Tests:** unit tests for tools and money math in `tests/`.

## 8. Concept → implementation map

| Concept | Where it lives |
|---|---|
| Multi-agent system | Orchestrator + 4 specialist tool groups |
| Tool calling | 4 zod-typed tools over live Postgres |
| RAG | pgvector + `match_embeddings()` scoped per business |
| Guardrails | Approval gate, PII redaction, numeric verification, RLS, step caps |
| Human-in-the-loop | `approvals` table + one-tap dashboard queue |
| Deployment | Next.js on Vercel + Supabase + WAHA, provider-swappable models |
