-- The dashboard copilot can queue an invoice to be voided. Voiding moves money, so it goes
-- through the same owner-approval gate as marking one paid rather than applying directly.
alter table public.approvals drop constraint if exists approvals_action_type_check;
alter table public.approvals add constraint approvals_action_type_check
  check (action_type in ('send_message', 'send_invoice', 'mark_invoice_paid', 'reorder', 'customer_request', 'void_invoice'));
