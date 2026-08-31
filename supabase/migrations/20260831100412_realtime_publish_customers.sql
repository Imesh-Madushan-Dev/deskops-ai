-- The copilot can now create and edit customers (owner tools), so the customers page needs the
-- same live feed the other dashboard panels get.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'customers'
  ) then
    alter publication supabase_realtime add table public.customers;
  end if;
  alter table public.customers replica identity full;
end $$;
