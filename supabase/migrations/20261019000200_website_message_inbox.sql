-- Website inbox for public feedback, support reports, and coordination.
-- Browser roles receive no direct table privileges; Vercel Functions use the server-side secret key.
create table if not exists public.website_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  sender_name text not null,
  sender_email text not null,
  message_type text not null default 'Keluhan Website',
  priority text not null default 'Normal',
  page_url text not null default '',
  device_info text not null default '',
  message text not null,
  status text not null default 'Baru',
  telegram_status text not null default 'not_configured',
  telegram_sent_at timestamptz,
  source text not null default 'website'
);
create index if not exists website_messages_created_at_idx on public.website_messages (created_at desc);
create index if not exists website_messages_status_idx on public.website_messages (status);
alter table public.website_messages enable row level security;
revoke all on public.website_messages from public, anon, authenticated;
grant all on public.website_messages to service_role;
