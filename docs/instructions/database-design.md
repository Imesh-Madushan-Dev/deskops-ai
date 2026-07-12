# Deskops AI — Database Design

<aside>
🗄️

**Complete database schema for Deskops AI.** Postgres (Supabase) is the single source of truth. Every business-scoped table carries `business_id` and is protected by **Row Level Security**. Migrations in `supabase/migrations` are authoritative — keep them in sync with this page. This is the full design referenced by the Engineering Guide.

</aside>

## Table overview

| Table | Purpose |
| --- | --- |
| `businesses` | Tenant root; owner, currency, timezone, WAHA session, settings |
| `business_members` | Team access + roles (owner/admin/staff) |
| `customers` | End customers keyed by WhatsApp number |
| `conversations` / `messages` | WhatsApp threads and individual messages (with dedupe id) |
| `product_categories` / `suppliers` | Catalog organization and restock sources |
| `products` / `stock_movements` | Catalog + auditable stock ledger |
| `invoices` / `invoice_items` | Sales documents and their line items |
| `payments` / `ledger_entries` | Money received and the income/expense book |
| `reorders` | Suggested/ordered restocks |
| `documents` / `embeddings` | RAG source docs and pgvector index |
| `approvals` | Human-in-the-loop gate for agent actions |
| `model_usage` | Token + cost tracking per request |
| `webhook_events` | Inbound event dedupe (idempotency) |
| `jobs` | Async webhook, approval-send, and daily-insight work |
| `audit_logs` / `daily_insights` | Action trail and cached daily summaries |

## Extensions, helpers & triggers

```sql
create extension if not exists vector;     -- pgvector for RAG
create extension if not exists pgcrypto;   -- gen_random_uuid()

-- updated_at trigger helper
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- Businesses the current user may access (owner or active member)
create or replace function auth_business_ids()
returns setof uuid language sql stable security definer as $$
  select b.id
  from businesses b
  left join business_members m on m.business_id = b.id
  where b.owner_user_id = auth.uid()
     or (m.user_id = auth.uid() and m.status = 'active');
$$;
```

## Identity & customers

```sql
create table businesses (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id),
  name text not null,
  currency text not null default 'LKR',
  timezone text not null default 'Asia/Colombo',
  whatsapp_session text,                 -- WAHA session name
  settings jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  role text not null default 'staff',     -- owner|admin|staff
  status text not null default 'active',   -- active|invited|disabled
  created_at timestamptz default now(),
  unique (business_id, user_id)
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text,
  whatsapp_number text not null,
  email text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (business_id, whatsapp_number)
);
```

## Conversations & messages

```sql
create table conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  channel text not null default 'whatsapp',
  status text not null default 'open',     -- open|snoozed|closed
  last_message_at timestamptz,
  created_at timestamptz default now()
);
create index on conversations (business_id, last_message_at desc);

create table messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  direction text not null,                 -- inbound|outbound
  sender text not null,                    -- customer|agent|owner
  body text,
  waha_message_id text,                    -- dedupe / idempotency
  created_at timestamptz default now(),
  unique (business_id, waha_message_id)
);
create index on messages (conversation_id, created_at);
create index on messages (business_id, created_at);
```

## Catalog & inventory

```sql
create table product_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null
);

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  whatsapp_number text,
  notes text
);

create table products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  category_id uuid references product_categories(id) on delete set null,
  supplier_id uuid references suppliers(id) on delete set null,
  sku text,
  name text not null,
  price numeric(12,2) not null,
  cost numeric(12,2),
  stock_qty integer not null default 0,
  reorder_level integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (business_id, sku)
);
create index on products (business_id);
create index on products (business_id, is_active);

create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  delta integer not null,                  -- +received / -sold
  reason text not null,                    -- sale|restock|adjustment
  ref_id uuid,                             -- invoice / reorder id
  created_at timestamptz default now()
);
create index on stock_movements (business_id, product_id, created_at);
```

## Sales, payments & books

```sql
create table invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  number text,                             -- human-facing invoice no.
  status text not null default 'draft',    -- draft|sent|paid|void
  subtotal numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  issued_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (business_id, number)
);
create index on invoices (business_id, status);

create table invoice_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  description text not null,
  qty integer not null,
  unit_price numeric(12,2) not null,
  line_total numeric(12,2) not null
);
create index on invoice_items (invoice_id);
create index on invoice_items (business_id);

create table payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  invoice_id uuid references invoices(id) on delete set null,
  amount numeric(12,2) not null,
  method text not null default 'cash',     -- cash|bank|card|other
  paid_at timestamptz default now()
);
create index on payments (business_id, invoice_id);

create table ledger_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  type text not null,                      -- income|expense
  amount numeric(12,2) not null,
  category text,
  ref_invoice_id uuid references invoices(id) on delete set null,
  occurred_at timestamptz default now(),
  created_at timestamptz default now()
);
create index on ledger_entries (business_id, occurred_at);

create table reorders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  supplier_id uuid references suppliers(id) on delete set null,
  qty integer not null,
  status text not null default 'suggested', -- suggested|ordered|received
  created_at timestamptz default now()
);
```

## AI, approvals & ops

```sql
create table documents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  source text not null,                    -- doc|policy|faq
  title text,
  content text not null,
  content_hash text not null,              -- re-embed only on change
  created_at timestamptz default now()
);

create table embeddings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  source text not null,                    -- product|invoice|customer|doc
  source_id uuid,
  content text not null,
  embedding vector(768),                   -- match Gemini embedding dim
  created_at timestamptz default now()
);
create index on embeddings using hnsw (embedding vector_cosine_ops);
create index on embeddings (business_id);

create table approvals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  action_type text not null,               -- send_invoice|send_message|reorder
  payload jsonb not null,
  status text not null default 'pending',  -- pending|approved|rejected|expired
  idempotency_key text unique,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  created_at timestamptz default now()
);
create index on approvals (business_id, status);

create table model_usage (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  trace_id text,
  provider text not null,                  -- gemini|anthropic|openai
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd numeric(10,4) not null default 0,
  created_at timestamptz default now()
);
create index on model_usage (business_id, created_at);

create table webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,                  -- waha
  external_id text not null,               -- dedupe key
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz default now(),
  unique (provider, external_id)
);

-- Webhooks create a job and return immediately. A worker claims/retries jobs.
create table jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  webhook_event_id uuid unique references webhook_events(id) on delete cascade,
  type text not null,                     -- process_message|send_approved_action|daily_insight
  payload jsonb not null default '{}',
  status text not null default 'pending',  -- pending|processing|completed|failed
  attempts integer not null default 0,
  run_after timestamptz not null default now(),
  last_error text,
  created_at timestamptz default now(),
  completed_at timestamptz
);
create index on jobs (status, run_after);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  actor text not null,                     -- user id | 'agent'
  action text not null,
  target jsonb,
  created_at timestamptz default now()
);

create table daily_insights (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  for_date date not null,
  summary text not null,
  metrics jsonb not null default '{}',
  created_at timestamptz default now(),
  unique (business_id, for_date)
);
```

## updated_at triggers

```sql
create trigger trg_businesses_updated before update on businesses
  for each row execute function set_updated_at();
create trigger trg_customers_updated before update on customers
  for each row execute function set_updated_at();
create trigger trg_products_updated before update on products
  for each row execute function set_updated_at();
create trigger trg_invoices_updated before update on invoices
  for each row execute function set_updated_at();
```

## pgvector similarity search (RPC)

```sql
-- Top-k similarity search, scoped to one business
create or replace function match_embeddings(
  p_business_id uuid,
  query_embedding vector(768),
  match_count int default 6
)
returns table (id uuid, source text, source_id uuid, content text, similarity float)
language sql stable as $$
  select e.id, e.source, e.source_id, e.content,
         1 - (e.embedding <=> query_embedding) as similarity
  from embeddings e
  where e.business_id = p_business_id
  order by e.embedding <=> query_embedding
  limit match_count;
$$;
```

## Atomic sale (single transaction)

```sql
-- Lock invoice/products, verify availability, then write payment, stock and ledger once.
create or replace function record_sale(p_invoice_id uuid)
returns void language plpgsql as $$
declare item record; inv invoices%rowtype;
begin
  select * into inv from invoices where id = p_invoice_id for update;
  if not found then raise exception 'Invoice not found'; end if;
  if inv.status = 'paid' then return; end if;
  if inv.status not in ('sent', 'draft') then raise exception 'Invoice cannot be paid'; end if;
  for item in select * from invoice_items where invoice_id = p_invoice_id loop
    update products set stock_qty = stock_qty - item.qty
      where id = item.product_id and business_id = inv.business_id and stock_qty >= item.qty;
    if not found then raise exception 'Insufficient stock for product %', item.product_id; end if;
    insert into stock_movements(business_id, product_id, delta, reason, ref_id)
    values (inv.business_id, item.product_id, -item.qty, 'sale', p_invoice_id);
  end loop;
  insert into payments(business_id, invoice_id, amount) values (inv.business_id, inv.id, inv.total);
  insert into ledger_entries(business_id, type, amount, category, ref_invoice_id)
  values (inv.business_id, 'income', inv.total, 'sales', inv.id);
  update invoices set status = 'paid' where id = p_invoice_id;
end; $$;
```

## Row Level Security (every table)

```sql
alter table businesses        enable row level security;
alter table business_members  enable row level security;
alter table customers         enable row level security;
alter table conversations     enable row level security;
alter table messages          enable row level security;
alter table product_categories enable row level security;
alter table suppliers         enable row level security;
alter table products          enable row level security;
alter table stock_movements   enable row level security;
alter table invoices          enable row level security;
alter table invoice_items     enable row level security;
alter table payments          enable row level security;
alter table ledger_entries    enable row level security;
alter table reorders          enable row level security;
alter table documents         enable row level security;
alter table embeddings        enable row level security;
alter table approvals         enable row level security;
alter table model_usage       enable row level security;
alter table audit_logs        enable row level security;
alter table daily_insights    enable row level security;
alter table jobs              enable row level security;

-- Businesses: members read; only the owner manages ownership
create policy "members read business" on businesses
  for select using (id in (select auth_business_ids()));
create policy "owner manages business" on businesses
  for all using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

-- Generic tenant policy. Repeat verbatim for every business-scoped table,
-- swapping the table name (customers shown as the template):
create policy "own business" on customers
  for all using (business_id in (select auth_business_ids()))
  with check (business_id in (select auth_business_ids()));
-- Apply the identical "own business" policy to:
--   business_members, conversations, messages, product_categories,
--   suppliers, products, stock_movements, invoices, invoice_items,
--   payments, ledger_entries, reorders, documents, embeddings,
--   approvals, model_usage, audit_logs, daily_insights, jobs
```

<aside>
⚠️

**RLS is non-negotiable.** Enable it on every business-scoped table from day one. `webhook_events` has **no** RLS and no browser access: it is written only by the verified WAHA webhook using the server-only `service_role` client. The webhook resolves the WAHA session to a business before creating its related `jobs` row. Never expose that key to the browser.

</aside>

## Money & integrity

- Store money as `numeric(12,2)` — never floats.
- Stock changes and sale logging run inside `record_sale()` (one transaction) so they can't desync.
- Use `idempotency_key` on approvals and `unique` constraints on `webhook_events` / `messages` to prevent double-processing and double-sending.
- Index every `business_id` and foreign key; use the Supabase connection pooler (pgbouncer) for serverless.
- Store timestamps in UTC and render them using `businesses.timezone` (default `Asia/Colombo`). Tax and invoice numbers are deterministic application rules; the model may explain totals but never calculate them.
