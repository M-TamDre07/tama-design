# Setup Supabase — Tama Andrea Studio

## Proyek yang benar

Gunakan Supabase project `tama-design` dengan ref `oimpglrxjgdifzmmdogz` dan URL `https://oimpglrxjgdifzmmdogz.supabase.co`. Jangan arahkan website ini ke project Linux Software Lab.

## Database

Migrasi yang digunakan:

1. `20261019000000_tama_andrea_core.sql`
2. `20261019000100_harden_backend_indexes.sql`
3. `20261019000200_website_message_inbox.sql`
4. `20261022200359_explicit_deny_browser_policies.sql`
5. `20261103101431_studio_catalog_reviews_telegram_otp.sql`
6. `20261103103000_formspree_backup_tracking.sql`
7. `20261103104000_admin_otp_session_binding.sql`

Sebelum menerapkan migrasi, periksa daftar migration history pada project. Jangan menjalankan ulang migrasi yang sudah tercatat. Semua tabel operasional menggunakan RLS dan tidak memberi akses langsung kepada browser.

### Tabel studio tambahan

- `studio_services`: katalog layanan desain grafis, harga, urutan, status aktif, dan layanan unggulan.
- `studio_reviews`: ulasan pelanggan dengan status `pending`, `published`, `rejected`, atau `archived`.
- `admin_otp_challenges`: hash OTP, masa berlaku, dan jumlah percobaan.
- `admin_otp_sessions`: sesi admin yang telah diverifikasi melalui Telegram.
- `website_messages.formspree_status` dan `formspree_sent_at`: status backup Formspree.

## Environment Vercel

Tambahkan variabel berikut pada project `tamaandrea`:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `ADMIN_USER_IDS`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `FORMSPREE_ENDPOINT`

Nilai Formspree untuk inbox masukan Tama Andrea Studio adalah `https://formspree.io/f/movkypgd`. Endpoint ini hanya dipakai sebagai salinan tambahan untuk formulir pesan/keluhan; database Supabase tetap menjadi sumber utama.

Jangan menaruh secret key Supabase atau token bot Telegram di HTML, JavaScript browser, GitHub, atau chat.

## Pembuatan akun admin

1. Buka Supabase → Authentication → Users.
2. Buat satu akun admin menggunakan email yang kamu kendalikan.
3. Verifikasi email bila konfigurasi project memerlukannya.
4. Salin UUID akun, bukan password.
5. Masukkan UUID ke variabel `ADMIN_USER_IDS` pada Vercel Production.
6. Redeploy Vercel.

Tidak perlu mendaftarkan TOTP authenticator untuk alur admin baru. Setelah login password Supabase berhasil, server akan mengirim OTP enam digit ke grup Telegram privat. OTP berlaku lima menit dan dibatasi maksimal lima percobaan. Sesi admin terverifikasi berlaku maksimal 12 jam dan terikat ke sesi Supabase Auth.

## Telegram

Bot harus menjadi anggota grup privat admin dan memiliki izin mengirim pesan. `TELEGRAM_BOT_TOKEN` disimpan sebagai secret di Vercel; `TELEGRAM_CHAT_ID` menunjuk ke grup admin. Jangan menempel token ke GitHub atau chat. Bila token pernah terekspos, rotasi melalui BotFather.

## Uji setelah setup

- `GET /api/config`
- `GET /api/catalog?action=services`
- `GET /api/catalog?action=reviews`
- Formulir pesanan dan pelacakan order
- Formulir masukan: Supabase + Formspree + Telegram
- Login admin: password + OTP Telegram
- Moderasi ulasan dan pengelolaan katalog layanan

Periksa GitHub Actions dan Vercel Deployment Logs sebelum menyatakan website siap produksi.
