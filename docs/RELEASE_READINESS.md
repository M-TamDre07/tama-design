# Release readiness — Tama Andrea

Dokumen ini adalah gerbang operasional sebelum formulir publik dibuka kembali. Konfigurasi yang tersimpan di GitHub tidak otomatis menjamin konfigurasi runtime Vercel sudah sama.

## Target integrasi yang benar

- **GitHub:** `M-TamDre07/tama-design`, branch `main`.
- **Vercel:** project `tamaandrea`, source repository `M-TamDre07/tama-design`.
- **Supabase website:** `tama-design`, project ref `oimpglrxjgdifzmmdogz`, URL dasar `https://oimpglrxjgdifzmmdogz.supabase.co`.
- **Jangan gunakan:** `ttofugaqwthmvhvntdlc` untuk database website. Ref tersebut milik proyek terpisah `Linux-Software-Lab`; hasil pemeriksaan sebelumnya menunjukkan belum ada tabel di schema `public` pada proyek itu.

Project URL harus berupa URL dasar, tanpa `/rest/v1/`. Backend menambahkan jalur REST sendiri. Jangan menyalin publishable key atau secret key antarproyek.

## Environment variables runtime

Atur melalui Vercel Project Settings → Environment Variables, bukan di source code:

| Nama | Nilai yang diharapkan |
|---|---|
| `SUPABASE_URL` | `https://oimpglrxjgdifzmmdogz.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable key dari proyek `tama-design` |
| `SUPABASE_SECRET_KEY` | Secret key dari proyek `tama-design`; server only |
| `ADMIN_USER_IDS` | UUID akun Supabase Auth yang memang diizinkan menjadi admin |
| `TELEGRAM_BOT_TOKEN` | Token bot baru setelah rotasi |
| `TELEGRAM_CHAT_ID` | ID grup Telegram privat yang dipilih untuk notifikasi |

Set variabel pada Production dan Preview yang dipakai untuk pengujian. Setelah mengubah environment variable, buat redeploy agar fungsi Vercel menerima konfigurasi baru. Hindari memperlihatkan nilai rahasia saat melakukan audit.

## Gerbang keamanan admin

1. Buat akun melalui Supabase Authentication → Users; password database tidak menjadi password login admin.
2. Aktifkan MFA TOTP dan simpan metode pemulihan dengan aman.
3. Tambahkan UUID akun tersebut ke `ADMIN_USER_IDS`.
4. Pastikan `/api/admin` menolak request tanpa sesi Auth, menolak user yang UUID-nya tidak diizinkan, serta menolak sesi yang belum mencapai MFA assurance level `aal2`.
5. Halaman admin menggunakan `Cache-Control: no-store`, `X-Robots-Tag`, dan Content Security Policy. Service worker tidak boleh menyimpan halaman admin ataupun respons API dalam cache.
6. Secret key database dan token Telegram tidak boleh muncul dalam HTML, file JavaScript, commit, log, atau browser network response.

## Gerbang pengujian end-to-end

Jalankan satu per satu pada Preview sebelum merilis ke Production. Gunakan nama, email, dan nomor telepon uji milik sendiri.

- [ ] `GET /api/config` merespons sukses hanya jika tiga nilai konfigurasi database wajib lengkap; payload browser berisi URL dan publishable key saja, bukan secret key.
- [ ] `GET /api/public?action=serviceConfig` dan `GET /api/public?action=availability` bekerja tanpa membuka akses tabel langsung ke `anon`.
- [ ] Satu pesanan uji tersimpan di `orders`, kode pesanan/nota terbentuk, pelacakan dan verifikasi nama-email berjalan, dan duplikasi request ditangani secara aman.
- [ ] Notifikasi pesanan muncul di grup Telegram privat. API Telegram harus mengembalikan `ok: true` sebelum status internal dicatat sebagai `sent`.
- [ ] Satu laporan uji tersimpan di `website_messages`, terlihat di inbox admin, dapat ditandai Baru/Diproses/Selesai, dan status Telegram terlihat.
- [ ] Panel admin dapat menampilkan pesanan, pelanggan, jadwal, laporan website, status notifikasi, dan audit log hanya setelah MFA.
- [ ] Perubahan status/pembayaran tercatat di `audit_logs`; uji pengguna yang tidak diizinkan menghasilkan 401/403.
- [ ] Pemeriksaan GitHub Actions lulus dan Preview Vercel menggunakan commit/branch yang diharapkan.

## Penguatan perimeter dan Cloudflare

Saat ini host publiknya adalah subdomain `vercel.app`. Cloudflare proxy/WAF hanya bisa dipasang pada domain yang DNS-nya dapat kamu kelola; jangan mengubah nameserver atau DNS sebelum memiliki domain sendiri dan rencana rollback. Sampai saat itu, gunakan proteksi Vercel, pembatasan request backend, Supabase Auth + MFA, header keamanan, dan pemantauan log. Jangan mengaktifkan aturan firewall yang belum diuji pada Preview.

## Keputusan rilis

**Tetap dalam pemeliharaan** sampai environment production sudah diverifikasi, akun admin dikonfigurasi, token bot sudah dirotasi, dan seluruh tes end-to-end di atas lulus. Jangan menghilangkan pengalihan pemeliharaan hanya karena commit berhasil atau database berstatus aktif.

Jangan mengimpor data pelanggan lama sebelum membuat cadangan privat dan memetakan kolomnya. Hindari pelacakan page-view pengunjung yang tidak diperlukan; catat hanya peristiwa operasional yang relevan untuk transaksi, laporan, notifikasi, dan perubahan admin.
