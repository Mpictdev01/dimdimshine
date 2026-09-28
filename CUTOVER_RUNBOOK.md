# DIMDIM SHINE staging dan cutover

## Status implementasi lokal (26 September 2026)

Kode aplikasi dan migrasi sudah disiapkan; `npx tsc --noEmit` dan `npm run build` lulus. Lint terarah pada modul baru yang diperiksa lulus, tetapi `npm run lint` untuk seluruh repositori masih gagal dengan 108 error pada halaman lama. Pemilik melaporkan sudah menjalankan seluruh SQL pada Supabase produksi, tetapi kode baru belum dideploy ke Vercel. Pemeriksaan baca menunjukkan hash PIN dua kasir tersedia dan masih dalam masa 48 jam, sedangkan hash PIN Super Admin dan dua Manager kosong sebagaimana dirancang untuk reset saat cutover. Backup, pengujian staging, rotasi key, serta penolakan anon belum diverifikasi. Pertahankan jeda operasional sampai aplikasi baru dan login berhasil diuji.

Jika migrasi 001 versi awal sudah dijalankan dan semua login baru gagal dengan `column reference "user_id" is ambiguous`, jalankan `supabase/cutover/fix_login_ambiguous.sql` sekali melalui SQL Editor. File ini hanya mengganti definisi fungsi login dan mempertahankan grant service role; jangan mengulang seluruh migrasi 001.

Semua langkah database dilakukan pada **staging terlebih dahulu**. Staging hanya berisi data uji atau data yang disamarkan. Jangan gunakan secret produksi pada Vercel Preview.
Migrasi tidak memperbarui nominal, status, atau item transaksi historis. Penjualan lunas tanpa item ditandai dari hasil baca di laporan; baris transaksi lamanya tetap utuh. Penutupan 24 shift lama adalah perubahan pada tabel `shifts`, dengan `ending_cash` tetap kosong.

## Staging

1. Hubungkan proyek Supabase DIMDIM SHINE dan proyek Vercel DIMDIM SHINE ke konektor. Buat proyek Supabase staging terpisah dan isi data uji yang mencakup satu baris `store_settings`, kasir, manager, super admin, stok resep, penjualan tunai, QRIS, dan satu transaksi gagal.
2. Jalankan `supabase/cutover/preflight.sql`. `settings_rows` harus tepat satu; `invalid_settings` dan semua nilai `invalid_*` harus nol. Jangan memperbaiki riwayat penjualan otomatis.
3. Jalankan berurutan `supabase/migrations/202609260001_secure_access.sql` dan `202609260002_atomic_operations.sql` di staging. Fungsi `pos_change_pin` dipakai melalui SQL Editor untuk memberi PIN baru 6–8 digit pada akun manager dan super admin. Jangan simpan PIN di file atau variabel deployment.
4. Jalankan `supabase/cutover/lock_down_anon.sql` di staging. Script ini menutup shift lama tanpa nilai kas akhir, menghapus kolom PIN lama, dan mencabut akses anonim pada tabel operasional. Pastikan jumlah shift migrasi sesuai data staging.
5. Hubungkan Vercel Preview ke URL staging melalui `NEXT_PUBLIC_SUPABASE_URL` dan ke secret **staging** melalui `SUPABASE_SECRET_KEY` (server only). Jangan mengisi `NEXT_PUBLIC_SUPABASE_ANON_KEY` atau menaruh secret pada `NEXT_PUBLIC_`.
6. Uji akun kasir, manager, dan super admin; masa sesi, pencabutan sesi, 5 PIN salah/15 menit serta batas IP; satu penjualan untuk klik ganda, QRIS tanpa konfirmasi, stok kurang, harga berubah, pembelian, penyesuaian, pembatalan, tutup shift, dan laporan per shift. Verifikasi browser hanya menghubungi `/api/data` dan Server Actions untuk data. Jalankan `npx tsc --noEmit`, `npm run lint`, dan `npm run build`.

## Produksi

1. Ambil backup database dan pastikan dapat dipulihkan **ke proyek staging**, lalu catat waktu backup. Pastikan preview staging lulus semua uji. Siapkan secret key Supabase **baru** karena key lama pernah dibagikan di percakapan.
2. Jadwalkan jeda POS dan hentikan transaksi. Pasang secret key baru di variabel server Vercel Production, set `MAINTENANCE_MODE=true`, lalu promosikan **aplikasi baru dalam mode pemeliharaan**. Pastikan halaman POS dan admin mengembalikan 503 sebelum migrasi. Perangkat PWA lama harus ditutup selama jeda ini.
3. Jalankan `preflight.sql` produksi. Catat ID transaksi lunas tanpa item untuk pemeriksaan manual. Jalankan migrasi 001 dan 002; migrasi 001 menutup akses anonim ke `users` sebelum hash dibuat.
4. Beri PIN baru ke manager dan super admin lewat SQL Editor menggunakan `pos_change_pin`. Kasir memakai PIN lama maksimal 48 jam dan wajib menggantinya saat login pertama.
5. Jalankan `lock_down_anon.sql` saat aplikasi baru masih dalam mode pemeliharaan. Script penguncian sengaja berada di luar folder migrasi otomatis agar tidak ikut `db push` sebelum cutover.
6. Dengan anon key lama, jalankan `npm run smoke:anon` setelah mengisi `SUPABASE_URL` dan `SUPABASE_ANON_KEY` di lingkungan shell. Skrip memeriksa HEAD serta PATCH pada ID mustahil sehingga tidak mengubah data; semua 20 tabel (18 operasional dan 2 tabel sesi/login) harus menolak akses. Uji login dan akses tiap role, penjualan tunai dan QRIS, serta tutup shift. Pastikan 24 shift historis menjadi closed dengan `ending_cash IS NULL` dan `migration_reason` tercatat.
7. Rotasi/cabut key lama setelah aplikasi baru memakai key baru; hapus nilai lama dari `.env.local` dan lingkungan produksi. Set `MAINTENANCE_MODE=false` dan buka kembali POS setelah smoke test lulus. Jika gagal, pertahankan mode pemeliharaan dan perbaiki aplikasi baru; jangan kembalikan policy anon terbuka.

Worker PWA baru bersifat online-only. Saat aktif, worker tersebut menghapus cache Workbox lama dan memuat ulang tab agar kode berbasis anon tidak dipakai lagi. Uji satu perangkat yang pernah memasang PWA sebelum cutover.

## Kueri akses anonim

Gunakan anon key hanya untuk verifikasi penolakan; jangan menampilkan isi tabel. Contoh: `HEAD /rest/v1/users?select=id` seharusnya gagal. Ulangi untuk store_settings, users, shifts, categories, units, products, customer_areas, customers, transactions, transaction_items, suppliers, purchases, purchase_items, stock_adjustments, ingredients, product_ingredients, expenses, sale_stock_usage, pos_sessions, dan pos_login_failures.
