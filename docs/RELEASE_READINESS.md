# Release Readiness — Tama Andrea Studio

## Target integrasi
- GitHub: `M-TamDre07/tama-design`, branch `main`.
- Vercel: project `tamaandrea`.
- Supabase: project `tama-design`, ref `oimpglrxjgdifzmmdogz`.
- Formspree: feedback backup `https://formspree.io/f/movkypgd`.
- Telegram: private admin group configured by `TELEGRAM_CHAT_ID`.

## Implementasi yang sudah ada
- Public site berfokus pada desain grafis.
- Katalog layanan berasal dari `studio_services`.
- Ulasan masuk sebagai `pending` dan hanya muncul setelah moderasi.
- Order tetap memakai database Supabase dan API Vercel.
- Inbox pesan memakai Supabase primary storage, Formspree backup, dan Telegram.
- Admin API mendukung katalog layanan dan moderasi ulasan.
- Admin login menggunakan Supabase Auth + OTP Telegram, bukan TOTP.
- PWA cache tidak menyimpan halaman admin atau API.
- Tabel katalog, ulasan, dan OTP memakai RLS dan menolak akses browser langsung.

## Hal yang masih memerlukan tindakan pemilik akun
- Buat akun admin di Supabase Authentication dan masukkan UUID-nya ke `ADMIN_USER_IDS` pada Vercel. Saat audit database, belum ada user Auth dan variabel allowlist belum tersedia.
- Uji OTP end-to-end di grup Telegram setelah akun admin diizinkan.
- Uji kirim pesan Formspree menggunakan formulir keluhan; cek status backup di `website_messages`.
- Periksa hasil GitHub Actions dan Vercel setelah seluruh commit terbaru.

## Pengujian rilis
- [ ] GitHub Actions `Site integrity` seluruhnya sukses.
- [ ] Vercel production deployment berstatus READY pada commit terbaru.
- [ ] `GET /api/catalog?action=services` menampilkan katalog aktif.
- [ ] `GET /api/catalog?action=reviews` hanya menampilkan review published.
- [ ] Form order menyimpan order, order code, dan receipt reference.
- [ ] Tracking order tetap memerlukan verifikasi nama dan email.
- [ ] Form review tersimpan sebagai pending dan tidak tampil sebelum moderasi.
- [ ] Admin dapat membuat, mengubah, mengarsipkan layanan dan memoderasi review.
- [ ] Pesan website tersimpan di Supabase; Formspree dan Telegram delivery status tercatat.
- [ ] Login admin password + Telegram OTP berhasil dan panel menolak sesi yang belum diverifikasi.
- [ ] Security Advisor tidak menunjukkan temuan baru; RLS dan revoke grants tetap aktif.

## Rollback
Gunakan deployment Vercel terakhir yang diketahui baik. Jangan menghapus data, tabel, atau kolom sebagai langkah rollback. Migrasi yang sudah diterapkan bersifat additive; perubahan skema berikutnya harus tetap backward-compatible.
