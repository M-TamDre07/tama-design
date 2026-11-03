# Tama Andrea Studio

Website resmi Tama Andrea Studio, studio independen yang berfokus pada desain grafis.

## Arsitektur

- Frontend: HTML, CSS, JavaScript statis.
- Hosting dan API: Vercel + Vercel Functions.
- Database: Supabase PostgreSQL.
- Autentikasi admin: Supabase Auth password login + OTP Telegram berumur pendek.
- Backup pesan/masukan: Supabase sebagai penyimpanan utama, Formspree sebagai salinan tambahan, Telegram sebagai notifikasi operasional.
- Migrasi database: `supabase/migrations/`.

## Fitur aktif dalam implementasi

- Katalog layanan desain grafis dari tabel `studio_services`.
- Formulir pemesanan dan pelacakan order.
- Nomor order dan referensi nota dari backend.
- Formulir ulasan pelanggan dengan status pending; hanya ulasan yang diterbitkan admin tampil di website.
- Inbox masukan website, backup Formspree, notifikasi Telegram, dan status pengiriman.
- Panel admin untuk pesanan, pelanggan, jadwal, inbox, katalog layanan, moderasi ulasan, notifikasi, audit log, dan error log.
- Rate limiting server-side, validasi input, idempotensi order, RLS, dan pengarsipan non-destruktif.

## Setup

1. Pastikan proyek Supabase yang digunakan adalah `tama-design` dengan ref `oimpglrxjgdifzmmdogz`.
2. Terapkan migrasi berdasarkan timestamp yang belum tercatat pada Supabase.
3. Atur environment variables Vercel sesuai `.env.example` dan `docs/ENVIRONMENT_VARIABLES.md`.
4. Buat akun admin di Supabase Authentication, lalu masukkan UUID akun tersebut ke `ADMIN_USER_IDS` di Vercel.
5. Pastikan bot Telegram berada di grup privat admin dan memiliki izin mengirim pesan.
6. Uji endpoint, formulir pesanan, backup Formspree, Telegram OTP, dan panel admin sebelum menganggap rilis siap.

## Keamanan

- `SUPABASE_SECRET_KEY`, token Telegram, dan password tidak boleh masuk ke browser atau Git.
- OTP admin dikirim ke grup Telegram, berlaku lima menit, dibatasi percobaannya, dan diverifikasi server-side.
- Sesi OTP admin terikat ke Supabase Auth session dan berlaku maksimal 12 jam.
- Ulasan publik dimoderasi; review pelanggan tidak otomatis diterbitkan.
- Data pelanggan hanya ditampilkan sesuai kebutuhan operasional dan tidak boleh masuk ke log/debug publik.

## Dokumentasi

- `docs/SUPABASE_SETUP.md` — database, autentikasi, dan konfigurasi.
- `docs/ENVIRONMENT_VARIABLES.md` — kontrak variabel environment.
- `docs/OPERATIONS.md` — runbook operasional.
- `docs/RELEASE_READINESS.md` — gerbang rilis dan pengujian produksi.
