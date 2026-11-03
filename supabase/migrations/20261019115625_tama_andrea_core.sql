-- Tama Andrea: initial Supabase/Postgres schema.
-- Run this file once in Supabase Dashboard > SQL Editor before enabling the Vercel API.
create extension if not exists pgcrypto;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  customer_code text not null unique default ('CUS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  name text not null,
  email_normalized text not null unique,
  whatsapp text not null default '',
  order_count integer not null default 0,
  last_order_at timestamptz,
  location text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  receipt_code text not null unique,
  client_request_id text not null unique,
  customer_id uuid references public.customers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  customer_name text not null,
  customer_email text not null,
  email_normalized text not null,
  customer_whatsapp text not null,
  category text not null,
  service text not null,
  operating_system text not null default '',
  method text not null default '',
  brief text not null,
  deadline date,
  status text not null default 'Baru',
  estimated_amount numeric(12,2),
  payment_status text not null default 'Belum Dibayar',
  payment_date timestamptz,
  priority text not null default 'Normal',
  notes text not null default '',
  source text not null default 'website',
  tags text[] not null default '{}',
  internal_notes text not null default '',
  appointment_date date,
  appointment_time time,
  service_location text not null default '',
  location_link text not null default '',
  location_lat numeric(10,7),
  location_lng numeric(10,7),
  accessibility_preference text not null default '',
  request_details jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  archived_by uuid
);
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_email_normalized_idx on public.orders (email_normalized);
create index if not exists orders_archived_at_idx on public.orders (archived_at);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  request_id text not null default '',
  actor_id uuid,
  actor_email text not null default '',
  action text not null,
  status text not null default 'OK',
  details jsonb not null default '{}'::jsonb,
  ip_hash text not null default ''
);
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);

create table if not exists public.error_logs (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  handler text not null default '',
  error_code text not null default '',
  message text not null default '',
  request_id text not null default ''
);

create table if not exists public.request_index (
  id bigint generated always as identity primary key,
  request_id text not null unique,
  created_at timestamptz not null default now(),
  request_type text not null,
  status text not null,
  message text not null default '',
  response jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.site_config (
  id text primary key default 'default',
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table if not exists public.service_availability (
  id uuid primary key default gen_random_uuid(),
  service_date date not null unique,
  status text not null check (status in ('open', 'closed')),
  start_time time,
  end_time time,
  note text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid,
  check (status <> 'open' or (start_time is not null and end_time is not null and end_time > start_time))
);

create table if not exists public.service_queue (
  id uuid primary key default gen_random_uuid(),
  queue_date date not null,
  queue_number integer not null,
  order_id uuid references public.orders(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  service text not null default '',
  method text not null default '',
  appointment_date date,
  appointment_time time,
  status text not null default 'Menunggu',
  location_link text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (queue_date, queue_number)
);

create table if not exists public.service_visits (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  method text not null default '',
  appointment_date date,
  appointment_time time,
  location_text text not null default '',
  maps_link text not null default '',
  latitude numeric(10,7),
  longitude numeric(10,7),
  visit_fee numeric(12,2),
  status text not null default 'Menunggu',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  created_at timestamptz not null default now(),
  transaction_type text not null default 'Pembayaran',
  amount numeric(12,2) not null default 0,
  status text not null default 'Menunggu',
  method text not null default '',
  reference text not null default '',
  note text not null default ''
);

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_code text not null unique,
  order_id uuid references public.orders(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  created_at timestamptz not null default now(),
  service text not null default '',
  amount numeric(12,2),
  payment_status text not null default 'Belum Dibayar',
  method text not null default '',
  appointment text not null default '',
  location_link text not null default '',
  note text not null default ''
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now(),
  event text not null,
  channel text not null,
  status text not null default 'queued',
  message text not null default '',
  sent_at timestamptz,
  unique (order_id, event, channel)
);

create table if not exists public.service_notes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid,
  note text not null,
  is_internal boolean not null default true
);

create table if not exists public.devices_verified (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  device_fingerprint_hash text not null unique,
  device_label text not null default '',
  trust_level text not null default 'normal',
  registered_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create table if not exists public.settings (
  setting_key text primary key,
  value jsonb not null default 'null'::jsonb,
  setting_type text not null default 'json',
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table if not exists public.rate_limit_buckets (
  bucket_key text not null,
  window_started_at timestamptz not null,
  hit_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (bucket_key, window_started_at)
);

insert into public.site_config (id, config)
values ('default', jsonb_build_object(
  'version', '2026.10.19',
  'studioName', 'Tama Andrea',
  'locationLabel', 'Kalianda · Lampung Selatan',
  'mapUrl', 'https://www.google.com/maps/search/?api=1&query=Kalianda%2C%20Lampung%20Selatan',
  'visitFeeMin', 20000,
  'queueEnabled', false,
  'methods', jsonb_build_array('Datang ke studio', 'Teknisi datang ke lokasi'),
  'hours', jsonb_build_object(
    'SATURDAY', jsonb_build_object('label', 'Sabtu', 'start', '13:00', 'end', '16:00'),
    'SUNDAY', jsonb_build_object('label', 'Minggu', 'start', '10:00', 'end', '15:00')
  ),
  'workingWeekdays', jsonb_build_array(6, 0),
  'benefits', jsonb_build_array(
    'Instal OS yang kompatibel', 'Driver dasar', 'Update sistem dasar',
    'Konfigurasi awal', 'Testing fungsi dasar',
    'Hingga 5 software dasar pilihan pelanggan (bukan Microsoft Office)'
  ),
  'basicSoftwareNote', 'Hingga 5 software dasar pilihan pelanggan. Microsoft Office tidak termasuk; aplikasi berbayar perlu dikonsultasikan terlebih dahulu.',
  'prices', jsonb_build_object(
    'WINDOWS_10_BASIC', 80000, 'WINDOWS_11_BASIC', 100000,
    'WINDOWS_10_LTSC_2021', 90000, 'WINDOWS_11_LTSC_2024', 150000,
    'LINUX', 100000, 'OFFICE_2024_HOME', 80000, 'OFFICE_INSTALL', 80000,
    'OS_OFFICE', 165000, 'OS_BACKUP', 130000, 'OS_OFFICE_BACKUP', 210000,
    'DIAGNOSIS', 30000, 'SSD_CHECK', 35000, 'BACKUP', 40000,
    'BIOS_LAPTOP', 50000, 'PART_LIGHT', 50000, 'PART_HEAVY', 100000,
    'QUICK_FLASH_ANDROID', 80000, 'QUICK_FLASH_IPHONE', 85000, 'FIND_DEVICE', 35000
  )
))
on conflict (id) do nothing;

create or replace function public.consume_public_rate_limit(
  p_bucket_key text,
  p_limit integer default 6,
  p_window_seconds integer default 3600
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window timestamptz;
  v_count integer;
begin
  if p_bucket_key is null or length(p_bucket_key) < 16 then
    return false;
  end if;
  if p_limit < 1 or p_limit > 1000 or p_window_seconds < 1 or p_window_seconds > 86400 then
    return false;
  end if;
  v_window := to_timestamp(floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds);
  insert into public.rate_limit_buckets (bucket_key, window_started_at, hit_count, updated_at)
  values (p_bucket_key, v_window, 1, v_now)
  on conflict (bucket_key, window_started_at)
  do update set hit_count = public.rate_limit_buckets.hit_count + 1, updated_at = excluded.updated_at
  returning hit_count into v_count;
  delete from public.rate_limit_buckets where updated_at < v_now - interval '2 days';
  return v_count <= p_limit;
end;
$$;

create or replace function public.create_public_order(p_order jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_existing public.orders%rowtype;
  v_order public.orders%rowtype;
  v_customer_id uuid;
  v_now timestamptz := now();
  v_order_code text;
  v_receipt_code text;
  v_client_id text;
begin
  v_client_id := nullif(trim(p_order ->> 'client_request_id'), '');
  if v_client_id is null or length(v_client_id) > 120 then
    raise exception 'Invalid client request id';
  end if;

  select * into v_existing from public.orders where client_request_id = v_client_id limit 1;
  if found then
    return jsonb_build_object('orderCode', v_existing.order_code, 'receiptCode', v_existing.receipt_code, 'duplicate', true);
  end if;

  v_order_code := 'ORD-' || to_char(v_now at time zone 'Asia/Jakarta', 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  v_receipt_code := 'NOTA-' || to_char(v_now at time zone 'Asia/Jakarta', 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.customers (name, email_normalized, whatsapp, order_count, last_order_at)
  values (
    left(coalesce(p_order ->> 'customer_name', ''), 160),
    lower(left(coalesce(p_order ->> 'customer_email_normalized', p_order ->> 'customer_email', ''), 254)),
    left(coalesce(p_order ->> 'customer_whatsapp', ''), 40),
    1,
    v_now
  )
  on conflict (email_normalized) do update set
    name = excluded.name,
    whatsapp = excluded.whatsapp,
    order_count = public.customers.order_count + 1,
    last_order_at = excluded.last_order_at,
    updated_at = excluded.last_order_at
  returning id into v_customer_id;

  insert into public.orders (
    order_code, receipt_code, client_request_id, customer_id, created_at, updated_at,
    customer_name, customer_email, email_normalized, customer_whatsapp, category, service,
    operating_system, method, brief, deadline, status, estimated_amount, payment_status, priority,
    source, service_location, location_link, location_lat, location_lng, accessibility_preference,
    request_details
  ) values (
    v_order_code, v_receipt_code, v_client_id, v_customer_id, v_now, v_now,
    left(coalesce(p_order ->> 'customer_name', ''), 160),
    lower(left(coalesce(p_order ->> 'customer_email', ''), 254)),
    lower(left(coalesce(p_order ->> 'customer_email_normalized', p_order ->> 'customer_email', ''), 254)),
    left(coalesce(p_order ->> 'customer_whatsapp', ''), 40),
    left(coalesce(p_order ->> 'category', ''), 100),
    left(coalesce(p_order ->> 'service', ''), 1600),
    left(coalesce(p_order ->> 'operating_system', ''), 160),
    left(coalesce(p_order ->> 'method', ''), 100),
    left(coalesce(p_order ->> 'brief', ''), 8000),
    nullif(p_order ->> 'deadline', '')::date,
    'Baru', nullif(p_order ->> 'estimated_amount', '')::numeric, 'Belum Dibayar', 'Normal',
    'website',
    left(coalesce(p_order ->> 'service_location', ''), 500),
    left(coalesce(p_order ->> 'location_link', ''), 1000),
    nullif(p_order ->> 'location_lat', '')::numeric,
    nullif(p_order ->> 'location_lng', '')::numeric,
    left(coalesce(p_order ->> 'accessibility_preference', ''), 300),
    coalesce(p_order -> 'request_details', '{}'::jsonb)
  ) returning * into v_order;

  insert into public.receipts (receipt_code, order_id, customer_id, service, amount, payment_status, method, location_link, note)
  values (v_receipt_code, v_order.id, v_customer_id, v_order.service, v_order.estimated_amount, v_order.payment_status, v_order.method, v_order.location_link, 'Dibuat otomatis saat permintaan diterima');

  insert into public.audit_logs (request_id, action, status, details)
  values (v_client_id, 'PUBLIC_ORDER_CREATED', 'OK', jsonb_build_object('order_code', v_order_code, 'category', v_order.category));

  return jsonb_build_object('orderCode', v_order_code, 'receiptCode', v_receipt_code, 'createdAt', v_now, 'duplicate', false);
end;
$$;

alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.audit_logs enable row level security;
alter table public.error_logs enable row level security;
alter table public.request_index enable row level security;
alter table public.site_config enable row level security;
alter table public.service_availability enable row level security;
alter table public.service_queue enable row level security;
alter table public.service_visits enable row level security;
alter table public.transactions enable row level security;
alter table public.receipts enable row level security;
alter table public.notifications enable row level security;
alter table public.service_notes enable row level security;
alter table public.devices_verified enable row level security;
alter table public.settings enable row level security;
alter table public.rate_limit_buckets enable row level security;

revoke all on public.customers, public.orders, public.audit_logs, public.error_logs, public.request_index,
  public.site_config, public.service_availability, public.service_queue, public.service_visits,
  public.transactions, public.receipts, public.notifications, public.service_notes,
  public.devices_verified, public.settings, public.rate_limit_buckets from public, anon, authenticated;
grant all on public.customers, public.orders, public.audit_logs, public.error_logs, public.request_index,
  public.site_config, public.service_availability, public.service_queue, public.service_visits,
  public.transactions, public.receipts, public.notifications, public.service_notes,
  public.devices_verified, public.settings, public.rate_limit_buckets to service_role;
grant usage, select on all sequences in schema public to service_role;
revoke all on function public.consume_public_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_public_rate_limit(text, integer, integer) to service_role;
revoke all on function public.create_public_order(jsonb) from public, anon, authenticated;
grant execute on function public.create_public_order(jsonb) to service_role;
