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
| `ADMIN_USER_IDS` | Server only | Daftar UUID user Supabase Auth yang diizinkan, dipisahkan koma jika lebih dari satu. Allowlist admin aktif di Vercel Production; jangan masukkan UID asli ke Git atau variabel frontend. |
| `TELEGRAM_BOT_TOKEN` | Server only | Token bot. Jangan disimpan di source code. |
| `TELEGRAM_CHAT_ID` | Server only | Grup privat admin Tama Andrea Studio. |
| `FORMSPREE_ENDPOINT` | Server | Endpoint Formspree untuk backup pesan/keluhan. Bukan secret, tetapi tetap dikelola melalui Vercel. |

Nilai Formspree Tama Andrea Studio: `https://formspree.io/f/movkypgd`. Endpoint hanya digunakan sebagai salinan tambahan untuk pesan/keluhan; data utama tetap disimpan di Supabase.

## Variabel yang tidak dipakai runtime saat ini

`SUPABASE_JWT_SECRET`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, dan variabel koneksi Prisma/Postgres tidak dibaca oleh website HTML statis ini. Jangan menambahkan atau memindahkan secret hanya untuk menyesuaikan daftar variabel framework lain.

## Admin security

1. Autentikasi password ditangani Supabase Auth; akun admin harus memiliki email terverifikasi.
2. Allowlist `ADMIN_USER_IDS` ditempatkan sebagai environment variable server-only pada Vercel Production. Jangan menaruh UID admin di JavaScript browser atau repository.
3. Setelah password valid, server membuat OTP 6 digit dengan generator kriptografis dan mengirimkannya ke grup Telegram privat. Hash HMAC OTP yang disimpan di database, bukan kode mentah.
4. Masa berlaku OTP 5 menit, maksimal 5 percobaan. Penerbitan kode baru membatalkan challenge sebelumnya untuk akun yang sama.
5. Verifikasi OTP berjalan atomik di PostgreSQL sehingga kode sukses hanya dapat dikonsumsi sekali, termasuk ketika ada permintaan paralel. RPC verifikasi hanya dapat dipanggil oleh `service_role`; role browser `anon` dan `authenticated` tidak mendapat hak eksekusi.
6. Sesi admin berlaku maksimal 12 jam dan terikat pada `session_id` Supabase Auth yang aktif. Setiap permintaan API admin memeriksa ulang sesi Auth dan sesi OTP; sign-out atau sesi Auth yang dicabut otomatis menolak akses.
7. Pembatasan permintaan diterapkan berdasarkan IP dan UID: permintaan OTP, verifikasi OTP, serta penggunaan API admin memiliki bucket terpisah.

### Catatan perlindungan password

Supabase Security Advisor masih menandai *Leaked Password Protection* sebagai nonaktif. Fitur pemeriksaan password terhadap daftar kebocoran melalui Have I Been Pwned tersedia pada paket Pro dan di atasnya. Project saat ini berada pada paket Free, sehingga pengaktifannya memerlukan perubahan paket terlebih dahulu. Gunakan password admin yang unik dan tidak dipakai ulang; jangan pernah mengirim password atau kode OTP ke chat.

## Prinsip
- Jangan memasukkan password, secret key, token bot, OTP, atau data pelanggan ke GitHub.
- Jangan memberi akses browser langsung ke tabel operasional; RLS dan revoke grants harus dipertahankan.
- Ubah environment variable melalui Vercel Settings, lalu redeploy.
