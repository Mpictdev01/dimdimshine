# Panduan penggunaan DIMDIM SHINE saat ini

Diperbarui 28 September 2026 dari kode aplikasi. Ini panduan untuk fitur yang terhubung pada versi setelah migrasi. Beberapa alur belum diuji dengan akun dan perangkat staging; jika hasil layar berbeda, catat pesan error, halaman, role, dan waktu kejadian untuk tim pengembang.

## Kasir: masuk dan mulai shift

1. Buka `/pos/shift`. Dropdown menampilkan akun kasir aktif saja. Pilih akun, masukkan PIN, lalu tekan **Masuk**.
2. Jika diminta mengganti PIN, buka halaman yang diarahkan, buat PIN baru 6–8 angka, lalu masuk kembali. PIN lama sementara dapat kedaluwarsa; minta super admin melakukan reset bila akun tidak dapat masuk.
3. Jika ada shift terbuka milik akun itu, aplikasi akan membukanya kembali. Jika tidak, tekan **Buka shift**. Kas awal otomatis dicatat 0 tanpa input kasir.
4. Sesi login dan shift berbeda. Shift dapat tetap terbuka bila browser ditutup. Saat kembali, gunakan akun yang sama untuk memulihkan shift.

Login dapat ditolak bila akun nonaktif, PIN salah/kedaluwarsa, atau percobaan terlalu banyak. Akun manager yang tercatat saat audit berstatus nonaktif; super admin perlu meninjau statusnya. Jangan memakai akun bersama untuk menghindari ketidakjelasan kasir pada transaksi.

## Kasir: membuat penjualan

1. Pada `/pos`, cari produk atau pilih kategori. Stok produk resep dihitung dari ketersediaan bahan; stok produk biasa dari stok produk.
2. Tambahkan barang ke keranjang dan atur kuantitas. Total dan pajak dihitung ulang oleh server. Tunggu angka total tampil sebelum memilih **Lanjut Pembayaran**.
3. Pada `/pos/checkout`, pilih **Tunai** atau **QRIS**. Untuk QRIS, konfirmasi bahwa pembayaran benar benar diterima sebelum menyimpan.
4. Tekan tombol bayar satu kali dan tunggu hasil. Jika harga atau pajak berubah, aplikasi meminta Anda memeriksa total terbaru. Jika stok kurang, perbarui keranjang.
5. Setelah berhasil, cetak struk bila perlu. Penjualan tersimpan sebagai `paid` dan stok diperbarui oleh database.

Checkout yang aktif **tidak** menawarkan tempo/piutang, pemilihan pelanggan, pengiriman, atau ambil. Komponen dan tabel lama terkait fitur itu masih ada, tetapi belum terhubung ke pembayaran sekarang. Jangan menjanjikan fitur tersebut ke pelanggan sebelum tim mengaktifkannya dan menguji alur lengkap.

## Kasir: pengeluaran, laporan, dan tutup shift

- Tombol **Pengeluaran** mencatat biaya dari shift aktif. Nilainya masuk laporan shift, tetapi penutupan shift sekarang tidak melakukan rekonsiliasi kas. Hapus pengeluaran hanya selama shift masih terbuka dan setelah memastikan data yang benar.
- Tombol laporan menampilkan ringkasan shift dan stok bahan untuk pesan WhatsApp. Periksa angka dan isi pesan sebelum mengirim.
- Saat selesai, pilih **Keluar**, lalu konfirmasi penutupan shift. Sistem menutup shift dan keluar dari sesi tanpa meminta hitung kas fisik. Kolom kas akhir, kas harapan, dan selisih pada shift baru dibiarkan kosong.
- Indikator **Online** pada header saat ini hanya label visual. Aplikasi memerlukan koneksi untuk login, memuat data, dan menyimpan penjualan. Jika jaringan putus, jangan menganggap transaksi sudah tercatat sebelum ada hasil sukses.

## Admin: modul yang terhubung di menu

Masuk melalui `/admin/login` memakai akun manager atau super admin yang aktif. Dropdown admin hanya menampilkan kedua role tersebut. Super admin dapat mengelola pegawai; manager dan super admin dapat memakai modul operasional sesuai pemeriksaan server.

| Menu | Kegunaan | Catatan |
| --- | --- | --- |
| Dashboard | Ringkasan penjualan, pembelian, pengeluaran, produk/bahan | Filter periode; data historis dapat memerlukan pemeriksaan manual |
| Produk → Daftar Produk | Tambah/edit, duplikasi, resep, harga | Produk dengan riwayat tidak dapat dihapus langsung |
| Produk → Kategori/Satuan | Kelompok dan satuan produk | Penghapusan dapat ditolak bila masih dipakai |
| Inventory → Bahan Baku | Nama, yield, HPP, batas stok | Stok bahan tersimpan dalam unit hasil |
| Inventory → Pembelian | Tambah stok dari supplier | Produk beresep dibeli sebagai bahan, bukan produk |
| Inventory → Supplier | CRUD supplier | Hapus hanya jika relasi memungkinkan |
| Inventory → Penyesuaian | Koreksi stok produk/bahan dan riwayat | Penghapusan dengan pembalikan dapat ditolak bila stok tidak cukup |
| Riwayat → Penjualan | Filter, cetak, void | Void hanya diizinkan database saat shift transaksi masih open |
| Riwayat → Rekap | Filter, ekspor Excel, void batch | Data diambil bertahap; filter dijalankan di browser setelah data dimuat |
| Riwayat → Stok / Rekap Stok | Pergerakan stok dan nilai aset | Pemakaian bahan historis lama mungkin tidak terekam |
| Pelanggan → Daftar Pelanggan/Area | Tambah/edit/hapus pelanggan dan area | Data yang masih direferensikan tidak dapat dihapus |
| Sales & Pegawai | Tambah/edit/nonaktifkan/aktifkan akun | Khusus super admin; reset PIN lama sebelum mengaktifkan akun bila diperlukan |
| Pengaturan | Profil toko, pajak, service charge, template WA | Saat ini ada satu baris pengaturan |

Halaman pelanggan dan area kini tersedia melalui menu **Pelanggan**. Modul piutang telah dihapus dari aplikasi aktif. Saat audit, tabel pelanggan dan area kosong dan seluruh transaksi berstatus lunas. Penghapusan pelanggan, area, dan master lain akan ditolak bila masih dipakai oleh riwayat atau data lain.

## Pertanyaan operasional

**Lupa PIN atau PIN lama kedaluwarsa?** Minta super admin mengganti PIN melalui halaman pegawai. Jika akun nonaktif, super admin dapat mengaktifkannya kembali setelah PIN tersedia. Jangan memakai akun bersama.

**Shift tidak muncul?** Masuk dengan akun yang sama. Jika sesi aktif tetapi shift sudah ditutup, buka shift baru. Jika layar masih menampilkan shift lama sesudah ditutup di perangkat lain, muat ulang dan laporkan; salinan shift tersimpan di perangkat.

**Transaksi lama tidak bisa di-void?** Database menolak void jika shift sudah ditutup. Catat ID transaksi dan minta pemeriksaan manual; jangan mengubah stok atau kas dengan penyesuaian tanpa rekonsiliasi.

**Apakah aplikasi bisa offline?** Tidak untuk transaksi. PWA dapat dipasang sebagai ikon aplikasi, tetapi pekerja layanan saat ini mengambil halaman dari jaringan.

**Mengapa laporan lama tidak lengkap?** Sebagian transaksi sebelum migrasi tidak memiliki catatan `sale_stock_usage`, 24 shift cutover tidak mempunyai kas akhir, dan satu penjualan lunas tidak mempunyai item. Tim pengembang perlu meninjau sumber historisnya.
