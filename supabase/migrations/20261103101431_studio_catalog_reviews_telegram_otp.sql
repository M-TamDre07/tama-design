-- Tama Andrea Studio: graphic-design catalog, moderated reviews, and Telegram OTP
create table if not exists public.studio_services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null default 'Desain Grafis',
  description text not null default '',
  price_min numeric(12,2),
  price_max numeric(12,2),
  price_label text not null default 'Konsultasi',
  active boolean not null default true,
  featured boolean not null default false,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint studio_services_price_range check (price_min is null or price_min >= 0),
  constraint studio_services_price_max check (price_max is null or price_max >= 0),
  constraint studio_services_price_order check (price_min is null or price_max is null or price_max >= price_min)
);

create index if not exists studio_services_public_order_idx
  on public.studio_services (active, sort_order, created_at);

create table if not exists public.studio_reviews (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_role text not null default '',
  rating smallint not null check (rating between 1 and 5),
  review_text text not null,
  status text not null default 'pending'
    check (status in ('pending', 'published', 'rejected', 'archived')),
  source text not null default 'website',
  created_at timestamptz not null default now(),
  published_at timestamptz,
  moderated_at timestamptz,
  moderated_by uuid,
  constraint studio_reviews_name_length check (char_length(customer_name) between 2 and 100),
  constraint studio_reviews_text_length check (char_length(review_text) between 10 and 1200)
);

create index if not exists studio_reviews_public_idx
  on public.studio_reviews (status, published_at desc);

create table if not exists public.admin_otp_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  code_hash text not null,
  attempts smallint not null default 0 check (attempts between 0 and 5),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists admin_otp_challenges_user_created_idx
  on public.admin_otp_challenges (user_id, created_at desc);

create table if not exists public.admin_otp_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  access_token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists admin_otp_sessions_user_expiry_idx
  on public.admin_otp_sessions (user_id, expires_at desc);

alter table public.studio_services enable row level security;
alter table public.studio_reviews enable row level security;
alter table public.admin_otp_challenges enable row level security;
alter table public.admin_otp_sessions enable row level security;

revoke all on public.studio_services, public.studio_reviews, public.admin_otp_challenges, public.admin_otp_sessions from anon, authenticated;

drop policy if exists block_direct_browser_access on public.studio_services;
create policy block_direct_browser_access on public.studio_services for all to anon, authenticated using (false) with check (false);
drop policy if exists block_direct_browser_access on public.studio_reviews;
create policy block_direct_browser_access on public.studio_reviews for all to anon, authenticated using (false) with check (false);
drop policy if exists block_direct_browser_access on public.admin_otp_challenges;
create policy block_direct_browser_access on public.admin_otp_challenges for all to anon, authenticated using (false) with check (false);
drop policy if exists block_direct_browser_access on public.admin_otp_sessions;
create policy block_direct_browser_access on public.admin_otp_sessions for all to anon, authenticated using (false) with check (false);

insert into public.studio_services (slug, name, category, description, price_min, price_max, price_label, active, featured, sort_order)
values
 ('poster-flyer', 'Poster & Flyer Digital', 'Promosi', 'Poster event, sekolah, komunitas, kampanye, promosi, dan kebutuhan cetak.', 15000, 80000, 'Rp15.000 – Rp80.000', true, true, 10),
 ('banner-marketplace', 'Banner Marketplace', 'Promosi', 'Banner produk atau toko untuk kebutuhan promosi digital.', 20000, 80000, 'Rp20.000 – Rp80.000', true, true, 20),
 ('konten-media-sosial', 'Konten Media Sosial', 'Konten', 'Konten visual untuk Instagram, TikTok, dan kanal publikasi lainnya.', 20000, 85000, 'Rp20.000 – Rp85.000', true, true, 30),
 ('logo-profesional', 'Logo Profesional', 'Branding', 'Logo untuk brand, usaha, organisasi, komunitas, atau proyek personal.', 20000, 90000, 'Rp20.000 – Rp90.000', true, true, 40),
 ('edit-foto-produk', 'Edit Foto Produk', 'Branding', 'Perapian dan penyesuaian visual foto agar siap digunakan di platform digital.', 20000, 80000, 'Rp20.000 – Rp80.000', true, false, 50),
 ('desain-presentasi', 'Desain Presentasi', 'Konten', 'Slide terstruktur untuk tugas sekolah, pitching, organisasi, dan bisnis.', 20000, 85000, 'Rp20.000 – Rp85.000', true, false, 60),
 ('paket-bundling', 'Paket Bundling', 'Paket', 'Beberapa kebutuhan desain sekaligus dengan ruang lingkup yang disepakati di awal.', null, null, 'Harga menyesuaikan brief', true, false, 70),
 ('request-khusus', 'Request Khusus', 'Konsultasi', 'Kebutuhan visual yang belum tercantum dapat dibahas melalui brief terlebih dahulu.', null, null, 'Konsultasi scope', true, false, 80)
on conflict (slug) do update set
 name=excluded.name, category=excluded.category, description=excluded.description,
 price_min=excluded.price_min, price_max=excluded.price_max,
 price_label=excluded.price_label, active=excluded.active,
 featured=excluded.featured, sort_order=excluded.sort_order,
 updated_at=now();
