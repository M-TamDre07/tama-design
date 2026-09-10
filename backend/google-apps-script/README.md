# TA Backend — Google Apps Script

Backend sumber untuk `Tama Andrea Studio`.

## V3 highlights

- Public API: `ping`, `stats`, `track`, `newOrder`
- Admin login dengan password hash + token sesi sementara
- Validasi input server-side
- Rate limiting sederhana
- Idempotency memakai `clientRequestId`
- Order ID aman terhadap request bersamaan menggunakan `LockService`
- Sheet terpisah: `Orders`, `Customers`, `Audit_Log`, `Error_Log`, `Request_Index`, `Settings`
- Perlindungan formula injection pada data teks yang masuk ke Sheets
- Data pelacakan publik diminimalkan
- Audit trail dan error log
- Caching statistik
- Migrasi satu kali dari struktur lama `Sheet1`
- Analyzer rule-based untuk estimasi harga, kualitas brief, prioritas, dan estimasi hari kerja

## Setup

1. Buka Google Sheet yang digunakan sebagai database.
2. Buka Extensions → Apps Script.
3. Tempel isi `code.gs` ini ke project Apps Script.
4. Jalankan `setupBackend()` satu kali dan izinkan permission yang diminta.
5. Jalankan `setAdminPassword()` dari project yang terikat ke spreadsheet. Password disimpan sebagai hash bersalt, bukan plaintext.
6. Pastikan deployment Web App menggunakan versi terbaru.
7. Endpoint publik tetap memakai action `ping`, `stats`, `track`, dan POST `newOrder`.

## Catatan admin

`getDashboardData`, `saveOrderFromConsole`, `updateOrderFromConsole`, `deleteOrderFromConsole`, dan `analyzeBriefFromConsole` sekarang membutuhkan token sesi admin. Panel HTML admin harus melakukan `adminLogin(password)` terlebih dahulu dan meneruskan token pada setiap pemanggilan fungsi admin.

Jangan menaruh password admin, token sesi, atau secret API di frontend GitHub/Vercel.

## Batas skala

Apps Script + Sheets cocok untuk tahap kecil sampai menengah, tetapi bukan database tanpa batas. Google saat ini menetapkan kuota dan batas eksekusi, termasuk batas waktu 6 menit per eksekusi serta batas eksekusi simultan; kuota dapat berubah. Untuk pertumbuhan besar, pertahankan kontrak API lalu pindahkan storage ke database yang memang dirancang untuk beban lebih tinggi.
