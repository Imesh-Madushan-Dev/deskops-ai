-- The dashboard subscribes to Postgres change feeds instead of polling (useRealtimeSync), but the
-- supabase_realtime publication was empty, so no event was ever delivered and every panel needed a
-- manual refresh. Adds the tables the dashboard watches.
--
-- Supersedes 20260713_realtime_publication.sql, which never ran: its filename carried an 8-digit
-- version instead of the 14-digit timestamp the CLI requires, so it was skipped silently.
--
-- REPLICA IDENTITY FULL matters here because these tables have RLS: Realtime authorises each event
-- against the subscriber's policies, and under the default (primary key only) identity a DELETE's
-- old row carries no business_id for the policy to check, so delete events are dropped entirely.
-- The cost is the full old row in the WAL on update/delete, which is negligible at this volume.
do $$
declare t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  foreach t in array array['approvals','messages','conversations','invoices','products','ledger_entries','stock_movements','reorders']
  loop
    if exists (select 1 from pg_tables where schemaname = 'public' and tablename = t) then
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
      ) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
      execute format('alter table public.%I replica identity full', t);
    end if;
  end loop;
end $$;
