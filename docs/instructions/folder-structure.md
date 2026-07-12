# Deskops AI — Project Structure & Routes

<aside>
🗂️

**Complete project layout for Deskops AI.** The full `src/` folder tree, every page route, and every API route — referenced by the Engineering Guide so that guide stays readable. Keep this in sync as the codebase grows.

</aside>

## Full directory tree

```
deskops-ai/
├─ src/
│  ├─ app/                              # Next.js App Router
│  │  ├─ (auth)/                        # Public auth pages
│  │  │  ├─ login/page.tsx
│  │  │  └─ signup/page.tsx
│  │  ├─ (dashboard)/                   # Authed owner UI (RSC by default)
│  │  │  ├─ layout.tsx                  # Sidebar + auth guard
│  │  │  ├─ page.tsx                    # Home: daily insight + pending approvals
│  │  │  ├─ inbox/
│  │  │  │  ├─ page.tsx                 # Conversation list
│  │  │  │  └─ [conversationId]/page.tsx# Thread view + agent replies
│  │  │  ├─ products/
│  │  │  │  ├─ page.tsx                 # Catalog list
│  │  │  │  ├─ new/page.tsx
│  │  │  │  └─ [productId]/page.tsx
│  │  │  ├─ inventory/
│  │  │  │  ├─ page.tsx                 # Stock levels + low-stock
│  │  │  │  └─ reorders/page.tsx
│  │  │  ├─ invoices/
│  │  │  │  ├─ page.tsx
│  │  │  │  ├─ new/page.tsx
│  │  │  │  └─ [invoiceId]/page.tsx
│  │  │  ├─ customers/
│  │  │  │  ├─ page.tsx
│  │  │  │  └─ [customerId]/page.tsx
│  │  │  ├─ books/
│  │  │  │  ├─ page.tsx                 # Ledger
│  │  │  │  └─ reports/page.tsx
│  │  │  ├─ approvals/page.tsx          # Human-in-the-loop queue
│  │  │  └─ settings/
│  │  │     ├─ page.tsx                 # Business profile
│  │  │     ├─ team/page.tsx
│  │  │     ├─ integrations/page.tsx    # WAHA session + MCP servers
│  │  │     └─ models/page.tsx          # Provider/model selection
│  │  ├─ api/
│  │  │  ├─ waha/webhook/route.ts       # Inbound WhatsApp (verify + enqueue)
│  │  │  ├─ agent/run/route.ts          # Orchestrator entrypoint (streaming)
│  │  │  ├─ products/route.ts
│  │  │  ├─ products/[id]/route.ts
│  │  │  ├─ invoices/route.ts
│  │  │  ├─ invoices/[id]/route.ts
│  │  │  ├─ customers/route.ts
│  │  │  ├─ conversations/[id]/route.ts
│  │  │  ├─ approvals/route.ts
│  │  │  ├─ approvals/[id]/route.ts     # Approve/reject
│  │  │  ├─ reorders/route.ts
│  │  │  ├─ insights/route.ts
│  │  │  └─ rag/search/route.ts
│  │  ├─ providers.tsx                  # QueryClientProvider (client)
│  │  ├─ layout.tsx                     # Root layout (wraps Providers)
│  │  └─ globals.css
│  ├─ components/
│  │  ├─ ui/                            # Primitives (button, input, dialog)
│  │  ├─ inbox/
│  │  ├─ products/
│  │  ├─ invoices/
│  │  ├─ approvals/ApprovalCard.tsx
│  │  └─ dashboard/InsightCard.tsx
│  ├─ lib/
│  │  ├─ agents/                        # Orchestrator + specialist agents
│  │  │  ├─ orchestrator.ts
│  │  │  ├─ customer.ts
│  │  │  ├─ sales.ts
│  │  │  ├─ inventory.ts
│  │  │  ├─ books.ts
│  │  │  └─ prompts/                    # System prompt per agent
│  │  ├─ tools/                         # Tool defs (zod schema + handler)
│  │  │  ├─ index.ts                    # Tool registry
│  │  │  ├─ inventory.ts
│  │  │  ├─ sales.ts
│  │  │  ├─ customer.ts
│  │  │  └─ books.ts
│  │  ├─ ai/
│  │  │  ├─ provider.ts                 # Gemini / Claude / GPT switch
│  │  │  ├─ guardrails.ts
│  │  │  └─ embeddings.ts
│  │  ├─ rag/
│  │  │  ├─ ingest.ts
│  │  │  └─ retrieve.ts
│  │  ├─ db/
│  │  │  ├─ client.ts                   # Browser/anon client
│  │  │  ├─ server.ts                   # Server client (service role)
│  │  │  ├─ products.ts
│  │  │  ├─ invoices.ts
│  │  │  ├─ customers.ts
│  │  │  ├─ conversations.ts
│  │  │  └─ ledger.ts
│  │  ├─ query/                         # TanStack Query
│  │  │  ├─ keys.ts                     # qk key factory
│  │  │  ├─ products.ts
│  │  │  ├─ invoices.ts
│  │  │  └─ approvals.ts
│  │  ├─ waha/
│  │  │  ├─ client.ts                   # Send messages
│  │  │  └─ verify.ts                   # Webhook signature check
│  │  ├─ jobs/                          # Async webhook/approval/insight workers
│  │  │  ├─ enqueue.ts
│  │  │  └─ worker.ts
│  │  └─ utils/
│  │     ├─ money.ts                    # numeric math + formatting
│  │     └─ validation.ts               # shared zod schemas
│  ├─ types/
│  │  ├─ database.ts                    # supabase gen types typescript
│  │  └─ index.ts
│  └─ middleware.ts                     # Auth/session refresh
├─ supabase/
│  ├─ migrations/
│  │  ├─ 0001_init.sql                  # extensions + tables
│  │  ├─ 0002_rls.sql                   # RLS policies
│  │  └─ 0003_functions.sql             # match_embeddings, record_sale
│  └─ seed.sql
├─ tests/
│  ├─ tools/                            # Unit tests for tools + math
│  └─ agents/                           # Record/replay agent runs
├─ public/
├─ .env.local
├─ .env.example
├─ next.config.ts
├─ tailwind.config.ts
├─ tsconfig.json
└─ package.json
```

## Page routes (owner dashboard)

| Route | File | Purpose |
| --- | --- | --- |
| `/login` · `/signup` | `(auth)/login|signup/page.tsx` | Supabase auth |
| `/` | `(dashboard)/page.tsx` | Home — daily insight + pending approvals |
| `/inbox` | `(dashboard)/inbox/page.tsx` | WhatsApp conversation list |
| `/inbox/[conversationId]` | `inbox/[conversationId]/page.tsx` | Thread view + agent draft replies |
| `/products` | `products/page.tsx` | Catalog list |
| `/products/new` | `products/new/page.tsx` | Add a product |
| `/products/[productId]` | `products/[productId]/page.tsx` | Product detail / edit |
| `/inventory` | `inventory/page.tsx` | Stock levels + low-stock alerts |
| `/inventory/reorders` | `inventory/reorders/page.tsx` | Suggested / ordered restocks |
| `/invoices` | `invoices/page.tsx` | Invoice list |
| `/invoices/new` | `invoices/new/page.tsx` | Create / draft invoice |
| `/invoices/[invoiceId]` | `invoices/[invoiceId]/page.tsx` | Invoice detail + send |
| `/customers` | `customers/page.tsx` | Customer list |
| `/customers/[customerId]` | `customers/[customerId]/page.tsx` | Customer profile + history |
| `/books` | `books/page.tsx` | Ledger (income / expense) |
| `/books/reports` | `books/reports/page.tsx` | Summaries & exports |
| `/approvals` | `approvals/page.tsx` | Human-in-the-loop action queue |
| `/settings` | `settings/page.tsx` | Business profile, currency, timezone |
| `/settings/team` | `settings/team/page.tsx` | Members & roles |
| `/settings/integrations` | `settings/integrations/page.tsx` | WAHA session + MCP servers |
| `/settings/models` | `settings/models/page.tsx` | Model provider selection |

## API routes

| Route | Methods | Purpose |
| --- | --- | --- |
| `/api/waha/webhook` | POST | Inbound WhatsApp — verify signature, dedupe, enqueue |
| `/api/agent/run` | POST | Orchestrator entrypoint (streaming response) |
| `/api/products` | GET · POST | List / create products |
| `/api/products/[id]` | GET · PATCH · DELETE | Read / update / archive a product |
| `/api/invoices` | GET · POST | List / create invoices |
| `/api/invoices/[id]` | GET · PATCH | Read / update; trigger `record_sale` on pay |
| `/api/customers` | GET · POST | List / create customers |
| `/api/conversations/[id]` | GET | Load a thread + messages |
| `/api/approvals` | GET | Pending approvals for the business |
| `/api/approvals/[id]` | POST | Approve / reject an action |
| `/api/reorders` | GET · POST | List / create reorder suggestions |
| `/api/insights` | GET | Cached daily insight for a date |
| `/api/rag/search` | POST | pgvector similarity search (`match_embeddings`) |

<aside>
📏

**Route groups:** `(auth)` and `(dashboard)` are layout groups — they don't appear in the URL. The `(dashboard)/layout.tsx` enforces auth and renders the shared sidebar. Page routes are Server Components by default; they read directly from `lib/db` and prefetch into TanStack Query for instant first paint.

</aside>
