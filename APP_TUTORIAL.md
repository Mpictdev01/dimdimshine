# 📖 Okax POS — Panduan Lengkap Penggunaan Aplikasi

Dokumen ini adalah tutorial lengkap cara menggunakan aplikasi **Okax POS** untuk semua peran pengguna, mulai dari Sales (kasir/penjual) hingga Admin/Manager (backoffice).

---

## 📋 Daftar Isi

1. [Pengantar & Gambaran Umum](#-pengantar--gambaran-umum)
2. [Panduan Sales / Kasir (POS)](#-panduan-sales--kasir-pos)
   - [Login Shift](#1-login-shift)
   - [Memilih Produk & Mengelola Keranjang](#2-memilih-produk--mengelola-keranjang)
   - [Memilih Pelanggan](#3-memilih-pelanggan)
   - [Proses Pembayaran (Checkout)](#4-proses-pembayaran-checkout)
   - [Cetak Struk & Surat Jalan](#5-cetak-struk--surat-jalan)
   - [Logout / Keluar](#6-logout--keluar)
3. [Panduan Admin / Manager (Backoffice)](#-panduan-admin--manager-backoffice)
   - [Login Admin](#1-login-admin)
   - [Dashboard Utama](#2-dashboard-utama)
   - [Manajemen Produk](#3-manajemen-produk)
   - [Manajemen Inventory (Stok)](#4-manajemen-inventory-stok)
   - [Manajemen Pelanggan](#5-manajemen-pelanggan)
   - [Riwayat & Laporan](#6-riwayat--laporan)
   - [Manajemen Piutang](#7-manajemen-piutang)
   - [Manajemen Pegawai & Sales](#8-manajemen-pegawai--sales)
   - [Pengaturan Sistem](#9-pengaturan-sistem)
4. [Fitur PWA (Install di Perangkat)](#-fitur-pwa-install-di-perangkat)
5. [Peran Pengguna & Hak Akses](#-peran-pengguna--hak-akses)
6. [FAQ & Troubleshooting](#-faq--troubleshooting)

---

## 🌐 Pengantar & Gambaran Umum

**Okax POS** adalah aplikasi Point of Sale (POS) berbasis web yang dirancang untuk bisnis distribusi/grosir. Aplikasi ini terbagi menjadi dua antarmuka utama:

| Antarmuka | Akses | Pengguna | Fungsi Utama |
|---|---|---|---|
| **POS (Sales)** | `/pos` | Sales / Kasir | Mencatat penjualan harian, memproses pembayaran |
| **Backoffice (Admin)** | `/admin` | Manager / Super Admin | Mengelola produk, stok, pelanggan, laporan, pegawai |

Ketika pertama kali membuka aplikasi (`/`), pengguna akan otomatis diarahkan ke halaman POS (`/pos/shift`).

---

## 🛒 Panduan Sales / Kasir (POS)

### 1. Login Shift

**Halaman**: `/pos/shift`

Sebelum bisa mencatat transaksi, setiap sales harus login terlebih dahulu untuk membuka sesi kerja (shift).

**Langkah-langkah:**
1. Buka aplikasi Okax POS — Anda akan langsung diarahkan ke halaman **Login Sales**.
2. Masukkan **PIN** yang telah diberikan oleh Admin/Manager. Contoh: `1234`.
3. Klik tombol **"Login Sekarang"**.
4. Jika PIN valid dan peran Anda adalah Sales, Manager, atau Super Admin:
   - Sistem akan otomatis membuka shift baru.
   - Anda akan diarahkan ke halaman POS utama.
5. Jika PIN salah, akan muncul pesan error berwarna merah.

> **Catatan:**
> - PIN harus unik untuk setiap pegawai.
> - Shift yang sedang aktif akan tersimpan di browser Anda. Jika Anda me-refresh halaman, Anda tidak perlu login ulang.
> - Jika shift sudah aktif dan Anda mengunjungi `/pos/shift`, akan tampil tombol **"Kembali ke POS"** dan **"Keluar (Logout)"**.

---

### 2. Memilih Produk & Mengelola Keranjang

**Halaman**: `/pos`

Setelah login, Anda akan melihat katalog produk di sebelah kiri dan keranjang belanja di sebelah kanan (pada layar desktop) atau tombol floating cart (pada layar mobile).

#### Mencari dan Filter Produk
1. Gunakan **kotak pencarian** di bagian atas untuk mencari produk berdasarkan nama.
2. Gunakan **tab kategori** (Semua, atau kategori spesifik) untuk menyaring produk.

#### Menambahkan Produk ke Keranjang
1. **Klik pada kartu produk** untuk langsung menambahkan 1 unit ke keranjang.
2. Setiap kartu menampilkan: **Nama**, **Kategori**, **Sisa Stok**, dan **Harga Jual**.
3. Jika stok tidak mencukupi, sistem akan menampilkan alert dan menolak penambahan.

#### Mengatur Keranjang
Di panel keranjang (kanan layar), Anda bisa:

| Aksi | Cara |
|---|---|
| **Tambah kuantitas** | Klik tombol `+` pada item |
| **Kurangi kuantitas** | Klik tombol `-` pada item. Jika kuantitas = 1, item akan dihapus |
| **Input kuantitas manual** | Ketik angka langsung pada kolom input angka |
| **Hapus semua** | Klik **"Kosongkan"** di pojok kanan atas keranjang |

#### Bagian Bawah Keranjang — Ringkasan
- **Subtotal**: Total harga sebelum pajak.
- **Pajak (PPN)**: Dihitung otomatis berdasarkan tarif PPN di Pengaturan (default: 11%).
- **Total**: Grand total yang harus dibayar pelanggan.

#### Mengakses Keranjang di Mobile
Pada perangkat mobile/tablet:
1. Klik tombol **keranjang biru melayang** di pojok kanan bawah.
2. Badge merah menunjukkan jumlah item.
3. Panel keranjang akan slide dari kanan.
4. Klik `X` atau area gelap di luar keranjang untuk menutupnya.

---

### 3. Memilih Pelanggan

**⚠️ WAJIB** — Anda harus memilih pelanggan sebelum bisa lanjut ke pembayaran.

1. Di panel keranjang, klik tombol **"Wajib Pilih Pelanggan (Klik Disini)"** (berwarna merah berkedip).
2. Modal **"Pilih Pelanggan"** akan muncul.
3. Anda memiliki 2 opsi:

#### Opsi A: Pilih Pelanggan yang Sudah Terdaftar
1. Cari pelanggan di kolom pencarian (berdasarkan nama atau nomor telepon).
2. Klik pada kartu pelanggan yang sesuai.
3. Modal akan otomatis tertutup dan nama pelanggan tampil di keranjang.

#### Opsi B: Pelanggan Baru
1. Klik kartu **"Pelanggan Baru"** (ikon `+` hijau).
2. Modal akan tertutup.
3. **WAJIB**: Tulis **nama lengkap pelanggan baru** dan nomor telepon/alamat di kolom catatan di keranjang. Kolom ini akan berubah merah jika belum diisi.

---

### 4. Proses Pembayaran (Checkout)

**Halaman**: `/pos/checkout`

Setelah memilih pelanggan dan mengisi keranjang:
1. Klik tombol **"Lanjut Pembayaran"** di bagian bawah keranjang.
2. Anda akan diarahkan ke halaman Checkout.

#### Layout Checkout
- **Panel Kiri** (gelap): Ringkasan pesanan — daftar item, kuantitas, harga per unit, subtotal, pajak, dan total tagihan.
- **Panel Kanan** (terang): Pemilihan metode pembayaran.

#### Pilih Metode Pembayaran

| Metode | Ikon | Deskripsi |
|---|---|---|
| **Lunas** | ✅ | Pelanggan membayar penuh saat ini |
| **Tempo (Piutang)** | 🕐 | Pembayaran ditangguhkan (jadi piutang) |

#### Jika Memilih "Tempo":
1. Form **"Tenggat Waktu / Janji Bayar"** akan muncul.
2. Pilih tanggal jatuh tempo (**opsional** — kosongkan jika fleksibel).
3. Informasi ini akan muncul di halaman Piutang di Admin.

#### Proses Pembayaran
1. Klik tombol **"Proses Pembayaran"** di bagian bawah.
2. Tunggu proses selesai (tombol akan menampilkan loading spinner).
3. Jika berhasil, tampilan akan berubah ke **halaman sukses**.

---

### 5. Cetak Struk & Surat Jalan

Setelah transaksi berhasil, Anda akan melihat layar konfirmasi dengan:
- ✅ Animasi sukses
- **TX ID**: Nomor referensi transaksi
- **Total Tagihan**
- **Status pembayaran** (Lunas / Tempo)

**Tombol Aksi:**

| Tombol | Fungsi |
|---|---|
| **Cetak Struk** | Membuka dialog print browser untuk mencetak struk |
| **Surat Jalan** | Mencetak versi surat jalan (tanpa harga) |
| **Selesai** | Kembali ke halaman POS untuk transaksi berikutnya |

---

### 6. Logout / Keluar

Untuk mengakhiri sesi sales:
1. Di halaman POS, klik tombol **"Keluar"** (merah) di pojok kanan atas.
2. Shift akan ditutup dan Anda kembali ke halaman login shift.

> **Catatan**: Logout akan menghapus data shift dari penyimpanan lokal. Keranjang yang belum diproses akan hilang.

---

## 🏢 Panduan Admin / Manager (Backoffice)

### 1. Login Admin

**Halaman**: `/admin/login`

1. Buka halaman admin login: `[URL Aplikasi]/admin/login`.
2. Masukkan **PIN Manager/Admin**.
3. Klik **"Masuk ke Dashboard"**.
4. Hanya role `super_admin` dan `manager` yang diizinkan masuk.
5. Terdapat link **"Kembali ke Aplikasi POS"** untuk beralih ke mode Sales.

> **Perbedaan dengan Login POS**: Login admin menyimpan sesi di `sessionStorage` — otomatis logout jika menutup tab browser.

---

### 2. Dashboard Utama

**Halaman**: `/admin`

Dashboard menampilkan **ringkasan performa bisnis** dengan 4 kartu utama:

| Kartu | Deskripsi | Warna |
|---|---|---|
| **Penjualan** | Total pendapatan penjualan periode terpilih | 🔵 Biru |
| **Laba Bersih** | Total laba (harga jual - harga modal) | 🟢 Hijau |
| **Piutang** | Total tagihan belum lunas periode terpilih | 🟡 Kuning |
| **Pembelian** | Total belanja ke supplier periode terpilih | 🟣 Indigo |

#### Menggunakan Filter Dashboard
Filter memungkinkan Anda mempersempit data yang ditampilkan:

1. **Tanggal Mulai & Tanggal Akhir**: Tentukan rentang periode. Default: hari ini.
2. **Pelanggan**: Filter berdasarkan pelanggan spesifik, atau "Pelanggan Umum (Tanpa Member)".
3. **Produk Spesifik**: Lihat performa produk tertentu saja.
4. Klik **"Terapkan"** untuk menjalankan filter.

#### Tabel Peringatan Stok Menipis
Di bagian bawah Dashboard, terdapat tabel yang menampilkan produk dengan **stok kurang dari 20 unit**. Ini berfungsi sebagai pengingat untuk segera melakukan restock.

---

### 3. Manajemen Produk

#### 3a. Daftar Produk (`/admin/products`)

**Fitur:**
- Melihat semua produk dalam bentuk tabel (Nama, Kategori, Stok, Harga).
- Pencarian produk berdasarkan nama atau kategori.
- Checkbox untuk seleksi multi-item.

**Menambah Produk Baru:**
1. Klik tombol **"+ Tambah Produk"** di kanan atas.
2. Form overlay akan muncul (slide up).
3. Isi:
   - **Nama Produk** (wajib)
   - **Kategori** (pilih dari dropdown)
   - **Harga Jual / Rp** (wajib)
   - **Satuan** (pcs, kg, dus, dll)
4. Klik **"Simpan"**.
5. Produk baru akan memiliki **stok awal = 0** dan **harga modal = 0**. Stok ditambah lewat fitur Pembelian.

**Mengedit Produk:**
1. Klik ikon pensil (✏️) di kolom Aksi.
2. Form yang sama akan muncul dengan data terisi.
3. Ubah data yang diperlukan → Klik **"Simpan"**.

**Menghapus Produk:**
- **Satuan**: Klik ikon tempat sampah (🗑️) di kolom Aksi → konfirmasi.
- **Massal**: Centang beberapa produk → klik **"Hapus Terpilih"** di floating action bar bawah.
- ⚠️ Produk yang sudah memiliki riwayat transaksi/pembelian **tidak bisa dihapus**.

#### 3b. Kategori Produk (`/admin/products/categories`)

Kelola kategori untuk mengelompokkan produk. Contoh: Minuman, Makanan Ringan, Bahan Pokok, dll.

**Operasi**: Tambah, Edit nama, Hapus.

#### 3c. Satuan Produk (`/admin/products/units`)

Kelola satuan ukuran produk. Contoh: pcs, kg, karton, dus, pack, liter, dll.

**Operasi**: Tambah, Edit nama, Hapus.

---

### 4. Manajemen Inventory (Stok)

#### 4a. Pembelian / Barang Masuk (`/admin/inventory/purchases`)

**Fungsi**: Mencatat pembelian barang dari supplier untuk menambah stok produk.

**Langkah Mencatat Pembelian:**
1. Klik **"+ Catat Pembelian Baru"**.
2. Pilih **Supplier** dari dropdown.
3. Tambahkan item:
   - Pilih **Produk**
   - Masukkan **Kuantitas** (qty)
   - Masukkan **Harga Beli per Unit**
4. Ulangi untuk setiap produk yang dibeli.
5. Isi **Catatan** (opsional) — misal: "Invoice #123".
6. Klik **"Simpan Pembelian"**.

**Efek Otomatis:**
- ✅ Stok produk di tabel `products` bertambah sesuai qty.
- ✅ `cost_price` (harga modal) produk di-update ke harga beli terakhir.
- ✅ Record tersimpan di tabel `purchases` + `purchase_items`.

#### 4b. Data Supplier (`/admin/inventory/suppliers`)

Kelola data supplier/vendor/pabrik tempat Anda membeli barang.

**Data yang Disimpan**: Nama, Alamat, Nomor Telepon.
**Operasi**: Tambah, Edit, Hapus.

#### 4c. Penyesuaian Stok / Stock Opname (`/admin/inventory/adjustments`)

**Fungsi**: Koreksi stok jika ada perbedaan antara stok di sistem dengan stok fisik di gudang.

**Langkah Stock Opname:**
1. Pilih **Produk** yang ingin di-adjust.
2. Sistem menampilkan **Stok Saat Ini (Sistem)**.
3. Masukkan **Stok Aktual** (jumlah fisik sebenarnya).
4. Pilih **Alasan**: Rusak, Hilang, Koreksi Input, Retur Supplier, Lainnya.
5. Isi **Catatan** (opsional).
6. Klik **"Simpan Penyesuaian"**.

**Efek Otomatis:**
- ✅ Stok produk langsung di-update ke angka baru.
- ✅ Selisih (difference) tercatat di `stock_adjustments`.
- ✅ Histori muncul di Riwayat Stok.

#### 4d. Bahan Baku / Ingredients (`/admin/inventory`)

Halaman untuk mengelola bahan baku (ingredients) yang digunakan dalam produksi. Fitur ini disiapkan untuk mendukung Bill of Materials (BOM) di masa depan.

**Data**: Nama bahan, Satuan, Stok saat ini, Alert stok minimum.

---

### 5. Manajemen Pelanggan

#### 5a. Daftar Toko / Pelanggan (`/admin/customers`)

**Fungsi**: Mengelola data pelanggan (toko, warung, restoran, dll) yang melakukan pembelian rutin.

**Data yang Disimpan:**
- Nama Toko/Pelanggan
- Nomor Telepon
- Alamat Lengkap
- Area/Rute (untuk pengelompokan pengiriman)

**Operasi**: Tambah, Edit, Hapus, Pencarian.

> **Catatan**: Pelanggan yang sudah terdaftar akan muncul di modal pemilihan pelanggan pada halaman POS.

#### 5b. Area / Rute Pengiriman (`/admin/customers/areas`)

Kelola area/rute pengiriman untuk mengelompokkan pelanggan berdasarkan wilayah. Contoh: "Rute Utara", "Area Pasar Baru", dll.

**Operasi**: Tambah, Edit, Hapus.

---

### 6. Riwayat & Laporan

#### 6a. Riwayat Penjualan (`/admin/reports/sales`)

**Fungsi**: Melihat detail semua transaksi penjualan dengan kemampuan filter dan hapus.

**Fitur:**
- Filter berdasarkan **tanggal**, **pelanggan**, **produk**, **status pembayaran**.
- Lihat detail setiap transaksi (item, kuantitas, harga, pelanggan, sales).
- **Hapus transaksi** tunggal atau batch dengan opsi:
  - ✅ **Kembalikan stok** — stok produk dikembalikan ke jumlah semula.
  - ❌ **Jangan kembalikan stok** — stok tetap (misal: barang sudah terpakai).
- **Export ke Excel** — download data sebagai file `.xlsx`.

#### 6b. Rekap Penjualan (`/admin/reports/recap`)

**Fungsi**: Melihat ringkasan/agregasi penjualan per periode.

**Fitur:**
- Rekap harian atau bulanan.
- Total penjualan, laba, piutang per periode.
- Export ke Excel.

#### 6c. Riwayat Pergerakan Stok (`/admin/reports/stock`)

**Fungsi**: Inventory Ledger — buku besar pergerakan barang.

Menampilkan semua mutasi stok dari 3 sumber:
| Sumber | Tipe | Keterangan |
|---|---|---|
| **Pembelian** | `MASUK` (hijau) | Barang masuk dari supplier |
| **Penjualan** | `KELUAR` (merah) | Barang keluar ke pelanggan |
| **Penyesuaian** | `MASUK/KELUAR` | Stock opname (+ atau -) |

**Filter yang Tersedia:**
- Pencarian (ID / Nama Produk)
- Tanggal Mulai & Akhir
- Tipe Pergerakan (Masuk / Keluar / Semua)
- Produk/Barang spesifik

**Fitur Ringkasan:** Jika memilih produk spesifik, footer tabel menampilkan:
- Total Stok Masuk
- Total Stok Keluar
- Sisa Stok Aktual (dari sistem)

#### 6d. Rekap Stok (`/admin/reports/stock-summary`)

**Fungsi**: Ringkasan stok seluruh produk dalam satu tampilan — berguna untuk audit cepat.

---

### 7. Manajemen Piutang

**Halaman**: `/admin/receivables`

**Fungsi**: Mengelola tagihan pelanggan yang masih belum lunas (pembayaran Tempo).

**Tampilan:**
- Header menunjukkan **Total Piutang Berjalan** (keseluruhan).
- Tabel menampilkan: Tanggal, ID Faktur, Nama Pelanggan, Total Tagihan, Status, Jatuh Tempo.
- Status **"Belum Lunas"** ditampilkan dengan badge kuning.
- Jika tanggal jatuh tempo sudah terlewat, ditandai dengan badge merah **"(Terlewat)"**.

**Menandai Transaksi Sebagai Lunas:**
1. Cari transaksi piutang yang ingin dilunasi.
2. Klik tombol **"Tandai Lunas"** (hijau) di kolom aksi.
3. Konfirmasi dengan klik **OK** pada dialog.
4. Status akan berubah → transaksi hilang dari daftar piutang.

---

### 8. Manajemen Pegawai & Sales

**Halaman**: `/admin/employees`

**Fungsi**: Mengelola akun pegawai yang memiliki akses ke sistem.

**Tabel Pegawai:**
- Nama Lengkap
- Role Akses (badge berwarna)
- PIN Code (disembunyikan dengan `****`)

**Peran/Role yang Tersedia:**

| Role | Badge | Akses |
|---|---|---|
| `Super Admin` | 🟣 Ungu | POS + Backoffice (tidak bisa dihapus) |
| `Manager` | 🔵 Biru | POS + Backoffice |
| `Sales (Cashier)` | ⚪ Abu | POS saja |

**Menambah Pegawai Baru:**
1. Klik **"+ Tambah Pegawai"**.
2. Isi:
   - **Nama Lengkap**
   - **Role Akses**: Sales (POS Only) atau Manajer (Backoffice)
   - **PIN Login**: Harus unik (tidak boleh sama dengan pegawai lain)
3. Klik **"Simpan"**.

**Mengedit Pegawai:**
1. Klik **"Ubah/Reset"** di kolom PIN Code → Form edit terbuka.
2. Ubah nama, role, atau PIN sesuai kebutuhan.
3. Role `super_admin` tidak bisa diubah.

**Menghapus Pegawai:**
- Klik ikon tempat sampah di kolom Aksi.
- ⚠️ Akun `super_admin` **tidak bisa dihapus**.
- Riwayat shift pegawai yang dihapus tetap tersimpan (muncul sebagai "Unknown User").

---

### 9. Pengaturan Sistem

**Halaman**: `/admin/settings`

**Konfigurasi yang Tersedia:**

#### Profil Bisnis
| Field | Deskripsi |
|---|---|
| **Nama Toko** | Nama bisnis Anda (muncul di struk dll) |
| **Alamat Outlet** | Alamat lengkap toko/gudang |

#### Pajak & Biaya Layanan
| Field | Deskripsi | Default |
|---|---|---|
| **PPN (%)** | Tarif Pajak Pertambahan Nilai | 11% |
| **Service Charge (%)** | Biaya layanan tambahan | 0% |

**Cara Mengubah Pengaturan:**
1. Ubah nilai yang diinginkan pada form.
2. Klik **"Simpan Perubahan"**.
3. Perubahan tarif PPN akan **langsung berlaku** pada transaksi berikutnya.
4. Klik **"Batal"** untuk me-reset form ke nilai tersimpan.

---

## 📱 Fitur PWA (Install di Perangkat)

Okax POS mendukung instalasi sebagai aplikasi mandiri di perangkat Anda.

### Android / Chrome Desktop
1. Saat pertama kali membuka aplikasi, akan muncul **banner install** di bagian bawah layar.
2. Klik tombol **"Install"**.
3. Konfirmasi pada dialog browser.
4. Aplikasi akan terinstall dan bisa dibuka dari home screen / launcher.

### iOS (iPhone / iPad)
1. Banner akan menampilkan instruksi khusus iOS.
2. Klik ikon **Share** (📤) di menu bawah Safari.
3. Pilih **"Add to Home Screen"**.
4. Beri nama → Klik **"Add"**.

### Keuntungan Mode PWA
- ✅ Bisa dibuka tanpa membuka browser.
- ✅ Tampilan fullscreen (tanpa address bar).
- ✅ Lebih cepat karena caching agresif.
- ✅ Indikator online/offline di header POS.

---

## 👥 Peran Pengguna & Hak Akses

| Fitur | Sales (Cashier) | Manager | Super Admin |
|---|:---:|:---:|:---:|
| Login POS (Shift) | ✅ | ✅ | ✅ |
| Membuat Transaksi | ✅ | ✅ | ✅ |
| Akses Backoffice | ❌ | ✅ | ✅ |
| Kelola Produk | ❌ | ✅ | ✅ |
| Kelola Stok | ❌ | ✅ | ✅ |
| Kelola Pegawai | ❌ | ✅ | ✅ |
| Ubah Pengaturan | ❌ | ✅ | ✅ |
| Lihat Laporan | ❌ | ✅ | ✅ |
| Hapus Transaksi | ❌ | ✅ | ✅ |
| Hapus Super Admin | ❌ | ❌ | ❌ (Protected) |

---

## ❓ FAQ & Troubleshooting

### Q: Saya lupa PIN, bagaimana cara resetnya?
**A**: Minta Admin/Manager untuk membuka halaman **Sales & Pegawai** (`/admin/employees`), lalu klik **"Ubah/Reset"** pada PIN Anda.

### Q: Kenapa stok produk bisa minus?
**A**: Stok dikurangi saat transaksi diproses. Jika ada transaksi yang diproses sebelum data stok diperbarui dari pembelian, stok bisa menjadi minus. Gunakan **Penyesuaian Stok** untuk mengoreksinya.

### Q: Bagaimana cara mengembalikan stok dari transaksi yang salah?
**A**: Buka **Riwayat Penjualan** (`/admin/reports/sales`), cari transaksi yang salah, dan hapus dengan opsi **"Kembalikan Stok"** diaktifkan.

### Q: Saya sudah menambah produk baru, tapi tidak muncul di POS?
**A**: Halaman POS menggunakan Supabase Realtime. Produk baru seharusnya muncul otomatis dalam beberapa detik. Jika tidak, coba refresh halaman POS.

### Q: Admin session saya hilang setelah menutup tab?
**A**: Ini memang disengaja. Login admin menggunakan `sessionStorage` yang otomatis terhapus saat tab ditutup, demi keamanan.

### Q: Bagaimana cara mengubah tarif pajak (PPN)?
**A**: Buka **Pengaturan** (`/admin/settings`) → Ubah nilai **PPN (%)** → Klik **"Simpan Perubahan"**. Tarif baru langsung berlaku untuk transaksi berikutnya.

### Q: Apakah bisa digunakan offline?
**A**: Fitur PWA sudah diaktifkan dengan caching agresif. Halaman yang pernah dibuka akan bisa diakses offline. Namun, fitur yang membutuhkan koneksi ke database (simpan transaksi, ambil data produk terbaru) tetap memerlukan internet.

### Q: Bagaimana cara cetak struk ke printer thermal?
**A**: Saat ini, fitur cetak menggunakan `window.print()` standar browser. Pastikan printer thermal sudah terhubung ke perangkat dan di-set sebagai printer default dengan ukuran kertas yang sesuai (58mm/80mm).

---

> 📌 **Dokumen ini diperbarui terakhir pada**: Juli 2026
> 
> Jika Anda menemukan ketidaksesuaian antara dokumen ini dengan aplikasi, silakan hubungi tim pengembang untuk update.
