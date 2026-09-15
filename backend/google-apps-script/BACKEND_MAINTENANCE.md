# Backend Maintenance — Tama Andrea Studio

Perbaikan ini memusatkan perhatian pada Apps Script + Google Sheets. Frontend publik tidak perlu diubah.

## 1. Sinkronisasi credential admin

Versi sebelumnya mempunyai ketidaksesuaian format hash: generator credential menyimpan hash SHA-256 penuh dengan namespace, sedangkan router admin di `standards.gs` membandingkan hash pendek. Akibatnya credential yang terlihat benar dapat selalu ditolak.

Setelah file backend terbaru disalin ke Apps Script:

1. Buka **Extensions → Apps Script** dari spreadsheet backend.
2. Pastikan file `admin-security.gs`, `standards.gs`, `code.gs`, dan file backend lain sudah berasal dari versi terbaru repository.
3. Jalankan fungsi **`setupAdminSecurityPermanent`** satu kali.
4. Otorisasi Apps Script bila diminta.
5. Buka sheet **`ADMIN_CREDENTIALS`** yang dibuat otomatis.
6. Gunakan Gate 1, Gate 2, password, nama, dan email dari sheet tersebut untuk login.

`setupAdminSecurityPermanent` tidak membuat credential baru setelah properti `TA_ADMIN_PERMANENT_INITIALIZED=true` sudah ada. Untuk reset sengaja tersedia `resetPermanentAdminSecurity('RESET-TA-ADMIN-2026')`.

> `ADMIN_CREDENTIALS` berisi plaintext credential untuk recovery. Jangan membagikan sheet ini atau akses Google Sheet kepada orang lain.

## 2. Perapihan semua sheet backend

Jalankan **`backendSheetMaintenance`** satu kali setelah update backend. Fungsi ini non-destructive: tidak menghapus order/customer.

Yang dilakukan:

- membuat sheet backend yang belum ada;
- memastikan header sesuai schema;
- freeze baris header dan merapikan lebar kolom;
- mematikan gridline untuk tampilan yang lebih bersih;
- mengaktifkan filter tabel;
- memberikan format tanggal dan angka;
- memberi dropdown validasi pada status order, pembayaran, dan prioritas;
- memeriksa ID duplikat, email bermasalah, status di luar katalog, estimasi biaya negatif/tidak valid, serta Client Request ID duplikat.

Untuk pemeriksaan tanpa perubahan tampilan gunakan **`backendSheetDataQuality`**.

## 3. Pemeriksaan keseluruhan

Jalankan **`backendFullCheck`** untuk memperoleh ringkasan:

- kesehatan struktur sheet;
- status konfigurasi keamanan admin;
- production readiness backend;
- temuan kualitas data.

## 4. Setelah perubahan Apps Script

Setelah semua file selesai diperbarui, buat/deploy **Web app** Apps Script versi baru. URL deployment `/exec` yang dipakai frontend harus menunjuk deployment terbaru.

Credential rahasia dan token Telegram tetap berada di **Script Properties**, bukan di GitHub.
