-- Manual stock adjustments and "reorder received" were failing outright.
-- Both wrote products.stock_qty and then inserted into stock_movements from the OWNER'S session
-- client, but stock_movements deliberately carries only a SELECT policy for `authenticated` — the
-- movement ledger is server-written. RLS denied every insert, so the request errored; and because the
-- two writes were not in one transaction, the quantity had ALREADY changed. The owner saw "Unable to
-- adjust stock" next to a number that had silently moved, and retrying counted the delivery twice.
--
-- One SECURITY DEFINER function fixes both callers: quantity and its ledger row move together or not
-- at all, the ledger stays server-written, and the negative-stock guard is enforced in the same
-- statement that applies the delta rather than in a read-then-write race in app code.
create or replace function public.adjust_stock(p_product_id uuid, p_delta integer, p_reason text, p_ref_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
  v_next integer;
begin
  if p_delta = 0 then
    raise exception 'A stock adjustment must change the quantity.';
  end if;
  if p_reason not in ('restock', 'adjustment') then
    raise exception 'Unsupported stock movement reason: %', p_reason;
  end if;

  -- Authorization is ours to do: SECURITY DEFINER bypasses the products policy.
  select business_id into v_business_id
  from public.products
  where id = p_product_id
    and business_id in (select private.business_ids_for_current_user());
  if v_business_id is null then
    raise exception 'Product not found.' using errcode = '42501';
  end if;

  update public.products
     set stock_qty = stock_qty + p_delta
   where id = p_product_id
     and stock_qty + p_delta >= 0
  returning stock_qty into v_next;
  if v_next is null then
    raise exception 'Stock cannot go below zero.';
  end if;

  insert into public.stock_movements (business_id, product_id, delta, reason, ref_id)
  values (v_business_id, p_product_id, p_delta, p_reason, p_ref_id);

  return v_next;
end; $$;

revoke all on function public.adjust_stock(uuid, integer, text, uuid) from public;
grant execute on function public.adjust_stock(uuid, integer, text, uuid) to authenticated;
