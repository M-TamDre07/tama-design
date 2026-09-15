# TA Admin Console — Final Setup

Panel admin berada di Google Apps Script dan dibuka dari:

`https://tamaandrea.vercel.app/admin`

Alurnya:

`/admin → admin.html → Apps Script ?action=admin → TA Admin Console`

## Arsitektur akses final

Admin memakai tiga tahap:

1. **Gerbang admin**
2. **Kode akses kedua**
3. **Nama + email + password**
4. Backend membuat **session token sementara** setelah seluruh verifikasi berhasil.

Gerbang admin tidak mencari data pada `Orders` atau `Customers`.

## Script Apps Script yang harus ada

Backend final terdiri dari beberapa file yang dimuat bersama dalam satu project Apps Script:

- `code.gs` — core API, order, dashboard, dan perubahan order.
- `standards.gs` — keamanan API, admin session, verifikasi, katalog, customer, notes, Boot Menu.
- `production.gs` — readiness check, cache, lock, dan operasi produksi.
- `maintenance.gs` — maintenance backend.
- `telegram.gs` — notifikasi order ke Telegram.
- `index.html` — UI TA Admin Console.

Jangan hanya menyalin `code.gs` dan `index.html`; semua file backend di atas harus berada di project Apps Script yang sama agar fungsi saling tersedia.

## Konfigurasi satu kali

1. Buka Google Sheets database.
2. **Extensions → Apps Script**.
3. Pastikan file backend final sudah masuk ke project yang sama.
4. Jalankan `setupBackend()` satu kali.
5. Isi credential admin di **Script Properties** sesuai konfigurasi yang digunakan sistem:
   - `TA_ADMIN_GATE_HASH`
   - `TA_ADMIN_CODE_HASH`
   - `TA_ADMIN_EMAIL`
   - `TA_ADMIN_PASSWORD_HASH`
6. Untuk Telegram, isi `TA_TELEGRAM_BOT_TOKEN` di Script Properties.
7. Jalankan `telegramSetup()` satu kali setelah token Telegram tersedia.
8. Jalankan `runHealthCheck()` dan `productionReadiness()` untuk pemeriksaan konfigurasi.
9. Deploy sebagai **Web app** menggunakan deployment versi terbaru.

Credential dan token **tidak disimpan di GitHub**.

## Telegram final

- Grup admin: `-1003943799973`
- Bot ID: `8273131182`
- Property token: `TA_TELEGRAM_BOT_TOKEN`
- Trigger order: setiap 1 menit

Bot harus menjadi anggota grup dan mempunyai izin mengirim pesan. Lihat `TELEGRAM_SETUP.md` untuk prosedur pengujian.

## Sheet yang dikelola

- `Orders` — transaksi pelanggan.
- `Customers` — direktori pelanggan internal.
- `Audit_Log` — aktivitas admin/sistem.
- `Error_Log` — error terstruktur.
- `Request_Index` — idempotency request.
- `Settings` — konfigurasi non-secret dan override katalog.
- `Service_Notes` — buku panduan servis internal.
- `Boot_Keys` — referensi BIOS/UEFI dan Boot Menu.

## Fitur panel admin

- Dashboard statistik order.
- Pencarian order berbobot.
- Edit status, pembayaran, prioritas, revisi, tenggat, link hasil, dan catatan internal.
- Customer Directory internal.
- Service Catalog dan override harga.
- Catatan teknisi.
- Referensi Boot Menu.
- Health Check dan status sistem.
- Session logout dan expiry.
- Audit/error logging.

## Perlindungan data

API publik tidak mengekspos sheet `Customers`.

Tracking publik hanya memberikan data terbatas. Detail pelanggan dibuka setelah verifikasi kepemilikan order menggunakan nama + email.

Panel admin memerlukan session token sebelum membaca atau mengubah data internal.

## Rate limit dan keamanan

Backend menggunakan validasi server-side, rate limit, idempotency, formula-injection protection, audit log, error log, dan session sementara.

Telegram tidak menerima password, OTP, recovery code, token, atau secret pelanggan.

## Maintenance setelah finalisasi

Setelah konfigurasi awal selesai, pengelolaan harian seperti order, status, harga, catatan servis, dan referensi Boot Menu dilakukan dari panel/database tanpa mengedit kode.

Perubahan kode backend hanya diperlukan bila ada perubahan arsitektur atau bug. Perubahan token Telegram tidak membutuhkan perubahan kode: cukup ubah Script Property `TA_TELEGRAM_BOT_TOKEN` dan jalankan `telegramSetup()` bila trigger perlu dibuat ulang.
