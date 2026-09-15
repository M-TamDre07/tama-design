# Telegram Order Notification — Final Setup

Integrasi produksi:

`Website → Orders (Google Sheets) → Apps Script Telegram layer → grup admin`

## Konfigurasi yang sudah ditetapkan

- **Chat ID grup admin:** `-1003943799973`
- **Bot ID:** `8273131182`
- **Property token:** `TA_TELEGRAM_BOT_TOKEN`
- **Trigger:** setiap 1 menit sebagai jalur pengiriman order baru

Bot ID hanya menjadi identitas referensi. Autentikasi ke Telegram Bot API tetap memakai bot token.

## 1. Secret token — wajib dilakukan di Apps Script

Buka **Extensions → Apps Script → Project Settings → Script Properties**, lalu buat:

- Key: `TA_TELEGRAM_BOT_TOKEN`
- Value: token bot Telegram milik Tama Andrea Studio

Token adalah secret. **Jangan** memasukkannya ke `code.gs`, `telegram.gs`, frontend, Vercel, atau GitHub.

GitHub hanya menyimpan konfigurasi non-secret dan nama property yang harus dibaca Apps Script.

## 2. Pastikan bot ada di grup

Bot harus sudah menjadi anggota grup `-1003943799973` dan mempunyai izin untuk mengirim pesan.

## 3. Aktifkan sistem sekali

Setelah token disimpan, di editor Apps Script jalankan:

`telegramSetup()`

Fungsi ini:

1. memeriksa token;
2. menyetel cursor mulai dari order yang sudah ada agar order lama tidak dikirim ulang;
3. membersihkan trigger Telegram lama yang duplikat;
4. membuat satu trigger `telegramPollOrders_` setiap 1 menit;
5. mengirim satu pesan tes ke grup.

Jika muncul pesan tes di grup, sisi Telegram sudah tersambung.

## 4. Pemeriksaan final

Jalankan:

`telegramHealthCheck()`

Yang diperiksa:

- token sudah tersedia atau belum;
- group ID;
- bot ID;
- jumlah trigger Telegram;
- interval trigger;
- cursor order.

Token tidak pernah dikembalikan oleh fungsi health check.

## 5. Alur order

1. Pelanggan mengirim order dari `pesan.html`.
2. Backend menyimpan order ke sheet `Orders`.
3. Sistem Telegram membaca order baru maksimal pada siklus trigger berikutnya.
4. Bot mengirim ringkasan order ke grup admin.
5. Setiap order diberi marker internal `TA_TELEGRAM_SENT_*` setelah berhasil dikirim sehingga retry tidak menghasilkan duplikasi pesan.
6. Jika Telegram sedang gagal, order tetap tersimpan di Google Sheets dan akan dicoba kembali pada siklus berikutnya.

## 6. Keamanan

Notifikasi tidak meminta atau meneruskan password, OTP, recovery code, token, atau secret pelanggan. Untuk layanan perangkat, verifikasi kepemilikan tetap dilakukan saat perangkat diserahkan.

## 7. Maintenance

Tidak perlu mengubah `telegram.gs` hanya karena mengganti token. Cukup perbarui nilai Script Property `TA_TELEGRAM_BOT_TOKEN`, lalu jalankan `telegramSetup()` kembali bila trigger perlu dibuat ulang.

Jangan membuat trigger Telegram kedua secara manual; `telegramSetup()` sudah membersihkan trigger handler yang sama sebelum membuat satu trigger final.
