-- Invoices need a proper "Bill To" — capture the customer's address and a contact phone
-- (separate from their WhatsApp id, which may be an @lid privacy id).
alter table public.customers add column if not exists address text;
alter table public.customers add column if not exists phone text;
