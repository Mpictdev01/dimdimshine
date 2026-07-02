# Okax POS - Developer Guide

Dokumen ini dibuat untuk membantu developer baru memahami struktur, teknologi, dan alur kerja aplikasi **Okax POS**.

## 🚀 Teknologi yang Digunakan (Tech Stack)

Aplikasi ini dibangun menggunakan ekosistem modern berbasis React dan Next.js:

*   **Framework**: Next.js 16 (App Router)
*   **UI & Styling**: React 19, Tailwind CSS v4, `clsx`, `tailwind-merge`
*   **Database & Auth**: Supabase (`@supabase/supabase-js`)
*   **State Management**: Zustand (`zustand`)
*   **PWA (Progressive Web App)**: `@ducanh2912/next-pwa` (didukung juga oleh `idb` untuk IndexedDB local storage)
*   **Ikon & Utilitas**: `lucide-react`, `date-fns`
*   **Bahasa**: TypeScript

---

## 📂 Struktur Folder (Folder Map)

Berikut adalah pemetaan folder utama beserta fungsinya:

```text
okax-pos/
├── app/                        # Direktori utama Next.js (App Router)
│   ├── actions/                # Server Actions / logika backend khusus
│   │   ├── purchase.ts         # Logika terkait pembelian (inventory)
│   │   └── transaction.ts      # Logika proses transaksi penjualan
│   ├── admin/                  # Halaman & Routing untuk Admin Dashboard
│   │   ├── customers/          # Manajemen pelanggan
│   │   ├── employees/          # Manajemen karyawan
│   │   ├── inventory/          # Manajemen stok/inventori barang
│   │   ├── login/              # Halaman login admin
│   │   ├── products/           # Manajemen data produk & kategori
│   │   ├── receivables/        # Manajemen piutang (kasbon pelanggan)
│   │   ├── reports/            # Laporan penjualan & performa
│   │   └── settings/           # Pengaturan aplikasi & toko
│   ├── components/             # Reusable UI Components
│   │   ├── admin/              # Komponen khusus halaman Admin
│   │   │   └── Sidebar.tsx     # Navigasi samping admin
│   │   └── pos/                # Komponen khusus halaman POS
│   │       ├── Cart.tsx        # Keranjang belanja pelanggan
│   │       ├── CustomerModal.tsx # Modal pemilihan/input pelanggan
│   │       └── ProductCard.tsx # Kartu tampilan produk di POS
│   ├── pos/                    # Halaman & Routing untuk antarmuka Sales/Penjualan
│   │   └── checkout/           # Halaman/proses pembayaran pesanan
│   ├── globals.css             # File styling global (Tailwind)
│   ├── layout.tsx              # Root layout aplikasi
│   └── page.tsx                # Halaman utama (Landing/Redirect page)
├── lib/                        # Modul utilitas dan konfigurasi
│   ├── store/                  
│   │   └── usePosStore.ts      # State management (Zustand) untuk data kasir
│   └── supabase/               
│       └── client.ts           # Inisialisasi client Supabase
├── public/                     # Aset statis (gambar, favicon, manifest PWA)
└── *.sql                       # Script migrasi/setup database Supabase
```

---

## 🔄 Alur Aplikasi (App Flow)

Aplikasi terbagi menjadi dua bagian utama yang melayani peran berbeda: **Sales/Penjualan** dan **Admin (Dashboard)**.

### 1. Sales Flow (`/app/pos`)
Alur ini digunakan oleh staf/tim sales untuk memproses pesanan dan penjualan.
*   **Pemilihan Produk**: Halaman utama (`/app/pos`) menampilkan daftar produk (`ProductCard.tsx`). Sales dapat mencari, memilih kategori, dan menambahkan produk pesanan ke keranjang (`Cart.tsx`).
*   **Manajemen Pelanggan**: Sales bisa merekam data pelanggan, memilih member, atau mencatat pembelian piutang/tempo melalui `CustomerModal.tsx`.
*   **Checkout & Transaksi**: Sales memproses pesanan pelanggan (`/app/pos/checkout`). State pesanan diatur secara lokal oleh Zustand (`usePosStore.ts`), lalu dikirimkan ke database menggunakan server actions (`transaction.ts`).

### 2. Admin Dashboard Flow (`/app/admin`)
Alur ini digunakan oleh pemilik toko/manajer untuk mengelola bisnis.
*   **Otentikasi**: Admin masuk melalui halaman login (`/app/admin/login`).
*   **Manajemen Master Data**: Admin dapat menambah, mengubah, atau menghapus Produk (`/products`), Kategori, Karyawan (`/employees`), dan Pelanggan (`/customers`).
*   **Manajemen Stok**: Admin mengatur persediaan barang dan mencatat pembelian dari distributor (`/inventory` & `purchase.ts`).
*   **Pemantauan & Laporan**: Melihat performa toko, transaksi yang telah terjadi (`/reports`), dan mengelola utang pelanggan (`/receivables`).

---

## 🛠 Panduan Teknis & Arsitektur

### 1. State Management (Zustand)
Untuk menghindari *prop-drilling* dan membuat aplikasi POS cepat (karena interaksi keranjang butuh render cepat), digunakan Zustand di `lib/store/usePosStore.ts`. 
State ini umumnya menyimpan:
- Item-item di dalam keranjang belanja.
- Data pelanggan yang sedang dipilih.
- Ringkasan total harga, diskon, dan pajak.

### 2. Interaksi Database (Supabase)
Okax POS menggunakan Supabase. Aplikasi ini mengikuti arsitektur **Server Actions** Next.js (`app/actions/*`). 
- Baca data ringan/realtime mungkin dilakukan lewat `lib/supabase/client.ts`.
- Mutasi data penting (Transaksi, Pembelian) dikirim via *Server Actions* untuk alasan keamanan.
Terdapat file-file `.sql` di root direktori (seperti `supabase_setup.sql`, `inventory_setup.sql`) yang digunakan untuk referensi skema database (Tabel, RLS/Row Level Security, Fungsi, dan Triggers).

### 3. Dukungan Offline & PWA
Aplikasi ini sudah dipasang modul `@ducanh2912/next-pwa` dan `idb`. Hal ini menandakan adanya target agar antarmuka Sales dapat berjalan dengan lancar sebagai aplikasi mandiri di perangkat mobile/tablet dan dapat menoleransi jaringan yang tidak stabil dengan mekanisme *local storage* menggunakan IndexedDB.

---

## 💡 Tips untuk Developer Selanjutnya
1. **Server vs Client Components**: Perhatikan baik-baik penggunaan `'use client'` di Next.js 16. Pastikan komponen interaktif di `/app/components` menggunakan *client components*, sementara layouting dan data-fetching (di `/app/admin`) diutamakan sebagai *server components*.
2. **Database Schema Changes**: Jika ada perubahan struktur tabel, pastikan menuliskan query-nya dan menyimpan di file `.sql` baru sebagai rekam jejak migrasi.
3. **Styling**: Gunakan kelas Tailwind CSS semaksimal mungkin. Apabila membutuhkan kelas dinamis, gunakan utilitas `clsx` dikombinasikan dengan `tailwind-merge` agar kelas tidak saling menabrak.

Semoga panduan ini membantu Anda memahami *codebase* Okax POS dengan cepat! 🚀
