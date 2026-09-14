# Telegram Order Notification Setup

Integrasi ini memakai Google Apps Script sebagai penghubung:

`Website → Orders (Google Sheets) → Telegram bot → grup admin`

## 1. Jangan masukkan bot token ke GitHub

Di Apps Script buka **Project Settings → Script Properties** lalu buat:

- Key: `TA_TELEGRAM_BOT_TOKEN`
- Value: token bot Telegram milik Tama Andrea Studio

Token adalah secret. Jangan memasukkannya ke `code.gs`, `telegram.gs`, frontend, Vercel environment yang terbuka, atau GitHub.

## 2. Grup tujuan

Chat ID grup admin yang dikonfigurasi di sistem:

`-1003943799973`

Bot harus sudah menjadi anggota grup dan mempunyai izin mengirim pesan.

## 3. Aktifkan

Di editor Apps Script jalankan:

`telegramSetup()`

Fungsi ini mengatur cursor agar order lama tidak dikirim ulang, membuat trigger setiap 5 menit, lalu mengirim satu pesan tes.

## 4. Pemeriksaan

Jalankan:

`telegramHealthCheck()`

Hasil hanya memberi status konfigurasi dan jumlah trigger; token tidak dikembalikan.

## 5. Alur order

1. Pelanggan mengisi `pesan.html`.
2. Frontend mengirim `newOrder` ke Apps Script.
3. Backend menyimpan order ke `Orders` dan memakai idempotency `Client Request ID` untuk mencegah duplikasi.
4. Telegram poller membaca order baru.
5. Bot mengirim ringkasan order ke grup admin.
6. Jika Telegram sedang gagal, penyimpanan order di Google Sheets tetap menjadi sumber utama; kegagalan Telegram tidak membatalkan order.

## Catatan keamanan

Notifikasi tidak meminta atau meneruskan password, OTP, recovery code, token, atau secret pelanggan. Untuk layanan perangkat, verifikasi kepemilikan tetap dilakukan saat perangkat diserahkan.
