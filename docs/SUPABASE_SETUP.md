# Migrasi backend Tama Andrea ke Supabase

Backend baru memakai Supabase PostgreSQL sebagai database, Vercel Functions sebagai API server, dan Supabase Auth + TOTP sebagai autentikasi admin. Kunci rahasia database tidak dikirim ke browser dan tidak boleh dimasukkan ke GitHub.

## 1. Buat proyek gratis

1. Buka https://supabase.com dan buat project baru pada organisasi milikmu.
2. Simpan password database di pengelola password. Password database berbeda dengan password akun admin.
3. Buka Project Settings / API Keys dan salin Project URL, Publishable key, serta Secret key.
4. Buka SQL Editor dan jalankan migrasi SQL secara berurutan: `20261019000000_tama_andrea_core.sql`, `20261019000100_harden_backend_indexes.sql`, lalu `20261019000200_website_message_inbox.sql`. Jika migrasi awal sudah diterapkan, jalankan hanya migrasi yang belum diterapkan.
5. Buka Authentication → Users dan buat akun admin dengan email yang kamu kendalikan. Aktifkan MFA TOTP untuk akun admin memakai aplikasi authenticator. Catat UUID user dari halaman Users.

Supabase Free saat ini mencakup database PostgreSQL 500 MB dan dapat menjeda project yang tidak aktif selama 7 hari. Periksa kembali halaman pricing saat akan mengandalkannya untuk produksi: https://supabase.com/pricing.

## 2. Pasang environment variables di Vercel

Buka Vercel → proyek tama-design → Settings → Environment Variables. Tambahkan variabel berikut untuk Production dan Preview sesuai kebutuhan:

- SUPABASE_URL — Project URL dari Supabase.
- SUPABASE_PUBLISHABLE_KEY — Publishable key; boleh dipakai browser.
- SUPABASE_SECRET_KEY — Secret key; hanya untuk Vercel Functions, jangan pernah ditaruh di HTML/JavaScript browser atau GitHub.
- ADMIN_USER_IDS — UUID user admin yang diizinkan, bukan password. Untuk beberapa admin gunakan UUID dipisahkan koma.
- TELEGRAM_BOT_TOKEN dan TELEGRAM_CHAT_ID — opsional; untuk meneruskan pesanan baru dan laporan dari website ke Telegram. Token hanya disimpan di Vercel, jangan di GitHub atau chat.

Redeploy project setelah variabel ditambahkan. SUPABASE_SERVICE_ROLE_KEY diterima sebagai fallback untuk proyek lama, tetapi gunakan Secret key baru bila tersedia.

## 3. Keamanan database

Semua tabel operasional menggunakan Row Level Security dan tidak memberikan akses tabel ke anon atau authenticated. Website publik hanya berbicara dengan endpoint /api/public; endpoint server memakai Secret key yang tersimpan sebagai environment variable Vercel. Jangan menambahkan Secret key ke js/site.js, admin.html, atau berkas lain yang dikirim ke browser.

Akses admin.html hanya diberikan kepada UUID dalam ADMIN_USER_IDS yang sudah masuk menggunakan Supabase Auth dan menyelesaikan TOTP MFA hingga level aal2. Simpan kode atau faktor authenticator cadangan secara aman.

## 4. Data lama dari Google Sheets

Pembuatan database baru tidak otomatis memindahkan data lama. Sebelum menutup akses ke penyimpanan lama, ekspor sheet Orders dan Customers ke CSV sebagai cadangan privat. Setelah database Supabase siap, import pelanggan ke tabel customers lalu pesanan ke orders melalui Supabase Table Editor. Sesuaikan header dengan nama kolom snake_case di skema SQL. Jangan commit CSV yang berisi data pelanggan ke GitHub. Jika data lama tidak perlu dipertahankan, simpan cadangan pribadi terlebih dahulu sebelum menghapusnya.

## 5. Pemeriksaan setelah konfigurasi

1. Buka /api/config; respons sukses hanya berisi URL proyek dan Publishable key.
2. Uji GET /api/public?action=serviceConfig dan GET /api/public?action=availability.
3. Buat satu pesanan uji memakai kontak milik sendiri, lalu cek kodenya melalui pelacak pesanan.
4. Masuk ke /admin.html, uji status/pembayaran pesanan, dan periksa audit log.
5. Periksa GitHub Actions dan Vercel Deployment Logs. Jangan mengaktifkan formulir publik sebelum migrasi SQL dan environment variables selesai.

## 6. Notifikasi Telegram dan kotak masuk website

1. Buat bot melalui [@BotFather](https://t.me/BotFather) dan salin token bot. Jangan kirim token ke siapa pun atau memasukkannya ke source code.
2. Kirim pesan awal ke bot yang baru dibuat. Untuk koordinasi tim, tambahkan bot ke grup Telegram privat lalu kirim pesan di grup itu.
3. Dapatkan chat ID dari pembaruan bot melalui dokumentasi resmi [Telegram Bot API](https://core.telegram.org/bots/api). Untuk grup, chat ID umumnya bernilai negatif. Jangan publikasikan URL API yang mengandung token.
4. Di Vercel → Project → Settings → Environment Variables, tambahkan TELEGRAM_BOT_TOKEN dan TELEGRAM_CHAT_ID untuk Production. Simpan lalu redeploy.
5. Kirim satu pesanan uji dan satu laporan uji dari website. Pastikan keduanya masuk ke chat/grup yang benar. Periksa log Vercel jika gagal; database tetap menyimpan laporan website meskipun Telegram belum dikonfigurasi.
6. Laporan dari halaman Keluhan disimpan di tabel `website_messages`. API publiknya adalah `POST /api/messages`; endpoint tidak menerima akses tabel langsung dari browser.

Jangan tempel token bot, secret key Supabase, atau credential lain di GitHub, formulir website, atau percakapan. Bila token terlanjur terekspos, cabut dan buat ulang melalui BotFather.

## 7. Batas migrasi awal

Implementasi ini memindahkan alur inti website—pengiriman pesanan, pelacakan, verifikasi nama/email, konfigurasi layanan, ketersediaan, daftar pesanan, pelanggan, dan pembaruan administrasi—ke Supabase/Vercel. Fitur operasional tambahan yang sebelumnya bergantung pada layanan khusus Google (misalnya sinkronisasi Google Calendar dan gerbang admin yang terikat ke lokasi/perangkat) perlu ditinjau terpisah sebelum dianggap setara. Notifikasi Telegram tetap opsional melalui environment variables. Jangan hapus backup data lama sampai pengujian serta rekonsiliasi data selesai.
