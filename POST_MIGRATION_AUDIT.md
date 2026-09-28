# Audit pascamigrasi DIMDIM SHINE

Tanggal pemeriksaan: 28 September 2026, sekitar 16.18 ICT (09.18 UTC). Pemeriksaan database dilakukan dengan query `SELECT` dan metadata saja. Tidak ada login uji, transaksi uji, mutasi database, atau pengujian browser berautentikasi. Hasil database adalah potret sesaat, bukan pemantauan terus menerus.

Keputusan produk setelah audit: **piutang tidak digunakan dan akan dihapus dari aplikasi aktif**. [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) memuat langkahnya. Temuan di bawah tetap menggambarkan kode sebelum perubahan tersebut.

## Cara membaca status

- **Terbukti pada kode**: jalur eksekusi dan pembatasan yang dapat ditentukan dari source saat ini.
- **Terbukti pada database**: skema, fungsi, izin, atau jumlah baris yang dibaca dari database terhubung.
- **Belum diuji langsung**: gejala pada browser atau alur penuh yang membutuhkan akun dan data uji. Jangan menyebutnya berhasil atau gagal produksi sebelum uji tersebut.

## Ringkasan eksekutif

Migrasi mengalihkan akses data ke sesi server, proxy `/api/data/[table]`, dan fungsi `pos_*`. Skema dan 19 fungsi `pos_*` terpasang; seluruh 20 tabel aplikasi di `public` memiliki RLS aktif dan anon tidak mempunyai hak SELECT. Riwayat migrasi dari konektor kosong, sehingga waktu/cara penerapan SQL tidak dapat disimpulkan dari riwayat resmi. Dokumentasi sebelum audit ini masih menjelaskan PIN plaintext, anon key di browser, checkout tempo, dan beberapa halaman yang tidak lagi terhubung ke menu. Itu tidak cocok dengan kode terkini.

Masalah paling mendesak adalah ketidaksesuaian halaman lama dengan kebijakan proxy, alur yang tersisa di UI tetapi ditolak database, dan data historis yang tidak bisa direkonsiliasi otomatis. TypeScript lulus. Lint gagal dengan 106 error dan 15 warning. Build lokal lulus saat dijalankan di luar sandbox audit; percobaan awal dalam sandbox terhenti pada `spawn EPERM`. Perilaku deployment berautentikasi belum terverifikasi.

## Inventaris halaman dan penilaian

| Area / route | Kemampuan dari kode sekarang | Ketergantungan | Status audit |
| --- | --- | --- | --- |
| `/` | Alihkan ke `/pos` | Next.js redirect | Terbukti pada kode |
| `/pos/shift` | Pilih akun, login PIN, lanjut PIN baru, buka atau pulihkan shift | `pos_login`, sesi cookie, `pos_open_shift` | Jalur kode ada; login nyata belum diuji |
| `/change-pin` | Ubah PIN sendiri dan keluar dari sesi lama | `pos_change_pin` | Jalur kode ada; belum diuji |
| `/pos` | Katalog, keranjang, stok resep, pengeluaran, laporan WhatsApp, tutup shift | proxy baca, `pos_quote`, aksi shift/pengeluaran | Jalur kode ada; harus diuji per perangkat |
| `/pos/checkout` | Harga server, bayar tunai atau QRIS, cetak struk | `pos_create_sale` dan shift terbuka | Jalur kode ada; tidak lagi membuat transaksi tempo |
| `/admin/login` | Login manager / super admin | sesi cookie | Manager terdaftar saat ini nonaktif; login nyata belum diuji |
| `/admin` | Dashboard penjualan, produk, pembelian, pengeluaran, filter | proxy baca banyak tabel | Potensi query besar; hasil nyata belum diuji |
| `/admin/products` | Produk, duplikasi, resep BOM, hapus aman | aksi `pos_save_product` / `pos_delete_products` | Jalur kode ada; penghapusan produk bersejarah ditolak dengan sengaja |
| `/admin/products/categories` dan `/units` | CRUD kategori/satuan | proxy tulis manager | Jalur kode ada; belum diuji |
| `/admin/inventory` | Alihkan ke bahan baku | redirect | Terbukti pada kode |
| `/admin/inventory/ingredients` | CRUD bahan, konversi yield | aksi bahan baku | Jalur kode ada; belum diuji |
| `/admin/inventory/purchases` | Pembelian supplier dan penambahan stok | `pos_create_purchase` | Jalur kode ada; produk BOM sengaja tak dapat dibeli sebagai produk |
| `/admin/inventory/suppliers` | CRUD supplier | proxy tulis manager | Jalur kode ada; belum diuji |
| `/admin/inventory/adjustments` | Penyesuaian dan pembalikan stok | fungsi stok atomik | Jalur kode ada; belum diuji |
| `/admin/reports` | Alihkan ke riwayat penjualan | redirect | Terbukti pada kode |
| `/admin/reports/sales` | Riwayat, filter, cetak, void | proxy baca; `pos_void_sale` | Void shift tertutup ditolak database; UI masih menawarkan |
| `/admin/reports/recap` | Rekap dan ekspor Excel, void batch | proxy baca seluruh transaksi; aksi void berulang | Berpotensi lambat dan gagal sebagian pada batch |
| `/admin/reports/stock` | Ledger stok dari pembelian, penjualan, dan penyesuaian | enam query proxy | Data historis BOM tidak punya usage; laporan mengaku hanya penjualan stok langsung lama |
| `/admin/reports/stock-summary` | Nilai aset dan stok resep | proxy baca | Jalur kode ada; belum diuji |
| `/admin/employees` | Tambah/edit/nonaktifkan pegawai | proxy users, aksi super admin | Akun nonaktif tetap tercantum karena proxy tidak memuat `is_active` |
| `/admin/settings` | Profil toko, pajak, service charge, template WA | proxy PATCH | Edit berjalan menurut jalur kode; cabang INSERT ditolak proxy |
| `/admin/customers` dan `/areas` | CRUD pelanggan dan area | proxy manager | Route ada tetapi tidak ditautkan di sidebar; kedua tabel kosong |
| `/admin/receivables` | Daftar tempo dan tombol tandai lunas | proxy transaksi | Route tidak ditautkan; PATCH transaksi selalu 403 |
| `/api/data/[table]` | Data API internal terautentikasi, allowlist tabel/kolom/metode | sesi server + secret Supabase | Terbukti pada kode; bukan endpoint untuk anon |

Komponen `CustomerModal` masih ada, tetapi tidak dipakai oleh halaman POS saat ini. Store Zustand masih menyimpan `activeCustomer`, `orderType`, dan `notes`; checkout saat ini hanya mengirim item, metode bayar, hash penawaran, dan kunci idempotensi. Jangan menjanjikan pelanggan, pengiriman/ambil, atau tempo sebagai fitur checkout aktif.

## Temuan dan rekomendasi

### P0 — fungsi tampak tersedia tetapi pasti ditolak atau tidak dapat dijangkau

1. **Piutang: tombol “tandai lunas” ditolak proxy.** `app/admin/receivables/page.tsx` melakukan `UPDATE transactions`, sedangkan `app/api/data/[table]/route.ts` hanya mengizinkan mutasi untuk tabel dalam `managerWritable` dan `transactions` tidak ada di sana. Dampak saat ada transaksi tempo: HTTP 403. Saat ini tabel transaksi hanya berisi status `paid`. Pemilik memutuskan menghapus modul piutang dari aplikasi aktif. Jangan membuka UPDATE transaksi generik pada proxy.
2. **Pelanggan dan piutang tidak ada di navigasi admin.** Route ada, tetapi `Sidebar.tsx` tidak menautkan keduanya. Pelanggan/area saat ini masing masing 0 baris. Rencana mempertahankan pelanggan/area sebagai master data admin dan menambah menu; route piutang akan dihapus.
3. **Void dari riwayat shift tertutup tidak akan berhasil.** `pos_void_sale` mewajibkan shift transaksi berstatus `open`; seluruh 31 shift saat diperiksa sudah `closed`. Tombol hapus pada riwayat tetap muncul. UI perlu menonaktifkan tombol untuk shift tertutup dan menjelaskan prosedur koreksi historis yang diaudit. Aturan database jangan dilonggarkan tanpa desain rekonsiliasi kas/stok.
4. **Akun manager nonaktif tidak dapat dipulihkan melalui layar pegawai.** Terdapat 1 akun manager dengan `is_active=false` dan tanpa hash PIN. `pos_save_user` dapat mengganti PIN tetapi tidak mengubah `is_active` menjadi true; `pos_deactivate_user` hanya menonaktifkan. Layar pegawai tidak menampilkan status aktif karena proxy `users` hanya memilih `id,full_name,role`. Tambahkan alur aktivasi terotorisasi yang eksplisit setelah aturan bisnisnya disetujui.

### P1 — ketahanan operasional dan integritas laporan

5. **Sesi browser dan shift lokal dapat berbeda.** `currentShift` tersimpan di localStorage. `proxy.ts` memeriksa cookie pada navigasi, tetapi halaman POS/checkout yang sudah terbuka memakai salinan shift lokal, sementara Server Actions memeriksa sesi dan shift database. Sesi kedaluwarsa atau shift ditutup dari perangkat lain dapat menyisakan UI lama dan memunculkan error aksi. Pada bootstrap dan kegagalan aksi, cocokkan `currentSession` dan `activeShift` dengan store lokal; hapus keranjang/shift yang tidak berlaku dengan pesan yang jelas.
6. **Void batch tidak atomik.** `deleteTransactions` memanggil `pos_void_sale` satu per satu. Jika transaksi ke-N gagal, transaksi sebelumnya sudah ter-void walaupun hasil aksi menyatakan gagal. Buat operasi batch database atomik atau tampilkan hasil per item dan refresh daftar.
7. **Satu penjualan lunas tidak mempunyai item.** Transaksi `b99f6aeb-659a-47a7-9fb2-b6f1b28e413d` (14 September 2026, Rp18.000 tunai) mempunyai shift tetapi tidak mempunyai `transaction_items`. Dampaknya pada rekap produk, HPP, dan audit stok; perlu penelusuran dokumen sumber dan koreksi manual dengan jejak audit. Jangan membuat item dugaan.
8. **24 shift cutover tidak mempunyai rekonsiliasi kas.** Semua berstatus closed dan memiliki `migration_reason`, tetapi `ending_cash` serta `expected_cash` kosong. Tandai laporan historis sebagai belum direkonsiliasi dan pisahkan dari shift normal.
9. **Riwayat penjualan lama tidak punya metadata idempotensi.** Dari 311 transaksi, 309 tanpa `idempotency_key` dan 2 dengan kunci. Ini wajar untuk transaksi pra-migrasi; jangan backfill kunci palsu. Uji pencegahan klik ganda pada transaksi baru.
10. **Cost price pembelian terakhir menimpa nilai lama.** `pos_create_purchase` menetapkan `cost_price` dari harga beli terakhir. Nilai aset dan laba yang memakai HPP harus diberi definisi metode valuasi; tentukan rata rata tertimbang atau metode lain sebelum perubahan.

### P2 — kualitas dan pengembangan

11. **Laporan dan dashboard banyak memuat data ke browser.** Rekap mengambil seluruh transaksi lalu memfilter lokal; ledger memuat enam tabel sekaligus. Supabase/PostgREST dapat membatasi jumlah baris hasil dan data tumbuh. Pindahkan agregasi/filter/paginasi ke server dengan total yang konsisten.
12. **Status “Online” selalu hijau.** `app/pos/layout.tsx` menampilkan label statis. Worker PWA saat ini online only. Ganti dengan deteksi konektivitas yang benar dan jelaskan bahwa penjualan tidak tersedia offline.
13. **Kesalahan baca kadang menjadi layar kosong.** Beberapa halaman mengabaikan `error` saat mengambil data. Tambahkan tampilan error dan retry pada setiap modul, termasuk daftar akun, kategori, supplier, pelanggan, dan rekap.
14. **Gerbang kualitas belum hijau.** `npx tsc --noEmit` dan `npm run build` lulus; `npm run lint` gagal 106 error/15 warning. Build hanya lulus di luar sandbox audit, sementara percobaan sandbox gagal karena `spawn EPERM`. Perbaiki lint bertahap dan jadikan build/lint gerbang CI.
15. **Graphify dan dokumentasi lama usang.** `graphify-out/GRAPH_REPORT.md` bertanggal 27 Juli dan masih menyebut `loginWithPin` serta pola client Supabase lama. Regenerasi knowledge graph setelah kode stabil; jangan memakainya sebagai sumber kebenaran migrasi.

## Urutan kerja yang disarankan

1. Pertahankan cakupan POS tunai/QRIS dan hilangkan piutang dari aplikasi aktif. Tambahkan menu pelanggan/area sebagai master data admin; jangan sambungkan ke checkout tanpa kebutuhan bisnis baru.
2. Hapus alur piutang yang ditolak; perbaiki void shift tertutup dan aktivasi pegawai. Siapkan staging dengan data contoh dan uji per role.
3. Selaraskan sesi cookie, shift database, dan localStorage. Uji expiry, logout lintas perangkat, refresh PWA, dan perangkat yang pernah memasang versi lama.
4. Telusuri transaksi tanpa item dan 24 shift tanpa rekonsiliasi sebagai pekerjaan data tersendiri; simpan keputusan koreksi beserta bukti.
5. Pindahkan rekap/paginasi ke server, tentukan metode HPP, lalu tambahkan pengujian regresi untuk jalur penjualan, pembelian, stok, dan laporan.
6. Hijaukan lint/build CI serta regenerasi tipe database dan graph arsitektur.

## Batas bukti

Pemeriksaan ini bukan bukti bahwa setiap tombol berfungsi di deployment. Tidak ada kredensial uji yang digunakan dan tidak ada transaksi yang dibuat. Status “terbukti pada kode” harus ditutup dengan pengujian browser staging dan data uji sebelum dinyatakan selesai.
