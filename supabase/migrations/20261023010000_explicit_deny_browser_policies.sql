-- Explicitly deny direct browser-role access to operational tables.
-- The site uses Vercel server-side APIs with the Supabase secret key; anon/authenticated
-- should never query these records directly. service_role bypasses RLS by design.
do $migration$
declare
  v_table text;
  v_tables text[] := array[
    'customers',
    'orders',
    'audit_logs',
    'error_logs',
    'request_index',
    'site_config',
    'service_availability',
    'service_queue',
    'service_visits',
    'transactions',
    'receipts',
    'notifications',
    'service_notes',
    'devices_verified',
    'settings',
    'rate_limit_buckets',
    'website_messages'
  ];
begin
  foreach v_table in array v_tables loop
    if to_regclass(format('public.%I', v_table)) is null then
      raise exception 'Expected table public.% does not exist', v_table;
    end if;

    execute format('alter table public.%I enable row level security', v_table);

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = v_table
        and policyname = 'block_direct_browser_access'
    ) then
      execute format(
        'create policy block_direct_browser_access on public.%I for all to anon, authenticated using (false) with check (false)',
        v_table
      );
    end if;
  end loop;
end
$migration$;

-- Defense in depth: browser roles keep no direct table privileges.
revoke all on public.customers, public.orders, public.audit_logs, public.error_logs, public.request_index,
  public.site_config, public.service_availability, public.service_queue, public.service_visits,
  public.transactions, public.receipts, public.notifications, public.service_notes,
  public.devices_verified, public.settings, public.rate_limit_buckets, public.website_messages
  from public, anon, authenticated;
