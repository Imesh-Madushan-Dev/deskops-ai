-- Allow the agent to escalate customer requests (discounts, bulk/restock asks) to the owner's
-- approvals queue instead of pretending to "check with the team".
alter table public.approvals drop constraint if exists approvals_action_type_check;
alter table public.approvals add constraint approvals_action_type_check
  check (action_type in ('send_message', 'send_invoice', 'mark_invoice_paid', 'reorder', 'customer_request'));
