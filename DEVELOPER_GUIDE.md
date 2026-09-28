# Panduan pengembang DIMDIM SHINE

Diperbarui 28 September 2026 berdasarkan source saat ini dan inspeksi database baca saja. `graphify-out/GRAPH_REPORT.md` bertanggal 27 Juli dan menggambarkan arsitektur lama; gunakan source dan dokumen ini untuk pekerjaan pascamigrasi.

## Teknologi dan batas sistem

- Next.js 16.2.4 App Router, React 19.2.4, TypeScript, Tailwind CSS 4.
- Supabase PostgreSQL melalui `@supabase/supabase-js` di server. Browser memakai `browserDataClient` yang meneruskan REST ke `/api/data/[table]` pada origin yang sama.
- Zustand `persist` menyimpan keranjang dan salinan shift di localStorage. Sumber kebenaran autentikasi adalah cookie `dimdim_session` dan tabel `pos_sessions`; sumber kebenaran shift adalah tabel `shifts`.
- PWA memakai `public/sw.js` online only. Navigasi mengambil jaringan dan cache worker lama dibersihkan saat aktivasi. Label “Online” pada layout POS saat ini statis.
- Konfigurasi server: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY`, opsi `MAINTENANCE_MODE`. Tidak ada `NEXT_PUBLIC_SUPABASE_ANON_KEY` yang dibutuhkan aplikasi sekarang.

## Arsitektur request

```text
Browser page / component
  ├─ Server Action → requireRole → db() → pos_* RPC / tabel Supabase
  └─ browserDataClient → /api/data/[table] → requireRole → allowlist → REST Supabase

proxy.ts → verifikasi cookie untuk navigasi /admin, /pos, /change-pin
Cookie dimdim_session → SHA-256 token → pos_sessions → users
Zustand localStorage → keranjang dan salinan currentShift untuk tampilan
```

`lib/server/session.ts` membuat token acak dan menyimpan hash token saja di database. PIN diperiksa oleh `pos_login` memakai `pin_hash` dan batas percobaan. Kasir mempunyai sesi maksimal 12 jam, manager dan super admin 8 jam. `requireRole` menolak sesi kedaluwarsa, akun nonaktif, role tidak sesuai, dan akun yang wajib ganti PIN. Logout mencabut token sesi.

`proxy.ts` memeriksa sesi pada navigasi `/admin/*`, `/pos/*`, dan `/change-pin`; ia juga mengembalikan 503 saat maintenance mode. Route `/api/data/[table]` tidak memakai matcher itu dan melakukan `requireRole` sendiri. Halaman login dikecualikan dari pemeriksaan proxy. Navigasi admin dengan sesi tidak valid saat ini diarahkan ke `/pos/shift`, sebuah detail UX yang perlu diuji.

Proxy `app/api/data/[table]/route.ts` hanya menerima tabel terdaftar dan hanya melayani baca. Kasir mendapat kolom/tabel terbatas; manager/super admin dapat membaca daftar admin. Semua mutasi menggunakan Server Actions dengan pemeriksaan sesi/peran; master data dan pengaturan ada di `app/actions/master-data.ts`. Proxy memaksa proyeksi kolom sendiri.

## Peta route

| Route | Fungsi sekarang | File utama |
| --- | --- | --- |
| `/` | Alihkan ke POS | `app/page.tsx` |
| `/pos/shift` | Login PIN, buka atau pulihkan shift | `app/pos/shift/page.tsx` |
| `/change-pin` | Ganti PIN wajib / sendiri | `app/change-pin/page.tsx` |
| `/pos` | Katalog, keranjang, pengeluaran, laporan WA, tutup shift | `app/pos/page.tsx` |
| `/pos/checkout` | Quote server, bayar tunai/QRIS, cetak | `app/pos/checkout/page.tsx` |
| `/admin/login` | Login manager / super admin | `app/admin/login/page.tsx` |
| `/admin` | Dashboard bisnis dan filter | `app/admin/page.tsx` |
| `/admin/products` | Produk, resep, duplikasi | `app/admin/products/page.tsx` |
| `/admin/products/categories` | CRUD kategori | `app/admin/products/categories/page.tsx` |
| `/admin/products/units` | CRUD satuan | `app/admin/products/units/page.tsx` |
| `/admin/inventory` | Alihkan ke bahan baku | `app/admin/inventory/page.tsx` |
| `/admin/inventory/ingredients` | Bahan baku dan yield | `app/admin/inventory/ingredients/page.tsx` |
| `/admin/inventory/purchases` | Pembelian produk langsung / bahan | `app/admin/inventory/purchases/page.tsx` |
| `/admin/inventory/suppliers` | CRUD supplier | `app/admin/inventory/suppliers/page.tsx` |
| `/admin/inventory/adjustments` | Penyesuaian stok | `app/admin/inventory/adjustments/page.tsx` |
| `/admin/reports` | Alihkan ke riwayat penjualan | `app/admin/reports/page.tsx` |
| `/admin/reports/sales` | Riwayat, filter, cetak, void | `app/admin/reports/sales/page.tsx` |
| `/admin/reports/recap` | Rekap, ekspor, void batch | `app/admin/reports/recap/page.tsx` |
| `/admin/reports/stock` | Ledger stok | `app/admin/reports/stock/page.tsx` |
| `/admin/reports/stock-summary` | Rekap stok dan aset | `app/admin/reports/stock-summary/page.tsx` |
| `/admin/employees` | Pegawai dan reset PIN | `app/admin/employees/page.tsx` |
| `/admin/settings` | Profil toko dan pajak | `app/admin/settings/page.tsx` |
| `/admin/customers`, `/admin/customers/areas` | Pelanggan dan area; tersedia di sidebar | `app/admin/customers/` |
| `/api/data/[table]` | Proxy data internal untuk browser | `app/api/data/[table]/route.ts` |

`app/components/admin/Sidebar.tsx` memuat menu dashboard, produk, inventory, laporan, pelanggan/area, pegawai, dan pengaturan. Route piutang telah dihapus dari aplikasi aktif; pelanggan/area tetap menjadi master data admin. Lihat [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md). `CustomerModal.tsx` tidak dipanggil oleh halaman kasir saat ini.

## Alur penjualan aktif

1. `listCashierAccounts` mengisi dropdown `/pos/shift` dari akun aktif berole `cashier`. `listAdminAccounts` mengisi dropdown `/admin/login` dari akun aktif berole `manager` atau `super_admin`. Pengguna memilih akun dan PIN; `loginAccount` memanggil `signIn` lalu `pos_login`. Token sesi tersimpan sebagai cookie HttpOnly. Akun yang wajib mengganti PIN dialihkan ke `/change-pin`.
2. `activeShift` mencari shift open milik pengguna. Bila tidak ada, `openShift` memanggil `pos_open_shift` dengan kas awal 0 tanpa input kasir; indeks unik mencegah dua shift open per kasir. Halaman menyimpan salinan shift di Zustand.
3. POS membaca produk, kategori, dan bahan melalui proxy. Stok produk BOM dihitung dari bahan; produk biasa memakai `products.stock`. Keranjang memperoleh `pos_quote` agar harga/pajak berasal dari server.
4. Checkout mendukung `cash` atau `qris`; QRIS memerlukan konfirmasi operator. `pos_create_sale` memeriksa shift, quote hash, stok, dan idempotency key, lalu membuat transaksi/item/usage serta mengurangi stok secara atomik.
5. `closeShift` menutup baris shift milik pengguna yang masih `open` melalui satu UPDATE terjaga, lalu UI logout. Penutupan ini tidak mencatat kas fisik, kas harapan, atau selisih; ketiga kolom dibiarkan null. Fungsi SQL lama `pos_close_shift` tetap ada untuk kompatibilitas, tetapi tidak dipanggil alur POS saat ini.

Checkout baru selalu menyimpan `order_type='sale'`, `customer_id=null`, `payment_status='paid'`. Tidak ada alur tempo atau pengiriman pada checkout sekarang. Store masih menyimpan field lama `activeCustomer`, `orderType`, dan `notes`, tetapi tidak dipakai payload penjualan.

## Aksi server dan database

| Modul | Aksi server | Fungsi database / tabel |
| --- | --- | --- |
| `auth.ts` | daftar akun, login, sesi, logout, PIN | `pos_login`, `pos_change_pin`, `pos_sessions` |
| `shift.ts` | shift aktif, buka, ringkasan, tutup | `shifts`, `pos_open_shift` |
| `transaction.ts` | quote, jual, void tunggal/batch | `pos_quote`, `pos_create_sale`, `pos_void_sale` |
| `expense.ts` | buat/hapus pengeluaran | `pos_create_expense`, `pos_delete_expense` |
| `purchase.ts` | pembelian | `pos_create_purchase` |
| `inventory.ts` | penyesuaian / pembalikan | `pos_adjust_stock`, `pos_delete_adjustments` |
| `products.ts` | simpan/hapus produk | `pos_save_product`, `pos_delete_products` |
| `ingredients.ts` | simpan/hapus bahan | `pos_save_ingredient`, `pos_delete_ingredient` |
| `employees.ts` | simpan/nonaktifkan akun | `pos_save_user`, `pos_deactivate_user` |

Semua aksi mutasi kritis memeriksa role di server. Fungsi database tidak boleh dipanggil dari browser langsung. Rincian tabel, kolom, fungsi, dan kondisi data ada di [DATABASE_REFERENCE.md](DATABASE_REFERENCE.md).

## Panduan kerja dan verifikasi

1. Mulai dari `graphify-out/` untuk orientasi, tetapi cek tanggal laporannya. Baca `AGENTS.md` dan bagian yang relevan di `DEVELOPER_GUIDE.md`. Ikuti dokumentasi Next yang terpasang di `node_modules/next/dist/docs/` sebelum menulis kode Next.js.
2. Kembangkan pada staging. Jangan memakai token, PIN, atau secret produksi di log, test, commit, atau dokumentasi.
3. Untuk perubahan kontrak tabel/kolom/izin, periksa pemanggil proxy, Server Actions, UI, dan fungsi database bersama sama. Jangan memperluas hak anon agar halaman lama kembali bekerja.
4. Jalankan `npx tsc --noEmit`, `npm run lint`, `npm run build`. Lint saat audit masih gagal; lihat [POST_MIGRATION_AUDIT.md](POST_MIGRATION_AUDIT.md).
5. Uji alur lengkap per role pada staging: login, expiry, shift, quote, tunai, QRIS, pembelian, adjustment, void, laporan, dan PWA. Pisahkan pengujian mutasi dari audit produksi baca saja.

## Masalah yang sudah diketahui

Lihat [POST_MIGRATION_AUDIT.md](POST_MIGRATION_AUDIT.md) untuk bukti per masalah dan [IMPROVEMENT_SUGGESTIONS.md](IMPROVEMENT_SUGGESTIONS.md) untuk urutan pengerjaan. Dokumentasi lama yang menyebut `admin_auth` di sessionStorage, PIN plaintext, anon key browser, penjualan tempo aktif, dan stok yang diperbarui dari client tidak berlaku untuk kode sekarang.
