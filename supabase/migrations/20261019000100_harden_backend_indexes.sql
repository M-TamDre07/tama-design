-- Harden the fresh Supabase backend and index foreign-key lookup paths.
-- RLS is intentionally policy-free for browser roles: only the server-side service role accesses these tables.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

create index if not exists orders_customer_id_idx on public.orders (customer_id);
create index if not exists receipts_customer_id_idx on public.receipts (customer_id);
create index if not exists receipts_order_id_idx on public.receipts (order_id);
create index if not exists service_notes_order_id_idx on public.service_notes (order_id);
create index if not exists service_queue_customer_id_idx on public.service_queue (customer_id);
create index if not exists service_queue_order_id_idx on public.service_queue (order_id);
create index if not exists service_visits_customer_id_idx on public.service_visits (customer_id);
create index if not exists service_visits_order_id_idx on public.service_visits (order_id);
create index if not exists transactions_customer_id_idx on public.transactions (customer_id);
create index if not exists transactions_order_id_idx on public.transactions (order_id);
create index if not exists notifications_order_id_idx on public.notifications (order_id);
