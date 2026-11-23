# Setup Supabase — Tama Andrea Studio

## Proyek yang benar

Gunakan Supabase project `tama-design` dengan ref `oimpglrxjgdifzmmdogz` dan URL `https://oimpglrxjgdifzmmdogz.supabase.co`. Jangan arahkan website ini ke project Linux Software Lab.

## Database

Migrasi yang digunakan:

1. `20261019115625_tama_andrea_core.sql`
2. `20261019120513_harden_backend_indexes.sql`
3. `20261019133524_website_message_inbox.sql`
4. `20261022200359_explicit_deny_browser_policies.sql`
5. `20261103101431_studio_catalog_reviews_telegram_otp.sql`
6. `20261103101530_formspree_backup_tracking.sql`
7. `20261103101644_admin_otp_session_binding.sql`
8. `20261103103649_studio_cms_billing_and_order_timeline.sql`
9. `20261103104640_restrict_order_event_trigger_execute.sql`
10. `20261103105315_admin_transaction_atomicity.sql`
11. `20261103111938_admin_otp_session_hardening.sql`
12. `20261123170100_studio_media_news_achievements.sql`

Sebelum menerapkan migrasi, periksa daftar migration history pada project. Jangan menjalankan ulang migrasi yang sudah tercatat. Semua tabel operasional menggunakan RLS dan tidak memberi akses langsung kepada browser. Migrasi media juga mempertahankan pola tersebut: role browser tidak mendapat grant untuk tabel metadata CMS; API admin memverifikasi Supabase Auth + OTP sebelum menggunakan secret key server-side.

### Tabel studio tambahan

- `studio_services`: katalog layanan desain grafis, harga, urutan, status aktif, dan layanan unggulan.
- `studio_reviews`: ulasan pelanggan dengan status `pending`, `published`, `rejected`, atau `archived`.
- `admin_otp_challenges`: hash OTP, masa berlaku, dan jumlah percobaan.
- `admin_otp_sessions`: sesi admin yang telah diverifikasi melalui Telegram.
- `studio_portfolio`: portofolio publik yang dikelola admin, dapat terhubung ke aset media dan layanan.
- `studio_media_assets`: metadata file gambar; byte file disimpan di Supabase Storage, bukan kolom PostgreSQL.
- `studio_achievements`: prestasi/sertifikat dengan status draft, published, dan archived.
- `studio_news`: berita/kegiatan studio dengan ringkasan, isi teks, gambar sampul, dan status publikasi.
- Bucket `studio-media-public`: gambar WebP yang memang boleh tampil publik.
- Bucket `studio-media-private`: aset internal yang tidak diberi URL publik.
- `studio_faq`: pertanyaan dan jawaban publik yang dikelola admin.
- `studio_payment_methods`: detail metode pembayaran; hanya baris aktif ditampilkan secara publik.
- `order_events`: timeline status pesanan otomatis dan catatan progres yang dibuat admin. Eksekusi fungsi trigger dibatasi untuk mencegah akses langsung dari role browser.
- `transactions`, `receipts`, dan `service_notes`: transaksi, nota, serta catatan operasional yang ditampilkan di panel admin. Pencatatan transaksi dan sinkronisasi status pesanan/nota dilakukan secara atomik melalui RPC server-only `admin_record_transaction`.
- `website_messages.formspree_status` dan `formspree_sent_at`: status backup Formspree.

## Media library dan konversi gambar

Upload menerima PNG, JPG, atau WebP dari admin. Browser mengubahnya menjadi WebP, membatasi dimensi/ukuran hasil, lalu mengirim file ke Storage melalui token unggah bertanda tangan yang dibuat API admin. Token bersifat sementara dan tidak memberikan akses ke tabel database.

- File maksimum hasil konversi: 8 MB.
- Bucket publik: hanya untuk gambar yang disetujui tampil pada portofolio, prestasi, atau berita.
- Bucket privat: untuk aset internal; object path-nya tidak dikembalikan oleh API publik.
- PostgreSQL menyimpan metadata seperti ukuran, dimensi, kategori, alt text, hash, dan relasi konten.
- API publik hanya mengembalikan aset bucket publik berstatus ready.
- Sertifikat harus diperiksa dan data pribadi disamarkan sebelum dipublikasikan.

Migrasi belum otomatis diterapkan oleh deployment Vercel. Periksa migration history dan tinjau preview terlebih dahulu sebelum mengajukan penerapan ke project Supabase production.

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
