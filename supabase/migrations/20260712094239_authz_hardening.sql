-- Both RPCs run SECURITY DEFINER, which bypasses RLS entirely. Without an
-- explicit check they let any authenticated caller read another business's
-- embeddings or mark any invoice paid. Guard each with the same tenant check
-- used by RLS policies, allowing the service-role worker (no auth.uid()) through.

create or replace function public.match_embeddings(
  p_business_id uuid,
  query_embedding vector(768),
  match_count int default 6
)
returns table (id uuid, source text, source_id uuid, content text, similarity float)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.role() <> 'service_role' and p_business_id not in (select private.business_ids_for_current_user()) then
    raise exception 'Not authorized for this business';
  end if;

  return query
    select e.id, e.source, e.source_id, e.content,
           1 - (e.embedding <=> query_embedding) as similarity
    from public.embeddings e
    where e.business_id = p_business_id
    order by e.embedding <=> query_embedding
    limit match_count;
end;
$$;

create or replace function public.record_sale(p_invoice_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare item record; inv public.invoices%rowtype;
begin
  select * into inv from public.invoices where id = p_invoice_id for update;
  if not found then raise exception 'Invoice not found'; end if;
  if auth.role() <> 'service_role' and inv.business_id not in (select private.business_ids_for_current_user()) then
    raise exception 'Not authorized for this business';
  end if;
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

-- Make the "server-only" intent explicit so the linter stops flagging these
-- as RLS-enabled-with-no-policy; service_role bypasses RLS regardless.
create policy jobs_no_client_access on public.jobs for all to authenticated using (false) with check (false);
create policy webhook_events_no_client_access on public.webhook_events for all to authenticated using (false) with check (false);
