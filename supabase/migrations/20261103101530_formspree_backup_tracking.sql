alter table public.website_messages
  add column if not exists formspree_status text not null default 'not_configured',
  add column if not exists formspree_sent_at timestamptz;

comment on column public.website_messages.formspree_status is
  'Delivery state of the secondary Formspree backup; primary message remains in Supabase.';
