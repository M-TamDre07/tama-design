# TA Admin Console — Setup V7

Panel admin Google Apps Script sekarang menjadi satu sistem dengan `code.gs` dan `index.html`.

## Arsitektur akses

`/admin` di website → Web App Apps Script `?action=admin` →

1. Gerbang admin
2. Kode akses kedua
3. Nama + email + password
4. Session token sementara

Gerbang admin bukan ID pesanan dan tidak melakukan pencarian pada `Orders` atau `Customers`.

## Konfigurasi satu kali

1. Buka Google Sheets database.
2. Extensions → Apps Script.
3. Pastikan hanya `code.gs` dan `index.html` yang digunakan untuk backend utama.
4. Jalankan `setupBackend()` satu kali.
5. Jalankan `configureAdminSecurity()` satu kali.
6. Isi credential melalui dialog Apps Script. Credential tidak ditulis ke source code.
7. Deploy sebagai Web App dan gunakan deployment versi terbaru.

## Sheet yang dikelola

- `Orders` — transaksi pelanggan.
- `Customers` — direktori pelanggan internal.
- `Audit_Log` — aktivitas admin/sistem.
- `Error_Log` — error terstruktur.
- `Request_Index` — idempotency request.
- `Settings` — konfigurasi non-secret.
- `Service_Notes` — buku panduan servis pribadi.
- `Boot_Keys` — referensi BIOS/UEFI dan Boot Menu.
- `Service_Catalog` — sumber harga layanan.

## Perlindungan data

API publik tidak mengekspos sheet `Customers`.

`track` hanya mengembalikan ID, nama tersamar, layanan, status, tenggat, dan jumlah revisi.

Nama lengkap, email, kontak, brief, dan detail lain dibuka hanya setelah verifikasi kepemilikan order menggunakan nama + email.

Panel admin memerlukan session token sebelum membaca atau mengubah data internal.

## Rate limit dan cooldown

Backend mengembalikan `retryAfterSeconds` ketika batas percobaan tercapai. Admin UI menampilkan countdown sehingga pengguna tidak perlu menebak kapan bisa mencoba lagi.

## Katalog layanan

Harga tidak perlu ditanam ulang ke frontend setiap kali berubah. Admin dapat mengelola `Service_Catalog` dari panel sehingga perubahan harga dapat dilakukan melalui database.

## Catatan teknisi

`Service_Notes` ditujukan untuk checklist dan langkah kerja internal. Jangan memasukkan password pelanggan, OTP, recovery code, API key, atau rahasia lain.

## Boot Menu

`Boot_Keys` menyimpan referensi BIOS/UEFI dan Boot Menu per brand/model. Data adalah panduan awal dan tetap perlu disesuaikan dengan model perangkat yang sedang ditangani.

## Keamanan

- Password/kode admin di-hash dan disimpan di Script Properties.
- Tidak ada secret plaintext di GitHub.
- Admin menggunakan token sesi sementara.
- Public tracking dan Customer Directory dipisahkan.
- Input server-side divalidasi dan data text dilindungi dari formula injection.
- Aktivitas penting masuk `Audit_Log`.
- Error server masuk `Error_Log`.

## Setelah perubahan besar

Backend tidak perlu diedit setiap kali menambah catatan servis, referensi Boot Menu, atau mengubah harga; semua itu ditujukan untuk dikelola melalui database/panel.

Tetap lakukan deployment versi baru hanya ketika `code.gs` atau `index.html` backend berubah. Platform Google memiliki kuota dan batas layanan yang dapat berubah dari waktu ke waktu, jadi arsitektur ini ditujukan untuk mengurangi frekuensi perubahan, bukan menjanjikan bahwa tidak akan pernah diperlukan maintenance.
