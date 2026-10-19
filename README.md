# Tama Andrea

Website resmi Tama Andrea — Technology · Art · Digital Solutions.

Website publik memakai HTML, CSS, dan JavaScript statis di Vercel. Backend pemesanan memakai Vercel Functions + Supabase PostgreSQL. Autentikasi admin menggunakan Supabase Auth dengan TOTP MFA. Kunci rahasia database hanya dipakai server, bukan browser.

## Fitur inti

- Halaman layanan visual, servis teknologi, portofolio, informasi, bantuan, dan keluhan.
- API same-origin untuk formulir pemesanan, pelacakan pesanan, verifikasi nama/email, dan laporan website melalui `POST /api/messages`.
- Database pesanan dan pelanggan, status pembayaran, estimasi, jadwal khusus, notifikasi Telegram opsional, kotak masuk laporan website, dan audit log.
- Panel admin untuk memperbarui pesanan, mengelola pelanggan, jadwal layanan, dan melihat audit log.
- Validasi input, idempotensi pembuatan pesanan, rate limiting server-side, row-level security, dan pengarsipan tanpa penghapusan permanen.

## Teknologi

- Frontend: HTML, CSS, JavaScript.
- Hosting + serverless API: Vercel.
- Database: Supabase PostgreSQL.
- Admin authentication: Supabase Auth + TOTP MFA + allowlist UUID.
- Database migrations: supabase/migrations/.
- Panduan setup: docs/SUPABASE_SETUP.md.

Runtime website tidak lagi memanggil Google Apps Script. Sumber Google Apps Script lama dipindahkan ke docs/legacy/site.js.txt sebagai arsip teks dan bukan runtime. Berkas backend Google Apps Script tidak lagi menjadi bagian dari runtime aplikasi.

## Setup backend

1. Buat proyek Supabase dan jalankan file di `supabase/migrations/` secara berurutan berdasarkan timestamp; jangan menjalankan ulang migrasi yang sudah diterapkan.
2. Tambahkan environment variables dari .env.example di Vercel Project Settings → Environment Variables. Jangan pernah commit nilai rahasia.
3. Buat akun admin Supabase, daftarkan TOTP MFA, lalu masukkan UUID pengguna tersebut ke ADMIN_USER_IDS.
4. Redeploy Vercel setelah menyimpan environment variables.
5. Uji /api/config, /api/public?action=serviceConfig, /api/public?action=availability, formulir pemesanan, pelacakan pesanan, dan /admin.html.
6. Pertahankan halaman pemeliharaan sampai pengujian di Preview selesai. Setelah database benar-benar siap, barulah hapus redirect pemeliharaan sementara di vercel.json untuk halaman publik.

## Data lama

Database baru tidak membaca Google Sheets secara otomatis. Bila histori lama diperlukan, ekspor salinan privat dari penyimpanan lama, import dan cocokkan kolom ke skema Supabase, lalu rekonsiliasi jumlah serta status pesanan. Jangan commit CSV yang berisi data pelanggan ke GitHub. Simpan backup sampai proses migrasi tervalidasi.

## Catatan

Fitur yang spesifik bergantung pada Google seperti sinkronisasi Google Calendar dan autentikasi admin berbasis lokasi/perangkat perlu ditinjau terpisah sebelum dianggap setara dengan backend lama. Notifikasi Telegram tetap opsional melalui environment variables. Supabase Free punya kuota serta kebijakan jeda project yang perlu dipantau.

---
© Tama Andrea · Kalianda, Lampung Selatan
