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
- `admin-security.gs` — penyimpanan hash credential, lockout, initializer, dan sinkronisasi dengan sheet recovery.
- `production.gs` — readiness check, cache, lock, dan operasi produksi.
- `maintenance.gs` — maintenance backend.
- `telegram.gs` — notifikasi order ke Telegram.
- `index.html` — UI TA Admin Console.

Jangan hanya menyalin `code.gs` dan `index.html`; semua file backend di atas harus berada di project Apps Script yang sama agar fungsi saling tersedia.

## Konfigurasi satu kali

1. Buka Google Sheets database.
2. **Extensions → Apps Script**.
3. Pastikan semua file backend final sudah masuk ke **project Apps Script yang sama**.
4. Jalankan `setupBackend()` satu kali.
5. Bila `ADMIN_CREDENTIALS` sudah berisi credential yang benar tetapi login menolak credential tersebut, jalankan `syncAdminSecurityFromSheet()` satu kali. Fungsi ini **tidak membuat credential baru**; ia hanya menghitung ulang hash dan menulisnya ke Script Properties project yang sedang aktif.
6. Setelah sinkronisasi, `adminSecurityStatus()` harus menunjukkan `initialized`, `gate1Configured`, `gate2Configured`, `passwordConfigured`, dan `identityConfigured` sebagai aktif.
7. Untuk instalasi baru tanpa `ADMIN_CREDENTIALS`, jalankan `setupAdminSecurityPermanent()` satu kali. Credential dibuat sekali dan ditulis ke `ADMIN_CREDENTIALS` sebagai recovery copy.
8. Untuk Telegram, isi `TA_TELEGRAM_BOT_TOKEN` di Script Properties.
9. Jalankan `telegramSetup()` satu kali setelah token Telegram tersedia.
10. Jalankan `runHealthCheck()`, `productionReadiness()`, dan bila perlu `backendFullCheck()` untuk pemeriksaan konfigurasi.
11. Deploy sebagai **Web app** menggunakan deployment versi terbaru.

### Penting tentang credential

`ADMIN_CREDENTIALS` adalah recovery copy privat. Login web **tidak membaca nilai plaintext dari sheet secara langsung**; login membandingkan input terhadap hash pada **Script Properties project Apps Script yang sedang melayani deployment**. Karena itu, credential yang terlihat benar di sheet belum tentu sama dengan hash pada project/deployment yang aktif. Prosedur `syncAdminSecurityFromSheet()` dibuat khusus untuk kasus tersebut.

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
- `ADMIN_CREDENTIALS` — recovery copy privat untuk credential admin.

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
