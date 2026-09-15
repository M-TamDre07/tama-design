# TA Backend — Google Apps Script V7

Backend utama Tama Andrea Studio untuk website publik dan TA Admin Console.

## Arsitektur

`code.gs` menjadi core API untuk Google Sheets, order, tracking, customer verification, pricing, audit, dan admin. `telegram.gs` adalah lapisan notifikasi terpisah yang membaca order baru dari sheet dan meneruskannya ke grup Telegram admin tanpa mengekspos bot token ke frontend.

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
- `Service_Catalog` — sumber harga layanan

## Telegram order notification

Alur produksi sekarang dirancang sebagai:

`Website → Google Apps Script → Google Sheets → Telegram admin group`

Grup admin yang dipakai: `-1003943799973`.

Bot token **tidak disimpan di GitHub**. Simpan token bot di Apps Script **Script Properties** dengan key:

`TA_TELEGRAM_BOT_TOKEN`

Setelah token disimpan, jalankan fungsi `telegramSetup()` satu kali dari editor Apps Script. Fungsi tersebut:

1. menginisialisasi cursor agar order lama tidak dikirim ulang;
2. membuat time-driven trigger sesuai konfigurasi `pollMinutes` di `telegram.gs` (saat ini 1 menit);
3. mengirim pesan uji ke grup;
4. setelah itu order baru dari `Orders` diteruskan otomatis ke grup.

Gunakan `telegramHealthCheck()` untuk memeriksa konfigurasi tanpa menampilkan token.

Pesan Telegram hanya membawa data yang diperlukan untuk operasional order. Password, OTP, recovery code, token, dan secret pelanggan tidak pernah diminta oleh sistem.

## Security model

Autentikasi admin menggunakan:

`Gerbang → Kode Akses → Nama + Email + Password → Session Token`

Secret tidak disimpan di source code. Untuk konfigurasi credential, gunakan mekanisme setup/reset yang memang tersedia di file keamanan Apps Script dan simpan nilai rahasia di Script Properties atau penyimpanan privat yang ditentukan oleh modul tersebut. Jangan menaruh password plaintext atau hash credential ke GitHub.

Public tracking hanya mengembalikan data terbatas. Data pelanggan lengkap baru dapat dibuka setelah verifikasi nama + email. Request sensitif, honeypot, rate limit, formula injection, dan idempotency ditangani di sisi server.

## Frontend order flow

Halaman `pesan.html` tetap menggunakan Google Sheets melalui Apps Script sebagai sumber transaksi. Formspree **tidak digunakan untuk order**; Formspree tetap untuk kanal keluhan/bug. `js/backend-bridge.js` menjaga endpoint Apps Script tetap konsisten dan memuat `js/order-integration.js` khusus halaman pemesanan.

## Deployment

1. Tempel/sinkronkan seluruh file `.gs` ke satu project Apps Script.
2. Jalankan `setupBackend()` sekali.
3. Pastikan konfigurasi autentikasi admin sudah diinisialisasi melalui modul keamanan yang digunakan project.
4. Isi Script Property `TA_TELEGRAM_BOT_TOKEN` dengan token bot Telegram. Jangan masukkan token ke GitHub atau Vercel.
5. Jalankan `telegramSetup()` sekali dan pastikan bot sudah berada di grup admin serta memiliki izin mengirim pesan.
6. Deploy sebagai Web App dan gunakan deployment versi terbaru. Frontend saat ini diarahkan ke deployment terbaru yang ditetapkan pada `js/backend-bridge.js`.
7. Uji `ping`, order baru, tracking, verifikasi order, lalu `telegramHealthCheck()`.

## Long-life design

Backend menggunakan kontrak API stabil, katalog berbasis sheet, helper terpusat, schema setup yang dapat memeriksa/membuat tabel, pemisahan data publik/internal, rate limiting, dan idempotency. Telegram dibuat sebagai lapisan tambahan sehingga kegagalan Telegram tidak membatalkan penyimpanan order ke Google Sheets.

Ini bukan jaminan bahwa backend gratis akan membutuhkan nol maintenance selama lima tahun. Google dapat mengubah kuota, runtime, dan batas layanan. Untuk pertumbuhan jauh lebih besar, storage dapat dipindahkan ke database khusus sambil mempertahankan kontrak API.

## Struktur

```text
backend/google-apps-script/
├── code.gs
├── index.html
├── telegram.gs
├── maintenance.gs
├── production.gs
├── standards.gs
├── README.md
└── ADMIN_SETUP.md
```

Jangan menaruh password, kode admin, token session, bot token Telegram, atau secret API di GitHub/Vercel.
