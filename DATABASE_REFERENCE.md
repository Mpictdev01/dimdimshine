# Referensi database DIMDIM SHINE

Snapshot baca saja: 28 September 2026 sekitar 16.18 ICT. Jumlah baris bisa berubah. Jangan gunakan dokumen ini sebagai pengganti introspeksi skema sebelum migrasi berikutnya.

## Akses dan migrasi

- Aplikasi memakai Supabase PostgreSQL. Browser memanggil `/api/data/[table]` dan Server Actions; server memakai `SUPABASE_SECRET_KEY`. Tidak ada Supabase secret yang diperlukan di browser.
- Terdapat 20 tabel aplikasi di `public`. Semua tabel itu memiliki RLS aktif; tidak ada policy `public` dan role `anon` tidak memiliki hak `SELECT` menurut pemeriksaan katalog. Semua fungsi `pos_*` yang ditemukan berjenis `SECURITY DEFINER` dan tidak dapat dieksekusi langsung oleh `anon` atau `authenticated`.
- Migrasi lokal mencakup `202609260001_secure_access.sql` (hash PIN, sesi, shift, penguncian akses), `202609260002_atomic_operations.sql` (penawaran, penjualan, stok, pembelian, pengeluaran), dan `202609290001_super_admin_void_closed_shifts.sql` (void shift tertutup khusus super admin). Migrasi terakhir perlu diterapkan ke database agar UI dan Server Action baru dapat bekerja. `supabase/cutover/lock_down_anon.sql` menutup shift lama, menghapus kolom PIN lama, dan mencabut akses anon. `fix_login_ambiguous.sql` mengganti fungsi login yang sebelumnya ambigu; definisi live sudah menggunakan alias `u` pada pencarian user.
- Konektor mengembalikan daftar migrasi kosong dan `supabase_migrations.schema_migrations` tidak ada. Skema live memperlihatkan efek SQL, tetapi tidak membuktikan entri riwayat migrasi ataupun urutan penerapannya. Sebelum perubahan berikutnya, catat baseline skema dan pilih satu mekanisme riwayat migrasi yang konsisten.

## Tabel dan isi saat snapshot

| Domain | Tabel (baris) | Kunci relasi / fungsi |
| --- | --- | --- |
| Identitas | `users` (5), `pos_sessions` (18), `pos_login_failures` (0) | sesi dan kegagalan login mengacu ke `users.id`; PIN hanya tersimpan sebagai `pin_hash` |
| Shift | `shifts` (31), `expenses` (41) | shift mengacu ke kasir; pengeluaran ke shift dan kasir |
| Katalog | `categories` (3), `units` (2), `products` (35) | produk ke kategori/satuan; stok produk langsung ada di `products.stock` |
| Resep / bahan | `ingredients` (17), `product_ingredients` (221) | kebutuhan bahan per produk; stok bahan ada di `ingredients.current_stock` dalam unit hasil |
| Penjualan | `transactions` (311), `transaction_items` (414), `sale_stock_usage` (16) | transaksi ke shift/kasir; item ke transaksi/produk; usage merekam stok yang dipakai penjualan baru |
| Pembelian | `suppliers` (3), `purchases` (86), `purchase_items` (98) | pembelian ke supplier; item ke produk langsung atau bahan |
| Penyesuaian | `stock_adjustments` (0) | penyesuaian produk langsung atau bahan |
| Pelanggan | `customer_areas` (0), `customers` (0) | pelanggan ke area; transaksi historis dapat mengacu ke pelanggan |
| Konfigurasi | `store_settings` (1) | nama/alamat, pajak, service charge, template laporan WA |

Kolom penting:

- `users`: `role`, `pin_hash`, `must_change_pin`, `legacy_pin_expires_at`, `is_active`. Kolom PIN plaintext sudah tidak ada.
- `pos_sessions`: `token_hash` sebagai primary key, `user_id`, `created_at`, `expires_at`, `revoked_at`. Sesi valid jika belum dicabut, belum kedaluwarsa, dan user aktif.
- `shifts`: `cashier_id`, `starting_cash`, `ending_cash`, `expected_cash`, `cash_difference`, `start_time`, `end_time`, `status`, `migration_reason`. Indeks unik parsial `shifts_one_open_per_cashier` membatasi satu shift open per kasir.
- `transactions`: `shift_id`, `cashier_id`, `customer_id`, `order_type`, `subtotal`, `tax`, `total`, `payment_method`, `payment_status`, `due_date`, `idempotency_key`, `idempotency_request_hash`, `voided_at`, `voided_by`.
- `transaction_items` menyimpan kuantitas, harga, dan HPP saat transaksi. `sale_stock_usage` menyimpan penggunaan stok produk atau bahan dan menjadi dasar pemulihan stok saat void.
- `ingredients.yield_quantity` mengonversi unit beli ke unit hasil; `product_ingredients.quantity` memakai unit hasil. Pembelian dan adjustment mengonversi kuantitas sebelum memperbarui `current_stock`.

## Fungsi database dan pemanggil

| Fungsi | Pemanggil aplikasi | Ringkasan |
| --- | --- | --- |
| `pos_login`, `pos_change_pin` | `lib/server/session.ts` | PIN hash, rate limit, sesi; ubah PIN mencabut sesi |
| `pos_open_shift` | `app/actions/shift.ts` | buka satu shift dengan kas awal 0 |
| `pos_close_shift` | tidak dipakai alur POS baru | fungsi lama untuk tutup dengan kas fisik; dipertahankan agar tidak mengubah riwayat/fungsi live |
| `pos_quote`, `pos_quote_json`, `pos_create_sale` | `app/actions/transaction.ts` | harga server, hash quote, stok terkunci, idempotensi, penjualan atomik |
| `pos_void_sale` | `app/actions/transaction.ts` | manager: void shift open; super admin: void shift open/closed; pemulihan stok dari usage lengkap |
| `pos_create_purchase` | `app/actions/purchase.ts` | pembelian atomik dan stok bertambah |
| `pos_adjust_stock`, `pos_delete_adjustments` | `app/actions/inventory.ts` | penyesuaian/pembalikan stok |
| `pos_create_expense`, `pos_delete_expense` | `app/actions/expense.ts` | pengeluaran pada shift open |
| `pos_save_product`, `pos_delete_products` | `app/actions/products.ts` | produk dan resep, larangan hapus yang punya riwayat |
| `pos_save_ingredient`, `pos_delete_ingredient` | `app/actions/ingredients.ts` | bahan, yield, batas hapus |
| `pos_save_user`, `pos_deactivate_user` | `app/actions/employees.ts` | pengelolaan pegawai, hash PIN |

Jangan memanggil fungsi mutasi untuk “menguji” database produksi. Lakukan pengujian fungsi pada staging dengan data uji.

## Kondisi data yang perlu diketahui

- Dari 5 pengguna: 3 kasir aktif, 1 super admin aktif, 1 manager nonaktif. Satu kasir aktif diwajibkan mengganti PIN tetapi `legacy_pin_expires_at` sudah lewat. Satu akun manager nonaktif belum mempunyai `pin_hash`.
- Saat snapshot: 4 sesi valid untuk 2 pengguna (2 sesi kasir, 2 super admin), 12 sesi dicabut, 2 kedaluwarsa tanpa `revoked_at`. Keempat sesi valid tidak mempunyai shift terbuka; itu mungkin normal untuk admin atau setelah shift selesai.
- Seluruh 31 shift `closed`; 24 shift lama ditandai `migration_reason` dan tidak mempunyai kas akhir maupun kas harapan. Tidak ada shift `open` saat snapshot.
- Seluruh 311 transaksi berstatus `paid`: 228 tunai dan 83 QRIS. Tidak ada `unpaid` atau `void`. Dari 311 transaksi, 309 tidak punya kunci idempotensi karena historis; 2 mempunyai kunci.
- Satu transaksi lunas, ID `b99f6aeb-659a-47a7-9fb2-b6f1b28e413d`, tidak mempunyai item. Nilainya Rp18.000, tanggal 14 September 2026. Jangan mengisi item otomatis tanpa dokumen sumber.
- Preflight lain: `store_settings` tepat satu baris, nilai pajak/service charge valid, tidak ada stok/harga/yield/resep yang melanggar pemeriksaan `supabase/cutover/preflight.sql`.

## Aturan integritas dan batas historis

Fungsi penjualan baru mengunci baris shift, produk, bahan, dan pengaturan; memvalidasi stok; menyimpan penjualan/item/usage; lalu mengurangi stok dalam satu transaksi database. Resep BOM mengurangi bahan, sedangkan produk tanpa resep mengurangi stok produk. Transaksi lama dapat tidak mempunyai `sale_stock_usage`. Setelah migrasi `202609290001`, super admin dapat melakukan void meski shift tertutup; manager tetap hanya pada shift terbuka. Riwayat tetap tersimpan dengan status `void`, waktu, dan pelaku. Opsi pemulihan stok ditolak jika ada item tanpa usage; batalkan tanpa pemulihan lalu periksa stok secara manual. Hasil rekap penjualan mengecualikan transaksi void.

## Query audit baca saja

```sql
select status, count(*) from public.shifts group by status;
select count(*) from public.pos_sessions
where revoked_at is null and expires_at > now();
select t.id, t.created_at, t.total
from public.transactions t
where t.payment_status = 'paid'
  and not exists (
    select 1 from public.transaction_items ti where ti.transaction_id = t.id
  );
select role, is_active, count(*) from public.users group by role, is_active;
```

Jangan menampilkan `pin_hash`, `token_hash`, secret key, atau data pribadi saat membagikan hasil audit.
