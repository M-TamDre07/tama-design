# TA Admin — Setup Keamanan Berlapis

Dashboard admin menggunakan tiga tahap:

1. **Gerbang Admin** — kode khusus berformat seperti `ORD-0000-1111-2222-3333`. Kode ini bukan ID pesanan dan tidak dipakai untuk mencari data pelanggan.
2. **Kode Akses Admin** — secret kedua yang berbeda dari gerbang.
3. **Verifikasi Admin** — nama, email, dan password yang disimpan sebagai hash di Script Properties.

## Konfigurasi satu kali

1. Buka project Google Apps Script yang terhubung dengan Google Sheets.
2. Pastikan `code.gs`, `admin-security.gs`, dan `index.html` sudah ada dari repository.
3. Jalankan fungsi:

```text
configureAdminSecurity
```

4. Saat dialog muncul, masukkan kode gerbang, kode akses kedua, nama admin, email admin, dan password baru.
5. Jangan menyimpan secret di GitHub, HTML, JavaScript frontend, screenshot publik, atau README publik.
6. Deploy ulang Web App sebagai versi baru setelah konfigurasi.

## Struktur data tambahan

Fungsi konfigurasi akan membuat/memastikan:

- `Service_Notes` — buku panduan internal untuk pekerjaan servis.
- `Boot_Keys` — referensi BIOS/UEFI dan Boot Menu berdasarkan brand/model.

Data tersebut hanya dapat dibaca/diubah setelah sesi admin aktif.

## Catatan keamanan

- Tahap 1 tidak membaca `Orders` atau `Customers`.
- Tahap 1 dan tahap 2 menghasilkan token sementara di `CacheService`.
- Tahap verifikasi menghasilkan session token admin sementara.
- Login dibatasi dengan rate limit.
- Aktivitas admin dicatat pada `Audit_Log`.
- Password, kode gerbang, dan kode akses tidak disimpan sebagai plaintext di source code.
- Rotasi credential dilakukan dari fungsi `configureAdminSecurity` bila diperlukan.

## Penting tentang versi lama

Backend V4.1 sebelumnya memiliki action `adminLogin` lama. Dashboard baru tidak menggunakan action tersebut; ia memakai `adminGate` → `adminCode` → `adminVerify`. Untuk deployment produksi, action login lama sebaiknya dinonaktifkan dari `doPost` setelah dashboard baru sudah teruji agar tidak ada jalur login kedua yang lebih lemah.
