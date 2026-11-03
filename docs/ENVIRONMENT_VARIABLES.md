# Environment Variables — Tama Andrea Studio

Variabel harus mengikuti nama yang dibaca runtime, bukan sekadar daftar dashboard.

## Runtime stack
- Frontend HTML/CSS/JS di Vercel.
- API server-side di Vercel Functions.
- Database utama Supabase PostgreSQL.
- Admin: Supabase Auth password + OTP Telegram.
- Pesan/keluhan: Supabase primary storage + Formspree backup + Telegram notification.
- Katalog dan ulasan: tabel Supabase, diakses melalui API same-origin.

Project Supabase yang benar: `tama-design`, ref `oimpglrxjgdifzmmdogz`, URL `https://oimpglrxjgdifzmmdogz.supabase.co`. Jangan memakai project `Linux-Software-Lab`.

## Variabel aktif

| Key | Environment | Keterangan |
|---|---|---|
| `SUPABASE_URL` | Server | URL dasar project Supabase, tanpa `/rest/v1/`. |
| `SUPABASE_PUBLISHABLE_KEY` | Server + boleh dipublikasikan melalui `/api/config` | Public/publishable key, tidak menggantikan RLS. |
| `SUPABASE_SECRET_KEY` | Server only | Secret key berprivilege untuk REST API. Jangan pernah masuk browser/Git/log. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only, fallback legacy | Hanya fallback bila secret key baru belum tersedia. |
| `ADMIN_USER_IDS` | Server only | UUID user Supabase Auth yang diizinkan. Saat audit terakhir belum tersedia dan belum ada user Auth. |
| `TELEGRAM_BOT_TOKEN` | Server only | Token bot. Jangan disimpan di source code. |
| `TELEGRAM_CHAT_ID` | Server only | Grup privat admin Tama Andrea Studio. |
| `FORMSPREE_ENDPOINT` | Server | Endpoint Formspree untuk backup pesan/keluhan. Bukan secret, tetapi tetap dikelola melalui Vercel. |

Nilai Formspree Tama Andrea Studio: `https://formspree.io/f/movkypgd`. Endpoint hanya digunakan sebagai salinan tambahan untuk pesan/keluhan; data utama tetap disimpan di Supabase.

## Variabel yang tidak dipakai runtime saat ini

`SUPABASE_JWT_SECRET`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, dan variabel koneksi Prisma/Postgres tidak dibaca oleh website HTML statis ini. Jangan menambahkan atau memindahkan secret hanya untuk menyesuaikan daftar variabel framework lain.

## Admin security

1. Buat akun admin pada Supabase Authentication.
2. Salin UUID user ke `ADMIN_USER_IDS` di Vercel Production.
3. Password login diverifikasi oleh Supabase Auth.
4. Setelah login, OTP 6 digit dikirim ke grup Telegram.
5. OTP berlaku 5 menit, maksimal 5 percobaan; sesi terverifikasi berlaku 12 jam dan terikat ke Supabase Auth session.
6. Tidak perlu TOTP authenticator untuk alur admin baru.

## Prinsip
- Jangan memasukkan password, secret key, token bot, OTP, atau data pelanggan ke GitHub.
- Jangan memberi akses browser langsung ke tabel operasional; RLS dan revoke grants harus dipertahankan.
- Ubah environment variable melalui Vercel Settings, lalu redeploy.
