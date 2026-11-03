# Operations Runbook — Tama Andrea Studio

## Arsitektur produksi

- Frontend statis: Vercel.
- API: Vercel Functions di `api/`.
- Database utama: Supabase PostgreSQL project `tama-design`.
- Admin: Supabase Auth password + OTP Telegram.
- Pesan/keluhan: disimpan di Supabase, dikirim sebagai backup ke Formspree, dan dinotifikasikan ke grup Telegram.
- Pesanan: disimpan di Supabase dan notifikasi operasional dikirim ke Telegram.

## Pemeriksaan rutin

1. Periksa GitHub Actions workflow `Site integrity`.
2. Periksa deployment Vercel terbaru pada branch `main`.
3. Uji halaman beranda, layanan, karya/ulasan, pemesanan, dan bantuan.
4. Uji `GET /api/catalog?action=services` dan `GET /api/catalog?action=reviews`.
5. Uji pengiriman pesan melalui `POST /api/messages`; pastikan row Supabase tersimpan dan status Formspree/Telegram tercatat.
6. Uji pesanan menggunakan kontak milik sendiri, lalu verifikasi nomor order dan nota.
7. Uji login admin: password Supabase Auth, kirim OTP Telegram, verifikasi OTP, lalu buka dashboard.
8. Periksa tabel `notifications`, `website_messages`, `audit_logs`, dan `error_logs` untuk status operasional.

## Jika admin tidak bisa login

- Pastikan akun telah dibuat pada Supabase Authentication.
- Pastikan UUID akun ada pada `ADMIN_USER_IDS` di Vercel.
- Pastikan `TELEGRAM_BOT_TOKEN` dan `TELEGRAM_CHAT_ID` menunjuk ke grup privat yang benar.
- Pastikan bot masih menjadi anggota grup dan memiliki izin mengirim pesan.
- OTP berlaku lima menit; minta kode baru bila kedaluwarsa.
- Jangan meminta atau menyalin OTP/password pelanggan atau admin ke log.

## Jika Formspree gagal

Supabase tetap menjadi penyimpanan utama. Periksa `formspree_status` dan `formspree_sent_at` pada `website_messages`, lalu periksa endpoint `FORMSPREE_ENDPOINT` dan dashboard Formspree. Kegagalan backup tidak boleh menghapus pesan utama.

## Jika Telegram gagal

Pesanan dan pesan utama tetap disimpan di Supabase. Periksa tabel `notifications` atau kolom status Telegram pada `website_messages`. Pastikan bot memiliki akses ke grup privat. Untuk OTP admin, pengiriman Telegram harus berhasil sebelum proses verifikasi dapat dilanjutkan.

## Perubahan database

- Buat migrasi baru yang additive dan backward-compatible.
- Terapkan migrasi ke Supabase, lalu commit file migrasi dengan timestamp yang sama ke GitHub.
- Jangan menghapus tabel atau kolom berisi data sebelum ekspor backup dan rekonsiliasi.
- Tabel operasional dan OTP harus tetap memakai RLS; jangan memberikan grant browser langsung.

## Rilis

1. Periksa SHA branch `main`.
2. Jalankan GitHub Actions.
3. Periksa deployment Vercel dan route yang berubah.
4. Jalankan smoke test API serta formulir pada domain produksi.
5. Jika ada regresi, gunakan deployment Vercel terakhir yang diketahui baik; jangan menonaktifkan proteksi admin atau RLS sebagai workaround.
