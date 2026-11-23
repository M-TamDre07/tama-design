-- Tama Andrea Studio: media library, achievements and news CMS.
-- Images are object-storage files; PostgreSQL stores metadata and relationships only.
create table if not exists public.studio_media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null check (bucket_id in ('studio-media-public', 'studio-media-private')),
  object_path text not null unique,
  original_filename text not null default '',
  mime_type text not null default 'image/webp' check (mime_type = 'image/webp'),
  size_bytes bigint not null check (size_bytes between 1 and 8388608),
  width integer not null check (width between 1 and 6000),
  height integer not null check (height between 1 and 6000),
  category text not null default 'general' check (category in ('portfolio', 'achievement', 'news', 'general')),
  alt_text text not null default '',
  caption text not null default '',
  visibility text not null default 'private' check (visibility in ('public', 'private')),
  status text not null default 'ready' check (status in ('ready', 'orphaned', 'failed')),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  uploaded_by uuid,
  created_at timestamptz not null default now(),
  constraint studio_media_bucket_visibility_valid check (
    (visibility = 'public' and bucket_id = 'studio-media-public') or
    (visibility = 'private' and bucket_id = 'studio-media-private')
  )
);
create index if not exists studio_media_assets_category_created_idx
  on public.studio_media_assets (category, created_at desc);
create index if not exists studio_media_assets_visibility_status_idx
  on public.studio_media_assets (visibility, status, created_at desc);

alter table public.studio_portfolio
  add column if not exists media_asset_id uuid references public.studio_media_assets(id) on delete restrict,
  add column if not exists service_id uuid references public.studio_services(id) on delete set null,
  alter column image_url set default '';
alter table public.studio_portfolio
  drop constraint if exists studio_portfolio_image_url_valid;
alter table public.studio_portfolio
  add constraint studio_portfolio_image_source_valid check (
    (image_url <> '' and image_url ~ '^(https://|/assets/)'::text) or
    (image_url = '' and media_asset_id is not null)
  );
create index if not exists studio_portfolio_service_idx
  on public.studio_portfolio (service_id, active, sort_order);

create table if not exists public.studio_achievements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 140),
  issuer text not null check (char_length(issuer) between 2 and 140),
  description text not null default '' check (char_length(description) <= 1600),
  achieved_on date,
  media_asset_id uuid not null references public.studio_media_assets(id) on delete restrict,
  featured boolean not null default false,
  sort_order integer not null default 100 check (sort_order between 0 and 9999),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists studio_achievements_public_order_idx
  on public.studio_achievements (status, featured desc, sort_order, achieved_on desc);

create table if not exists public.studio_news (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  excerpt text not null check (char_length(excerpt) between 10 and 320),
  content text not null check (char_length(content) between 30 and 12000),
  category text not null default 'Kegiatan',
  cover_media_id uuid references public.studio_media_assets(id) on delete set null,
  cover_image_url text not null default '' check (cover_image_url = '' or (left(cover_image_url, length('/assets/images/news/')) = '/assets/images/news/' and array_length(string_to_array(cover_image_url, '/'), 1) = 5 and split_part(cover_image_url, '/', 5) similar to '[a-z0-9-]+[.]webp')),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists studio_news_public_order_idx
  on public.studio_news (status, published_at desc);

alter table public.studio_media_assets enable row level security;
alter table public.studio_achievements enable row level security;
alter table public.studio_news enable row level security;

revoke all on public.studio_media_assets, public.studio_achievements, public.studio_news
  from public, anon, authenticated;
grant usage on schema public to service_role;
grant select, insert, update, delete on public.studio_media_assets, public.studio_achievements, public.studio_news
  to service_role;
grant select, insert, update, delete on public.studio_portfolio to service_role;

drop policy if exists block_direct_browser_access on public.studio_media_assets;
create policy block_direct_browser_access on public.studio_media_assets
  for all to anon, authenticated using (false) with check (false);
drop policy if exists block_direct_browser_access on public.studio_achievements;
create policy block_direct_browser_access on public.studio_achievements
  for all to anon, authenticated using (false) with check (false);
drop policy if exists block_direct_browser_access on public.studio_news;
create policy block_direct_browser_access on public.studio_news
  for all to anon, authenticated using (false) with check (false);

-- Public bucket: public reads only. Uploads still require a short-lived, server-issued signed token.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('studio-media-public', 'studio-media-public', true, 8388608, array['image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Private originals/certificates: no anonymous access; the website never returns their object paths publicly.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('studio-media-private', 'studio-media-private', false, 8388608, array['image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

comment on table public.studio_media_assets is
  'Image metadata only; binary objects are stored in Supabase Storage. Browser clients cannot access this table directly.';
comment on table public.studio_achievements is
  'Public achievement records; publishing requires a public media asset.';
comment on table public.studio_news is
  'Plain-text news CMS. Published content is rendered escaped by the public frontend.';
