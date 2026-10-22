# Environment Variables — Tama Andrea

Dokumen ini menjadi kontrak konfigurasi resmi untuk repo. Nama variabel ditentukan oleh kode yang membacanya; membuat variabel di dashboard saja tidak otomatis membuat aplikasi menggunakannya.

## 1. Arsitektur saat ini

- Frontend: HTML, CSS, JavaScript statis.
- Backend/API: Node.js Vercel Functions di direktori api/.
- Database: Supabase PostgreSQL melalui Data REST API (/rest/v1/), bukan koneksi PostgreSQL langsung.
- Admin: Supabase Auth + MFA TOTP dan allowlist UUID pada backend.
- Notifikasi: Telegram Bot API dari server Node.js.
- Next.js dan PHP tidak digunakan oleh runtime repo saat ini. Jangan menambahkan framework atau variabelnya hanya agar daftar terlihat lengkap. Jika kelak bermigrasi, lakukan sebagai proyek terpisah dengan tes dan rencana rollback.

Proyek Supabase website yang benar: tama-design, ref oimpglrxjgdifzmmdogz, URL dasar https://oimpglrxjgdifzmmdogz.supabase.co. Proyek ttofugaqwthmvhvntdlc bernama Linux-Software-Lab dan bukan database operasional website ini.

## 2. Variabel yang dibutuhkan repo saat ini

Atur melalui Vercel → Project → Settings → Environment Variables. Pastikan URL dan seluruh key berasal dari proyek Supabase yang sama.

| Nama | Wajib? | Klasifikasi | Fungsi |
|---|---|---|---|
| SUPABASE_URL | Ya | Konfigurasi server | URL dasar proyek Supabase, tanpa /rest/v1/. Backend menambahkan jalur REST secara otomatis. |
| SUPABASE_PUBLISHABLE_KEY | Ya | Public/publishable | Key untuk gateway Supabase. Boleh terekspos, tetapi bukan pengganti grants, RLS, atau otorisasi. Endpoint /api/config hanya mengirim URL dan publishable key ke browser. |
| SUPABASE_SECRET_KEY | Ya untuk operasi database backend | Secret server-only | Key berprivilege yang dipakai Vercel Functions. Secret key melewati RLS; jangan letakkan di browser, HTML, Git, URL, log, atau chat. |
| SUPABASE_SERVICE_ROLE_KEY | Fallback kompatibilitas | Secret server-only, legacy | Kode masih menerima variabel ini jika SUPABASE_SECRET_KEY kosong. Utamakan secret key baru dan nonaktifkan key lama hanya setelah semua penggunaan diverifikasi. |
| ADMIN_USER_IDS | Ya untuk admin | Allowlist server-side | UUID pengguna Supabase Auth yang boleh menjadi admin, dipisahkan koma jika lebih dari satu. Ini bukan password; endpoint tetap memvalidasi sesi dan MFA aal2. |
| TELEGRAM_BOT_TOKEN | Jika ingin notifikasi Telegram | Secret server-only | Kredensial bot. Token lama yang pernah terekspos harus dicabut dan diganti; token baru hanya disimpan di Vercel. |
| TELEGRAM_CHAT_ID | Jika ingin notifikasi Telegram | Metadata kanal privat | ID percakapan/grup tujuan. Bukan password, tetapi jangan publikasikan detail kanal admin. |

## 3. Variabel dari daftar lain yang tidak dibaca repo ini sekarang

| Nama | Kategori | Keputusan untuk repo ini |
|---|---|---|
| SUPABASE_JWT_SECRET | Secret sangat sensitif untuk penandatanganan JWT legacy | Tidak diperlukan. Jangan gunakan sebagai pengganti API key atau untuk membuat token admin sendiri. |
| SUPABASE_ANON_KEY | Public key legacy | Tidak dibaca. Utamakan SUPABASE_PUBLISHABLE_KEY. |
| NEXT_PUBLIC_SUPABASE_URL | Public, khusus kode Next.js | Tidak dibaca website HTML statis ini. |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Public key legacy yang bisa masuk bundle browser Next.js | Tidak dibaca; bila benar-benar memakai Next.js kelak, gunakan publishable key baru. |
| NEXT_PUBLIC__ASE_ANON_KEY | Nama terpotong/salah | Jangan buat. |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Public, untuk frontend Next.js bila kode membacanya | Tidak dibaca repo sekarang. |
| NEXT_PUBLIC__LISHABLE_KEY / SUPABASE_PU...ISHABLE_KEY | Nama terpotong/salah | Jangan buat. Gunakan nama variabel persis yang dibaca kode. |
| POSTGRES_URL | Secret connection string | Tidak dibaca oleh kode saat ini. |
| POSTGRES_PRISMA_URL | Secret connection string untuk Prisma/pooling pada integrasi tertentu | Tidak dibaca; repo ini tidak memakai Prisma. |
| POSTGRES_URL_NON_POOLING | Secret connection string non-pooled/direct | Tidak dibaca. Jangan menghubungkannya ke fungsi serverless tanpa desain koneksi yang sesuai. |
| POSTGRES_USER / POSTGRES_HOST / POSTGRES_DATABASE | Metadata database/akun | Tidak dibaca oleh repo saat ini. |
| POSTGRES_PASSWORD | Secret database | Tidak dibaca oleh repo saat ini; jangan simpan di browser atau Git. |

POSTGRES_* biasanya dipakai oleh kode yang terhubung langsung ke PostgreSQL atau ORM. Website ini memakai Supabase HTTP REST API melalui api/_lib/db.js. Jangan mencampur kedua model koneksi tanpa migrasi yang disengaja.

## 4. Aturan public vs private

- Pada Next.js, variabel dengan prefix NEXT_PUBLIC_ dapat disisipkan ke JavaScript browser saat build. Jangan pernah memberi prefix itu ke password, connection string berisi kredensial, JWT signing secret, secret/service-role key, atau token Telegram.
- Pada HTML statis, process.env tidak tersedia langsung di browser. Variabel dibaca server, lalu hanya data yang aman dikirim ke browser. api/config.js memang hanya mengirim URL dan publishable key, bukan secret key.
- Jangan mengirim seluruh process.env ke browser atau menyimpan secrets di localStorage/sessionStorage.
- Jangan membuat policy RLS terbuka hanya untuk meniadakan peringatan dashboard. Pertahankan model akses yang sudah dirancang setelah grant dan endpoint diverifikasi.
- Jangan commit file .env produksi; .env.example hanya berisi placeholder.

## 5. Contoh implementasi saat ini

~~~js
// api/_lib/db.js — server-side only
const url = String(process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
const publishableKey = String(process.env.SUPABASE_PUBLISHABLE_KEY || '').trim();
const secretKey = String(
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  ''
).trim();

if (!url || !publishableKey || !secretKey) {
  throw new Error('Backend database belum dikonfigurasi.');
}
~~~

Backend melakukan request ke SUPABASE_URL + /rest/v1/ dari server. Key berprivilege tidak dikirim ke browser. Halaman admin meminta GET /api/config dan menerima hanya URL serta publishable key. Operasi data admin berjalan lewat /api/admin yang memvalidasi sesi, allowlist UUID, dan MFA.

## 6. Jika nanti benar-benar bermigrasi ke Next.js

Contoh berikut hanya untuk aplikasi Next.js yang sudah memiliki kode Next.js. Jangan menyalinnya ke HTML statis tanpa migrasi kode.

~~~env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_placeholder

# Server only — never prefix with NEXT_PUBLIC
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=sb_secret_placeholder
~~~

Placeholder tersebut bukan kredensial valid. Secret dipakai dalam Server Actions/Route Handlers/backend yang memverifikasi pengguna serta izin sebelum mengakses data.

## 7. Prosedur perubahan aman

1. Cari pembacaan process.env di repo sebelum menambah variabel.
2. Cocokkan URL dan key dengan satu project ref Supabase yang sama.
3. Tambahkan secrets hanya melalui Vercel sebagai encrypted/sensitive values; jangan menempelkan nilainya di issue, log, atau percakapan.
4. Uji di Preview: API konfigurasi, service config, availability, satu order dummy, tracking/verifikasi, inbox laporan, MFA admin, serta Telegram.
5. Pastikan /api/config tidak memuat secret dan request tak terautentikasi ditolak oleh API admin.
6. Redeploy setelah variabel berubah; jangan membuka formulir publik sampai tes operasional lulus.

## Referensi resmi

- https://supabase.com/docs/guides/getting-started/api-keys
- https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys
- https://supabase.com/docs/guides/auth/jwts
- https://supabase.com/docs/guides/database/connecting-to-postgres
- https://vercel.com/docs/environment-variables
