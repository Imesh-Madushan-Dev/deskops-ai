create extension if not exists pgcrypto;
create extension if not exists vector;

create schema if not exists private;

create type public.member_role as enum ('owner', 'admin', 'staff');
create type public.invoice_status as enum ('draft', 'sent', 'paid', 'void');
create type public.approval_status as enum ('pending', 'approved', 'rejected', 'expired', 'executed', 'failed');

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 120),
  currency text not null default 'LKR' check (currency ~ '^[A-Z]{3}$'),
  timezone text not null default 'Asia/Colombo',
  whatsapp_session text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_members (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'staff',
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);
create index business_members_user_business_idx on public.business_members (user_id, business_id);

create or replace function private.business_ids_for_current_user()
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select b.id from public.businesses b
  where b.owner_user_id = (select auth.uid())
  union
  select m.business_id from public.business_members m
  where m.user_id = (select auth.uid());
$$;
revoke all on function private.business_ids_for_current_user() from public;
grant execute on function private.business_ids_for_current_user() to authenticated;

create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text,
  whatsapp_number text not null,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, whatsapp_number)
);
create index customers_business_created_idx on public.customers (business_id, created_at desc);

create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (business_id, name)
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  whatsapp_number text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  category_id uuid references public.product_categories(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  sku text,
  name text not null,
  price numeric(12,2) not null check (price >= 0),
  cost numeric(12,2) check (cost is null or cost >= 0),
  stock_qty integer not null default 0 check (stock_qty >= 0),
  reorder_level integer not null default 0 check (reorder_level >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, sku)
);
create index products_business_active_idx on public.products (business_id, is_active) where is_active;

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  delta integer not null,
  reason text not null check (reason in ('sale', 'restock', 'adjustment')),
  ref_id uuid,
  created_at timestamptz not null default now()
);
create index stock_movements_business_product_idx on public.stock_movements (business_id, product_id, created_at desc);

create table public.reorders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  quantity integer not null check (quantity > 0),
  status text not null default 'suggested' check (status in ('suggested', 'ordered', 'received')),
  created_at timestamptz not null default now()
);
create index reorders_business_status_idx on public.reorders (business_id, status);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  channel text not null default 'whatsapp' check (channel in ('whatsapp', 'dashboard')),
  status text not null default 'open' check (status in ('open', 'snoozed', 'closed')),
  last_message_at timestamptz,
  created_at timestamptz not null default now()
);
create index conversations_business_last_message_idx on public.conversations (business_id, last_message_at desc nulls last);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  sender text not null check (sender in ('customer', 'agent', 'owner')),
  body text not null,
  provider_message_id text,
  created_at timestamptz not null default now(),
  unique (business_id, provider_message_id)
);
create index messages_conversation_created_idx on public.messages (conversation_id, created_at);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  number text not null,
  status public.invoice_status not null default 'draft',
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  tax numeric(12,2) not null default 0 check (tax >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  issued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, number)
);
create index invoices_business_status_created_idx on public.invoices (business_id, status, created_at desc);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  description text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  line_total numeric(12,2) not null check (line_total >= 0)
);
create index invoice_items_invoice_idx on public.invoice_items (invoice_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete set null,
  amount numeric(12,2) not null check (amount >= 0),
  method text not null default 'cash' check (method in ('cash', 'bank', 'card', 'other')),
  paid_at timestamptz not null default now()
);
create index payments_business_invoice_idx on public.payments (business_id, invoice_id);

create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  action_type text not null check (action_type in ('send_message', 'send_invoice', 'mark_invoice_paid', 'reorder')),
  payload jsonb not null,
  status public.approval_status not null default 'pending',
  idempotency_key text not null unique,
  expires_at timestamptz not null default now() + interval '24 hours',
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index approvals_pending_idx on public.approvals (business_id, created_at desc) where status = 'pending';

create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete set null,
  entry_type text not null check (entry_type in ('income', 'expense')),
  amount numeric(12,2) not null check (amount >= 0),
  category text not null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index ledger_business_occurred_idx on public.ledger_entries (business_id, occurred_at desc);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  source text not null check (source in ('doc', 'policy', 'faq')),
  title text,
  content text not null,
  content_hash text not null,
  created_at timestamptz not null default now()
);
create index documents_business_idx on public.documents (business_id);

create table public.embeddings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  source text not null check (source in ('product', 'invoice', 'customer', 'doc')),
  source_id uuid,
  content text not null,
  content_hash text not null,
  embedding vector(768),
  created_at timestamptz not null default now()
);
create index embeddings_business_idx on public.embeddings (business_id);
create index embeddings_source_idx on public.embeddings (business_id, source, source_id);
create index embeddings_hnsw_idx on public.embeddings using hnsw (embedding vector_cosine_ops);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'waha',
  external_id text not null,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, external_id)
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  webhook_event_id uuid references public.webhook_events(id) on delete cascade,
  job_type text not null check (job_type in ('process_message', 'send_approved_action', 'daily_insight')),
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null unique,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  attempts integer not null default 0,
  run_after timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index jobs_ready_idx on public.jobs (run_after) where status = 'pending';

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  actor_id uuid references auth.users(id),
  action text not null,
  target jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_business_created_idx on public.audit_logs (business_id, created_at desc);

create table public.model_usage (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  trace_id text,
  provider text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd numeric(10,4) not null default 0,
  created_at timestamptz not null default now()
);
create index model_usage_business_created_idx on public.model_usage (business_id, created_at desc);

create table public.daily_insights (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  for_date date not null,
  summary text not null,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (business_id, for_date)
);

create trigger businesses_updated_at before update on public.businesses for each row execute function private.set_updated_at();
create trigger customers_updated_at before update on public.customers for each row execute function private.set_updated_at();
create trigger products_updated_at before update on public.products for each row execute function private.set_updated_at();
create trigger invoices_updated_at before update on public.invoices for each row execute function private.set_updated_at();

-- Top-k pgvector similarity search, scoped to one business.
create or replace function public.match_embeddings(
  p_business_id uuid,
  query_embedding vector(768),
  match_count int default 6
)
returns table (id uuid, source text, source_id uuid, content text, similarity float)
language sql stable security definer as $$
  select e.id, e.source, e.source_id, e.content,
         1 - (e.embedding <=> query_embedding) as similarity
  from public.embeddings e
  where e.business_id = p_business_id
  order by e.embedding <=> query_embedding
  limit match_count;
$$;
revoke all on function public.match_embeddings(uuid, vector, int) from public;
grant execute on function public.match_embeddings(uuid, vector, int) to authenticated, service_role;

-- Locks the invoice + line-item products, verifies stock, then writes payment,
-- stock movements and the ledger entry as one atomic transaction.
create or replace function public.record_sale(p_invoice_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare item record; inv public.invoices%rowtype;
begin
  select * into inv from public.invoices where id = p_invoice_id for update;
  if not found then raise exception 'Invoice not found'; end if;
  if inv.status = 'paid' then return; end if;
  if inv.status not in ('sent', 'draft') then raise exception 'Invoice cannot be paid'; end if;

  for item in select * from public.invoice_items where invoice_id = p_invoice_id loop
    if item.product_id is not null then
      update public.products set stock_qty = stock_qty - item.quantity
        where id = item.product_id and business_id = inv.business_id and stock_qty >= item.quantity;
      if not found then raise exception 'Insufficient stock for product %', item.product_id; end if;
      insert into public.stock_movements(business_id, product_id, delta, reason, ref_id)
      values (inv.business_id, item.product_id, -item.quantity, 'sale', p_invoice_id);
    end if;
  end loop;

  insert into public.payments(business_id, invoice_id, amount) values (inv.business_id, inv.id, inv.total);
  insert into public.ledger_entries(business_id, invoice_id, entry_type, amount, category)
  values (inv.business_id, inv.id, 'income', inv.total, 'sales');
  update public.invoices set status = 'paid' where id = p_invoice_id;
end; $$;
revoke all on function public.record_sale(uuid) from public;
grant execute on function public.record_sale(uuid) to authenticated, service_role;

alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.customers enable row level security;
alter table public.product_categories enable row level security;
alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.stock_movements enable row level security;
alter table public.reorders enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;
alter table public.approvals enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.documents enable row level security;
alter table public.embeddings enable row level security;
alter table public.model_usage enable row level security;
alter table public.daily_insights enable row level security;
alter table public.jobs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.webhook_events enable row level security;

create policy businesses_select on public.businesses for select to authenticated using (id in (select private.business_ids_for_current_user()));
create policy businesses_insert on public.businesses for insert to authenticated with check (owner_user_id = (select auth.uid()));
create policy businesses_update on public.businesses for update to authenticated using (owner_user_id = (select auth.uid())) with check (owner_user_id = (select auth.uid()));
create policy members_select on public.business_members for select to authenticated using (business_id in (select private.business_ids_for_current_user()));
create policy members_manage on public.business_members for all to authenticated using (business_id in (select private.business_ids_for_current_user())) with check (business_id in (select private.business_ids_for_current_user()));

create policy customers_tenant on public.customers for all to authenticated using (business_id in (select private.business_ids_for_current_user())) with check (business_id in (select private.business_ids_for_current_user()));
create policy product_categories_tenant on public.product_categories for all to authenticated using (business_id in (select private.business_ids_for_current_user())) with check (business_id in (select private.business_ids_for_current_user()));
create policy suppliers_tenant on public.suppliers for all to authenticated using (business_id in (select private.business_ids_for_current_user())) with check (business_id in (select private.business_ids_for_current_user()));
create policy products_tenant on public.products for all to authenticated using (business_id in (select private.business_ids_for_current_user())) with check (business_id in (select private.business_ids_for_current_user()));
create policy stock_movements_tenant on public.stock_movements for select to authenticated using (business_id in (select private.business_ids_for_current_user()));
create policy reorders_tenant on public.reorders for all to authenticated using (business_id in (select private.business_ids_for_current_user())) with check (business_id in (select private.business_ids_for_current_user()));
create policy conversations_tenant on public.conversations for all to authenticated using (business_id in (select private.business_ids_for_current_user())) with check (business_id in (select private.business_ids_for_current_user()));
create policy messages_tenant on public.messages for all to authenticated using (business_id in (select private.business_ids_for_current_user())) with check (business_id in (select private.business_ids_for_current_user()));
create policy invoices_tenant on public.invoices for all to authenticated using (business_id in (select private.business_ids_for_current_user())) with check (business_id in (select private.business_ids_for_current_user()));
create policy invoice_items_tenant on public.invoice_items for all to authenticated using (business_id in (select private.business_ids_for_current_user())) with check (business_id in (select private.business_ids_for_current_user()));
create policy payments_tenant on public.payments for select to authenticated using (business_id in (select private.business_ids_for_current_user()));
create policy approvals_tenant on public.approvals for all to authenticated using (business_id in (select private.business_ids_for_current_user())) with check (business_id in (select private.business_ids_for_current_user()));
create policy ledger_tenant on public.ledger_entries for select to authenticated using (business_id in (select private.business_ids_for_current_user()));
create policy documents_tenant on public.documents for all to authenticated using (business_id in (select private.business_ids_for_current_user())) with check (business_id in (select private.business_ids_for_current_user()));
create policy embeddings_tenant on public.embeddings for all to authenticated using (business_id in (select private.business_ids_for_current_user())) with check (business_id in (select private.business_ids_for_current_user()));
create policy model_usage_tenant on public.model_usage for select to authenticated using (business_id in (select private.business_ids_for_current_user()));
create policy daily_insights_tenant on public.daily_insights for select to authenticated using (business_id in (select private.business_ids_for_current_user()));
create policy audit_tenant on public.audit_logs for select to authenticated using (business_id in (select private.business_ids_for_current_user()));
-- Jobs and webhook_events are server-only (service_role): no authenticated policy is intentionally created.
