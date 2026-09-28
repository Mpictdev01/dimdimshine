# Rencana implementasi perbaikan admin DIMDIM SHINE

Disusun 28 September 2026 dari audit kode dan database baca saja. **Status: implementasi kode sebagian; verifikasi staging dan rilis belum selesai.** Keputusan produk dari pemilik: **piutang/penjualan tempo tidak digunakan dan dihilangkan dari aplikasi aktif**. Perubahan database produksi tidak termasuk dalam implementasi kode ini.

## Kemajuan implementasi 28 September 2026

| Area | Status kode | Verifikasi tersisa |
| --- | --- | --- |
| Piutang | Route dihapus, perhitungan dashboard dan copy lama dihapus | Uji URL lama menghasilkan 404 pada deployment dan bandingkan angka dashboard |
| CRUD kategori, satuan, supplier, pelanggan, area | Server Action `saveMaster`/`deleteMaster` dengan role, validasi, cek referensi, refresh daftar dan error/retry; proxy data hanya baca | Uji tambah/edit/hapus per role di staging, termasuk data historis |
| Pengaturan toko | Hanya update baris yang sudah ada melalui Server Action, validasi 0–100, error bila baris hilang | Uji simpan dan pembacaan ulang di staging |
| Pegawai | Daftar khusus super admin menampilkan `is_active`; aktivasi kembali mensyaratkan PIN tersedia; reset PIN tetap melalui `pos_save_user` | Uji aktivasi dan pencabutan sesi di staging |
| Void penjualan | Tombol dinonaktifkan untuk shift tertutup; server memeriksa lagi; hasil batch menyebut jumlah yang selesai sebelum gagal | Uji shift terbuka/tertutup, pemulihan stok, dan partial failure di staging |
| Pelanggan/area | Masuk sidebar | Uji navigasi desktop/mobile dan akses langsung |
| Dropdown login | POS hanya menampilkan kasir aktif; admin hanya menampilkan manager/super admin aktif | Uji tampilan browser untuk setiap role di staging |
| Kas awal/akhir shift | Form kas awal dan input kas fisik dihapus; buka shift mencatat awal 0, tutup shift menyimpan kas akhir/harapan/selisih null | Uji buka/tutup shift dan penolakan tutup ganda di staging |

Pemeriksaan lokal: `npx tsc --noEmit` dan `npm run build` lulus; ESLint untuk Server Actions dan proxy yang diubah lulus. `npm run lint` seluruh repo masih gagal dengan 96 error/14 warning; baseline sebelum perubahan 106 error/15 warning. HTTP lokal tanpa sesi: GET proxy data 401; POST/PATCH/DELETE proxy data 405; URL lama `/admin/receivables` mengalihkan tamu ke login (307), sementara rutenya tidak ada dalam hasil build. Seluruh pengujian mutasi memerlukan database staging terpisah; data produksi belum diubah.

## Hasil akhir yang dituju

1. Admin panel menampilkan hanya modul yang didukung. Tidak ada halaman, kartu, tombol, atau teks operasional piutang.
2. Semua aksi yang tampil untuk role yang berwenang bekerja dari form sampai data tersimpan dan daftar diperbarui. Aksi yang sengaja dilarang karena integritas data menjelaskan alasannya dan menyediakan jalur koreksi yang aman.
3. Operasi tambah/edit/hapus untuk master data teruji; penjualan, pembelian, dan stok memakai void/koreksi yang diaudit sesuai aturan bisnis, bukan penghapusan data keuangan sembarang.
4. Laporan, ekspor, dan filter menunjukkan angka yang konsisten dengan database, termasuk penanganan data historis yang belum lengkap.
5. Kode lulus typecheck, lint, build, uji integrasi staging, dan uji browser per role. Tidak ada klaim “normal” hanya berdasarkan kompilasi.

## Batas dan keputusan produk

- Hapus modul `/admin/receivables` serta metrik/perhitungan piutang di `/admin`. Tidak ada tautan piutang di sidebar saat ini. Hilangkan peringatan piutang lama pada dialog hapus pelanggan dan copy operasional lain yang menyiratkan tempo tersedia.
- Pertahankan `transactions.payment_status` karena `paid` dan `void` masih dipakai; pertahankan `due_date` dan `customer_id` sementara demi kompatibilitas riwayat. Jangan hapus tabel/kolom atau ubah 311 transaksi historis sebagai bagian dari penghapusan UI. Setelah audit data dan backup, penghapusan kolom yang benar benar mati dapat menjadi migrasi terpisah.
- Fungsi `pos_create_sale` saat ini selalu membuat penjualan `paid` dengan metode `cash`/`qris`. Perkuat kontrak ini pada pengujian agar transaksi `unpaid` baru tidak muncul.
- Pertahankan modul pelanggan/area sebagai master data admin. Tambahkan navigasi yang hilang dan uji CRUD-nya, meski checkout sekarang tidak memakai pelanggan. Jangan menghidupkan kembali CustomerModal/tempo tanpa kebutuhan bisnis baru.
- Role: manager dan super admin mengelola operasional; hanya super admin mengelola pegawai. Kasir tidak boleh memakai CRUD admin. Semua pembatasan ditegakkan server, bukan hanya menyembunyikan tombol.

## Urutan implementasi

### Tahap 0 — baseline dan lingkungan uji

1. Bekukan baseline commit, daftar route, skema/fungsi/grant database, dan konfigurasi staging. Bandingkan migrasi lokal dengan skema terpasang karena riwayat migrasi Supabase tidak tersedia.
2. Siapkan staging terpisah dengan akun kasir, manager, super admin; produk biasa dan resep; kategori/satuan; supplier; bahan; pelanggan/area; shift open dan closed; transaksi tunai/QRIS; pembelian dan penyesuaian. Gunakan PIN uji, bukan kredensial produksi.
3. Catat hasil awal tiap route sebagai **lulus/gagal/belum diuji**, dengan request, status HTTP atau pesan Server Action, perubahan baris database, dan tangkapan layar. Jangan menjalankan tombol mutasi di produksi.
4. Tambahkan test harness yang membersihkan fixture staging setelah uji. Simpan snapshot jumlah baris dan nilai stok/kas agar perubahan yang tak disengaja terlihat.

**Gerbang:** setiap modul di matriks bawah punya fixture dan pemilik uji; tidak ada tes yang bergantung pada data produksi.

### Tahap 1 — keluarkan piutang dari aplikasi aktif

1. Hapus route `app/admin/receivables/page.tsx`. Pastikan URL lama memberi 404 atau redirect yang jelas ke laporan penjualan, bukan layar yang masih memiliki tombol lunas.
2. Hapus `piutangTotal`, cabang `payment_status='unpaid'`, dan kartu/label terkait dari `app/admin/page.tsx`. Periksa ulang perhitungan omzet dan laba setelah kode disederhanakan.
3. Ganti pesan hapus pelanggan pada `app/admin/customers/page.tsx` agar menyebut dampak riwayat transaksi secara umum. Cari semua copy dan tautan piutang pada UI, manifest, serta dokumentasi pengguna.
4. Tetapkan invariant penjualan baru: `payment_status='paid'`, metode `cash` atau `qris`. Pertahankan `void` untuk koreksi. Tambahkan pengujian bahwa request dari browser tidak bisa membuat `unpaid` lewat proxy.
5. Dokumentasikan bahwa kolom lama tetap disimpan untuk data historis; buat tiket migrasi terpisah jika kelak ingin membuangnya.

**Gerbang:** tidak ada piutang di menu/dashboard/route aktif; URL lama tidak bisa menandai transaksi lunas; laporan tunai/QRIS tetap sama pada fixture sebelum dan sesudah perubahan.

### Tahap 2 — rapikan kontrak tulis admin

1. Inventarisasi setiap tombol tambah/edit/hapus dan rute datanya. Gunakan satu pola: validasi server, pemeriksaan role, hasil terstruktur, refresh data, pesan sukses/gagal, dan pencegahan klik ganda.
2. Untuk kategori, satuan, supplier, pelanggan, area, dan pengaturan yang sekarang menulis melalui proxy generik, pindahkan mutasi ke Server Actions atau endpoint server khusus dengan allowlist field per entitas. Jangan memperluas hak `anon`. Setelah migrasi, proxy `/api/data` sebaiknya hanya melayani baca untuk modul tersebut.
3. Pastikan status HTTP dan error database dipetakan menjadi pesan yang dapat dipahami: nama kosong/duplikat, relasi masih dipakai, jumlah negatif, sesi berakhir, dan akses role ditolak.
4. Tambahkan state kosong, error, retry, dan konfirmasi yang tepat di tiap halaman. Daftar tidak boleh tampak kosong saat fetch sebenarnya gagal. Setelah simpan/hapus, muat ulang data server; jangan hanya memperbarui array lokal bila operasi bisa mengubah relasi atau hasil turunan.
5. Tambahkan pelanggan/area ke sidebar admin. Uji menu desktop/mobile, direct URL, role manager dan super admin.

**Gerbang:** seluruh master data di matriks lulus create/read/update/delete yang memang aman; request tanpa sesi/kasir ditolak; setiap kegagalan terlihat di UI tanpa mengubah data.

### Tahap 3 — aturan domain dan halaman khusus

1. **Pegawai:** tampilkan `is_active` melalui aksi daftar khusus super admin. Tambahkan aktivasi kembali dan reset PIN yang eksplisit; `pos_save_user` saat ini tidak mengubah `is_active`. Nonaktifkan diri sendiri/super admin tetap ditolak. Uji pencabutan sesi saat role/PIN/status berubah.
2. **Produk dan bahan:** uji create/edit, duplikasi resep, HPP, stok BOM, hapus tunggal/batch, serta penolakan hapus bila ada transaksi/pembelian/resep. Untuk entitas historis, gunakan status arsip atau penonaktifan tampilan jika bisnis memerlukan “hapus” tanpa merusak relasi.
3. **Pembelian dan penyesuaian:** uji transaksi atomik, konversi `yield_quantity`, angka negatif, supplier/produk hilang, pembalikan stok, dan gagal di tengah. Pembelian yang sudah tercatat jangan diberi edit/hapus langsung tanpa mekanisme reversal dan audit.
4. **Penjualan:** `pos_void_sale` hanya mengizinkan shift open. Sembunyikan/disable aksi void yang tidak memenuhi syarat dan sediakan prosedur koreksi shift closed yang diaudit jika dibutuhkan. Perbaiki bulk void yang sekarang dapat berhasil sebagian; pilih transaksi database atomik atau hasil per baris yang jujur.
5. **Pengaturan:** tabel `store_settings` memang satu baris. Hapus cabang INSERT generik yang proxy tolak; bila baris tidak ada, tampilkan masalah konfigurasi yang harus ditangani admin sistem. Uji angka pajak/service charge 0–100 dan template WA.
6. **Dashboard dan laporan:** hilangkan piutang, jelaskan HPP harga beli terakhir, perbaiki fetch error, filter periode, pagination/agregasi server, dan ekspor seluruh hasil yang difilter. Tandai 24 shift cutover tanpa rekonsiliasi dan satu transaksi paid tanpa item dalam prosedur audit, bukan mengarang datanya.

**Gerbang:** alur keuangan dan stok konsisten sebelum/sesudah aksi, termasuk saat validasi menolak; laporan tidak memotong data tanpa pemberitahuan.

### Tahap 4 — verifikasi, rilis, dan pengawasan

1. Jalankan `npx tsc --noEmit`, `npm run lint`, dan `npm run build` pada CI. Baseline audit: typecheck/build lulus, lint gagal 106 error dan 15 warning. Selesaikan lint sebelum rilis.
2. Uji browser staging per role pada desktop dan mobile: UI → request/Server Action → fungsi/tabel → respons → UI. Catat bukti HTTP, sebelum/sesudah data, dan tampilan akhir.
3. Uji sesi habis saat form terbuka, dua tab, refresh, PWA lama, koneksi putus, dan klik ganda. Pastikan tidak ada write tanpa sesi dan tidak ada sukses palsu.
4. Uji regresi POS tunai/QRIS dan shift karena perubahan admin dapat memengaruhi produk, stok, pajak, dan laporan.
5. Siapkan backup teruji, catatan migrasi, langkah rollback yang menjaga data, dan monitoring 403/5xx serta kegagalan Server Action. Deploy bertahap setelah semua gerbang lulus.

**Gerbang akhir:** seluruh baris matriks di bawah mempunyai bukti lulus pada staging; setiap pengecualian ditulis sebagai batas produk yang disengaja.

## Matriks verifikasi admin

| Modul / route | Aksi yang harus diuji | Jalur data sekarang | Kriteria penerimaan |
| --- | --- | --- | --- |
| Dashboard `/admin` | filter tanggal, pembayaran, kategori; kartu; navigasi | proxy baca transaksi, pembelian, bahan, biaya | angka cocok dengan query pembanding, piutang hilang, error jelas |
| Produk `/admin/products` | tambah, edit, duplikasi, resep, hapus tunggal/batch, pencarian | `pos_save_product`, `pos_delete_products` | stok/HPP benar; hapus bersejarah ditolak dengan alasan; tidak ada hasil sebagian |
| Kategori `/admin/products/categories` | tambah, edit, hapus | proxy tulis → aksi khusus | daftar berubah; relasi produk ditangani jelas; validasi nama |
| Satuan `/admin/products/units` | tambah, edit, hapus | proxy tulis → aksi khusus | produk tetap konsisten; validasi nama/relasi |
| Bahan `/admin/inventory/ingredients` | tambah, edit, hapus, filter stok | `pos_save_ingredient`, `pos_delete_ingredient` | konversi yield benar; resep/riwayat tidak rusak |
| Pembelian `/admin/inventory/purchases` | tambah, pilih supplier/item, total, daftar | `pos_create_purchase` | total/stok/HPP/item atomik; produk BOM hanya dibeli sebagai bahan |
| Supplier `/admin/inventory/suppliers` | tambah, edit, hapus | proxy tulis → aksi khusus | transaksi historis tetap dapat dibaca; gagal relasi dijelaskan |
| Adjustment `/admin/inventory/adjustments` | tambah produk/bahan, hapus/balik, batch, filter | `pos_adjust_stock`, `pos_delete_adjustments` | ledger dan stok cocok; pembalikan gagal aman bila stok kurang |
| Pelanggan `/admin/customers` | tambah, edit, hapus, cari/filter | proxy tulis → aksi khusus | halaman ada di menu; area/riwayat terjaga; copy tanpa piutang |
| Area `/admin/customers/areas` | tambah, edit, hapus | proxy tulis → aksi khusus | halaman ada di menu; pelanggan terkait ditangani jelas |
| Riwayat penjualan `/admin/reports/sales` | filter, halaman, detail, cetak, void tunggal/batch | proxy baca, `pos_void_sale` | count/halaman akurat; void hanya saat eligible; stok/shift tetap konsisten |
| Rekap `/admin/reports/recap` | filter tanggal/kasir/metode/produk, ekspor, void | proxy baca dan void batch | total/ekspor cocok dengan seluruh hasil filter; gagal batch tidak menipu |
| Riwayat stok `/admin/reports/stock` | filter, pencarian, pergerakan | enam tabel melalui proxy | jumlah masuk/keluar cocok; batas riwayat BOM lama dijelaskan |
| Rekap stok `/admin/reports/stock-summary` | filter, nilai aset, ekspor | produk, bahan, resep melalui proxy | stok BOM dan nilai aset sesuai metode HPP yang disetujui |
| Pegawai `/admin/employees` | tambah, edit, reset PIN, nonaktif/aktif, role | `pos_save_user`, `pos_deactivate_user` | hanya super admin; status aktif terlihat; sesi lama dicabut |
| Pengaturan `/admin/settings` | baca/edit profil, pajak, service charge, template WA | proxy PATCH → aksi khusus | hanya satu baris; validasi 0–100; checkout memakai nilai baru |
| Login admin, sidebar, logout | login per role, direct URL, mobile menu, sesi habis | `proxy.ts`, `session.ts` | kasir ditolak; manager/super admin tepat; logout mencabut sesi |

## Definisi “berfungsi normal”

Untuk setiap aksi yang **memang didukung**, penguji harus melihat: (1) kontrol muncul hanya bagi role yang tepat, (2) input valid diterima dan invalid ditolak sebelum data berubah, (3) respons server cocok dengan hasil database, (4) UI memperlihatkan hasil terbaru setelah refresh, (5) klik ganda tidak membuat data ganda, dan (6) kegagalan jaringan/sesi/relasi menghasilkan pesan serta tidak meninggalkan data sebagian. Aksi yang **tidak aman atau tidak didukung** harus disembunyikan atau dinonaktifkan dengan alasan yang jelas; bukan tombol aktif yang selalu gagal.
