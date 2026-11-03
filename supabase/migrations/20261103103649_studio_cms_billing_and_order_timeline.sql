-- Tama Andrea Studio: managed public CMS, billing administration and order timeline.
create table if not exists public.studio_portfolio (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 140),
  category text not null default 'Desain Grafis',
  description text not null default '',
  image_url text not null,
  alt_text text not null default '',
  active boolean not null default true,
  featured boolean not null default false,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint studio_portfolio_image_url_valid check (image_url ~ '^(https://|/assets/)'),
  constraint studio_portfolio_sort_order_valid check (sort_order between 0 and 9999)
);
create index if not exists studio_portfolio_public_order_idx on public.studio_portfolio (active, featured desc, sort_order, created_at desc);

create table if not exists public.studio_faq (
  id uuid primary key default gen_random_uuid(),
  question text not null check (char_length(question) between 5 and 240),
  answer text not null check (char_length(answer) between 5 and 2400),
  category text not null default 'Umum',
  active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint studio_faq_sort_order_valid check (sort_order between 0 and 9999)
);
create index if not exists studio_faq_public_order_idx on public.studio_faq (active, sort_order, created_at);

create table if not exists public.studio_payment_methods (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null check (char_length(name) between 2 and 100),
  account_name text not null default '',
  account_number text not null default '',
  instructions text not null default '',
  logo_url text not null default '',
  active boolean not null default false,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint studio_payment_slug_valid check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint studio_payment_sort_order_valid check (sort_order between 0 and 9999),
  constraint studio_payment_logo_url_valid check (logo_url = '' or logo_url ~ '^(https://|/assets/)')
);
create index if not exists studio_payment_methods_public_order_idx on public.studio_payment_methods (active, sort_order, name);

create table if not exists public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  event_type text not null,
  old_value text,
  new_value text,
  note text not null default '',
  is_internal boolean not null default true,
  actor_id uuid,
  actor_email text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint order_events_type_length check (char_length(event_type) between 2 and 80),
  constraint order_events_note_length check (char_length(note) <= 4000)
);
create index if not exists order_events_order_created_idx on public.order_events (order_id, created_at desc);
create index if not exists order_events_type_created_idx on public.order_events (event_type, created_at desc);

alter table public.studio_portfolio enable row level security;
alter table public.studio_faq enable row level security;
alter table public.studio_payment_methods enable row level security;
alter table public.order_events enable row level security;

revoke all on public.studio_portfolio, public.studio_faq, public.studio_payment_methods, public.order_events from public, anon, authenticated;
grant all on public.studio_portfolio, public.studio_faq, public.studio_payment_methods, public.order_events to service_role;

drop policy if exists block_direct_browser_access on public.studio_portfolio;
create policy block_direct_browser_access on public.studio_portfolio for all to anon, authenticated using (false) with check (false);
drop policy if exists block_direct_browser_access on public.studio_faq;
create policy block_direct_browser_access on public.studio_faq for all to anon, authenticated using (false) with check (false);
drop policy if exists block_direct_browser_access on public.studio_payment_methods;
create policy block_direct_browser_access on public.studio_payment_methods for all to anon, authenticated using (false) with check (false);
drop policy if exists block_direct_browser_access on public.order_events;
create policy block_direct_browser_access on public.order_events for all to anon, authenticated using (false) with check (false);

insert into public.studio_portfolio (title,category,description,image_url,alt_text,active,featured,sort_order)
values
 ('Poster Event','Poster','Desain poster untuk kebutuhan acara dan publikasi.','/assets/images/portfolio/Karya1.png','Contoh desain poster event',true,true,10),
 ('Poster Promosi','Promosi','Visual promosi produk dan kegiatan.','/assets/images/portfolio/Karya2.png','Contoh poster promosi',true,true,20),
 ('Konten Sosial','Media Sosial','Konten visual untuk kanal media sosial.','/assets/images/portfolio/Karya3.png','Contoh konten media sosial',true,false,30),
 ('Banner Marketplace','Promosi','Banner untuk kebutuhan etalase dan promosi digital.','/assets/images/portfolio/Karya4.png','Contoh banner marketplace',true,false,40),
 ('Logo Design','Branding','Contoh identitas visual dan logo.','/assets/images/portfolio/Karya5.png','Contoh desain logo',true,false,50),
 ('Presentasi','Presentasi','Contoh tata visual presentasi.','/assets/images/portfolio/Karya6.png','Contoh desain presentasi',true,false,60),
 ('Foto Produk','Foto Produk','Contoh pengolahan visual foto produk.','/assets/images/portfolio/Karya7.png','Contoh edit foto produk',true,false,70)
on conflict do nothing;

insert into public.studio_faq (question,answer,category,active,sort_order)
values
 ('Layanan desain apa saja yang tersedia?','Poster, flyer, banner marketplace, konten media sosial, logo, edit foto produk, presentasi, paket bundling, dan request khusus. Katalog aktif dapat berubah mengikuti ketersediaan studio.','Layanan',true,10),
 ('Bagaimana cara memesan?','Buka halaman Pesan, pilih layanan, isi kontak, dan jelaskan brief. Studio akan meninjau kebutuhan lalu menghubungi untuk konfirmasi scope, harga, dan waktu pengerjaan.','Pemesanan',true,20),
 ('Apakah harga di katalog adalah harga final?','Harga di katalog merupakan kisaran atau label awal. Harga final mempertimbangkan tingkat kerumitan, jumlah aset, ukuran, deadline, dan kebutuhan file.','Pembayaran',true,30),
 ('Bagaimana aturan revisi?','Jumlah dan cakupan revisi dikonfirmasi sebelum pengerjaan. Perubahan brief besar setelah konsep disetujui dapat memerlukan penyesuaian biaya dan waktu.','Revisi',true,40),
 ('Format file apa yang diterima?','Format akhir disesuaikan kebutuhan penggunaan dan dibicarakan saat konfirmasi. Sebutkan apakah file digunakan untuk media sosial, presentasi, atau cetak.','File',true,50),
 ('Bagaimana melihat status pesanan?','Simpan kode pesanan setelah formulir berhasil dikirim. Gunakan kode tersebut di bagian pelacakan pada halaman Pesan. Detail nota memerlukan verifikasi nama dan email.','Pemesanan',true,60),
 ('Bagaimana cara memberi ulasan?','Buka halaman Karya & Ulasan. Ulasan yang dikirim akan ditinjau sebelum ditampilkan di website.','Ulasan',true,70)
on conflict do nothing;

create or replace function public.capture_order_event()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_events (order_id,event_type,new_value,note,is_internal,metadata)
    values (new.id,'ORDER_CREATED',new.status,'Pesanan dibuat dari sistem.',false,jsonb_build_object('source',coalesce(new.source,'website'),'order_code',new.order_code));
    return new;
  end if;
  if old.status is distinct from new.status then
    insert into public.order_events (order_id,event_type,old_value,new_value,note,is_internal,metadata)
    values (new.id,'STATUS_CHANGED',old.status,new.status,'Status pesanan diperbarui.',false,jsonb_build_object('order_code',new.order_code));
  end if;
  if old.payment_status is distinct from new.payment_status then
    insert into public.order_events (order_id,event_type,old_value,new_value,note,is_internal,metadata)
    values (new.id,'PAYMENT_STATUS_CHANGED',old.payment_status,new.payment_status,'Status pembayaran diperbarui.',true,jsonb_build_object('order_code',new.order_code,'payment_date',new.payment_date));
  end if;
  return new;
end;
$$;

drop trigger if exists orders_capture_order_event on public.orders;
create trigger orders_capture_order_event after insert or update of status, payment_status on public.orders
for each row execute function public.capture_order_event();
