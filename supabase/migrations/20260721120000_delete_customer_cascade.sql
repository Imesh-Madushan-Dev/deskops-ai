-- Owner-only hard delete of a customer and their entire footprint, in one transaction.
-- Invoices/conversations FK to customers with ON DELETE SET NULL (financial records normally survive),
-- so a plain DELETE would orphan them. This function removes children explicitly, FK-safe order:
--   ledger_entries + payments (SET NULL on invoice) -> invoices (invoice_items CASCADE)
--   approvals (SET NULL on conversation) -> conversations (messages CASCADE) -> customer
-- SECURITY DEFINER because it does its own authorization: only the business OWNER may delete.
create or replace function public.delete_customer_cascade(p_customer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
begin
  select c.business_id into v_business_id
  from public.customers c
  join public.businesses b on b.id = c.business_id
  where c.id = p_customer_id and b.owner_user_id = auth.uid();

  if v_business_id is null then
    raise exception 'Only the business owner can delete this customer' using errcode = '42501';
  end if;

  delete from public.ledger_entries where invoice_id in (select id from public.invoices where customer_id = p_customer_id);
  delete from public.payments       where invoice_id in (select id from public.invoices where customer_id = p_customer_id);
  delete from public.approvals      where conversation_id in (select id from public.conversations where customer_id = p_customer_id);
  delete from public.invoices       where customer_id = p_customer_id;
  delete from public.conversations  where customer_id = p_customer_id;
  delete from public.customers      where id = p_customer_id;
end;
$$;

revoke all on function public.delete_customer_cascade(uuid) from public, anon;
grant execute on function public.delete_customer_cascade(uuid) to authenticated;
