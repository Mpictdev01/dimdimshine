# Rencana perbaikan dan pengembangan DIMDIM SHINE

Diperbarui 28 September 2026. Gunakan [POST_MIGRATION_AUDIT.md](POST_MIGRATION_AUDIT.md) sebagai baseline audit, [DATABASE_REFERENCE.md](DATABASE_REFERENCE.md) sebagai baseline database, dan [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) sebagai status implementasi serta matriks verifikasi. Pemilik telah memutuskan **piutang tidak dipakai**; route dan perhitungan di aplikasi aktif sudah dihapus dari kode. Pengujian mutasi admin di staging masih diperlukan.

## Prinsip pengerjaan

1. Pertahankan POS tunai/QRIS; hapus piutang dari aplikasi aktif. Tentukan pemakaian pelanggan/area dan pengiriman secara terpisah sebelum membuat endpoint baru.
2. Kerjakan di staging dengan data uji; jangan menjalankan fungsi mutasi di produksi untuk diagnosis.
3. Setiap perubahan mencakup UI, izin server, fungsi database, dokumentasi, dan uji per role. Jangan mengembalikan akses anon langsung ke tabel.
4. Untuk koreksi transaksi historis, simpan sumber bukti dan keputusan akuntansi; jangan menebak item, biaya, atau kas akhir.

## Prioritas 0: hilangkan alur yang pasti gagal

| Pekerjaan | Bukti sekarang | Selesai bila |
| --- | --- | --- |
| Hapus modul piutang dari aplikasi aktif | Selesai di kode: route, perhitungan dashboard, dan copy operasional dihapus; kolom historis dipertahankan | Verifikasi deployment dan perbandingan angka dashboard di staging |
| Selaraskan tombol void dengan aturan shift | Tombol shift tertutup kini nonaktif dan server memeriksa ulang | Uji shift open/closed di staging; prosedur koreksi historis tetap perlu keputusan |
| Perbaiki aktivasi dan status akun | Aksi daftar dan aktivasi sudah tersedia; manager lama tetap memerlukan reset PIN | Uji perubahan status dan sesi di staging |
| Putuskan modul pelanggan/area | Menu dan CRUD admin sudah terhubung; checkout tetap tanpa pilihan pelanggan | Uji CRUD dan role di staging |

## Prioritas 1: keandalan operasi

| Pekerjaan | Bukti sekarang | Selesai bila |
| --- | --- | --- |
| Rekonsiliasi sesi dan shift | Cookie server dan `currentShift` localStorage terpisah | Refresh/expiry/logout lintas perangkat membawa pengguna ke keadaan benar tanpa menampilkan shift usang |
| Void batch atomik | Server Action void satu per satu; UI sekarang menyebut jumlah yang selesai sebelum gagal | Uji partial failure di staging; pertimbangkan RPC atomik bila dibutuhkan |
| Koreksi data historis | Satu transaksi paid tanpa item; 24 shift tanpa kas akhir | Ada keputusan tertulis per kasus dan laporan menandai data yang tak dapat direkonsiliasi |
| Error state dan retry | Beberapa fetch mengabaikan error dan menampilkan daftar kosong | Gagal jaringan/403 terlihat jelas, dapat dicoba ulang, dan tidak disalahartikan sebagai data kosong |
| Status jaringan PWA | Header selalu “Online”, worker online only | Status koneksi mencerminkan keadaan nyata dan operator tahu kapan transaksi berhasil tersimpan |
| Uji regresi alur penting | Typecheck lulus tetapi belum ada bukti browser end to end | Staging menguji login tiap role, PIN, shift, tunai, QRIS, stok BOM, pembelian, adjustment, void, laporan, PWA |

## Prioritas 2: data, laporan, dan kualitas kode

- **Laporan server side:** pindahkan filter, paginasi, total agregat, dan ekspor dari browser ke server. Rekap sekarang mengambil semua transaksi; ledger menggabungkan enam tabel dan riwayat BOM lama tidak lengkap.
- **Metode HPP:** tentukan apakah memakai harga terakhir, rata rata tertimbang, atau metode lain. `pos_create_purchase` sekarang menimpa `cost_price` dengan harga beli terakhir; jelaskan konsekuensi laporan laba dan nilai aset.
- **Tipe database:** generate tipe dari skema staging, hilangkan `any` secara bertahap, dan pastikan kontrak proxy/aksi/UI memakai bentuk respons yang sama.
- **Lint dan build CI:** lint awal menghasilkan 106 error dan 15 warning; setelah perubahan kode masih 96 error dan 14 warning. Build lokal lulus; jadikan lint serta build gerbang CI yang konsisten.
- **Riwayat migrasi:** konektor tidak menemukan tabel riwayat. Baseline skema produksi secara baca saja, lalu gunakan satu prosedur migrasi yang bisa diaudit sebelum DDL berikutnya.
- **Knowledge graph:** regenerasi `graphify-out/` setelah perubahan, karena laporan 27 Juli masih memetakan arsitektur lama.

## Pengembangan setelah stabil

| Kandidat | Ketergantungan keputusan | Ukuran keberhasilan |
| --- | --- | --- |
| Pelanggan, area, pengiriman/ambil | Identitas pelanggan, tarif/ongkir, dokumen jalan, hak kasir | Satu pesanan staging mengalir dari pilih pelanggan sampai laporan dan cetak |
| Rekonsiliasi kas dan audit log | Siapa dapat koreksi shift tertutup dan transaksi void | Semua koreksi mempunyai actor, waktu, alasan, nilai sebelum/sesudah |
| Pencarian dan ekspor skala besar | Paginasi server dan definisi total | Laporan lengkap pada dataset besar tanpa pemotongan diam diam |
| Pengujian PWA perangkat | Kebijakan online only dan rilis worker | Perangkat lama memperbarui worker tanpa memakai cache anon era sebelumnya |

Fitur baru sebaiknya dimulai setelah Prioritas 0 dan 1 lulus di staging. Jangan menganggap item lama pada dokumen sebelum 28 September masih relevan; audit ini menggantikan klaim tentang sessionStorage admin, PIN plaintext, dan client anon yang sudah berubah.
