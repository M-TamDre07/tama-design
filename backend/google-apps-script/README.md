# TA Backend — Google Apps Script V7

Backend utama Tama Andrea Studio untuk website publik dan TA Admin Console.

## Arsitektur

`code.gs` sekarang menjadi core tunggal. Admin security, public API, customer verification, service catalog, technician notes, Boot Menu lookup, audit, dan error handling berada dalam satu kontrak backend agar project Apps Script tidak memiliki jalur admin ganda yang mudah salah konfigurasi.

### Public API

- `GET ?action=ping`
- `GET ?action=stats`
- `GET ?action=track&id=ORD-0001`
- `POST { action: "newOrder", data: {...} }`
- `POST { action: "verifyOrder", id, name, email }`
- `POST { action: "getVerifiedOrder", id, verificationToken }`

Data `Customers` tidak pernah dikembalikan oleh API publik.

### Admin API (google.script.run)

- `adminGate()`
- `adminCode()`
- `adminVerify()`
- `adminLogoutSecure()`
- `getDashboardData()`
- `getCustomers()`
- `updateOrderFromConsole()`
- `deleteOrderFromConsole()`
- `getServiceCatalog()` / `saveServiceCatalog()`
- `getServiceNotes()` / `saveServiceNote()` / `deleteServiceNote()`
- `getBootKeys()` / `saveBootKey()` / `deleteBootKey()`
- `getAdminSettings()` / `updateAdminSetting()`
- `getAuditRecent()` / `getErrorRecent()`
- `adminExtendedHealthCheck()`

## Database sheets

`setupBackend()` membuat atau memeriksa:

- `Orders` — transaksi/order
- `Customers` — direktori pelanggan internal
- `Audit_Log` — jejak aktivitas admin/sistem
- `Error_Log` — error terstruktur
- `Request_Index` — idempotency untuk mencegah order ganda
- `Settings` — konfigurasi non-secret
- `Service_Notes` — buku panduan teknisi
- `Boot_Keys` — referensi BIOS/UEFI dan Boot Menu
- `Service_Catalog` — sumber harga dan katalog layanan

Harga dan status aktif layanan dapat diubah melalui `Service_Catalog` tanpa mengubah algoritma frontend.

## Security model

Autentikasi admin menggunakan:

`Gerbang → Kode Akses → Nama + Email + Password → Session Token`

Secret tidak disimpan di source code. Jalankan `configureAdminSecurity()` dari editor Apps Script untuk membuat atau mengganti credential. Password dan code disimpan sebagai hash bersalt di Script Properties.

Public tracking hanya mengembalikan data terbatas. Data pelanggan lengkap baru dapat dibuka setelah verifikasi nama + email. Request sensitif, honeypot, rate limit, formula injection, dan idempotency ditangani di sisi server.

## Long-life design

Backend menggunakan kontrak API stabil, katalog berbasis sheet, helper terpusat, schema setup yang dapat memeriksa/membuat tabel, serta pemisahan data publik dan internal. Tujuannya mengurangi kebutuhan perubahan kode ketika jumlah layanan bertambah.

Namun tidak ada jaminan teknologi gratis akan identik selama lima tahun. Apps Script dan Sheets memiliki kuota dan batas layanan yang dapat berubah. Google Sheets saat ini dibatasi sampai 10 juta sel per spreadsheet, dan Apps Script memiliki batas eksekusi/kuota layanan. Untuk pertumbuhan jauh lebih besar, storage dapat dipindahkan ke database khusus sambil mempertahankan kontrak API. citehttps://support.google.com/drive/answer/37603?hl=idhttps://developers.google.com/apps-script/guides/services/quotas

## Deployment

1. Tempel `code.gs` dan `index.html` ke satu project Apps Script.
2. Jalankan `setupBackend()` sekali.
3. Jalankan `configureAdminSecurity()` sekali.
4. Deploy sebagai Web App dan gunakan versi deployment terbaru.
5. Uji `ping`, `newOrder`, `track`, `verifyOrder`, lalu `/admin`.

Jangan menaruh password, kode admin, token session, atau secret API di GitHub/Vercel.
