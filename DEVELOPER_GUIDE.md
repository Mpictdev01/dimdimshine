# Okax POS - Developer Guide

Dokumen ini dibuat untuk membantu developer baru memahami struktur, teknologi, dan alur kerja aplikasi **Okax POS** — sebuah sistem Point of Sale dan Sales Management untuk distribusi/grosir.

## 🚀 Teknologi yang Digunakan (Tech Stack)

| Kategori | Teknologi | Versi |
|---|---|---|
| **Framework** | Next.js (App Router) | 16.2.4 |
| **UI Library** | React | 19.2.4 |
| **Styling** | Tailwind CSS v4 | ^4 |
| **Utility CSS** | `clsx`, `tailwind-merge` | ^2.1.1, ^3.6.0 |
| **Database & Auth** | Supabase (`@supabase/supabase-js`) | ^2.108.2 |
| **State Management** | Zustand (dengan `persist` middleware) | ^5.0.14 |
| **PWA** | `@ducanh2912/next-pwa` + `idb` (IndexedDB) | ^10.2.9, ^8.0.3 |
| **Ikon** | `lucide-react` | ^1.21.0 |
| **Tanggal** | `date-fns` | ^4.4.0 |
| **Ekspor Excel** | `xlsx` (SheetJS) | ^0.18.5 |
| **Font** | Geist & Geist Mono (via `next/font/google`) | — |
| **Bahasa** | TypeScript | ^5 |

---

## 📂 Struktur Folder Lengkap (Folder Map)

Berikut pemetaan folder dan file beserta fungsinya berdasarkan kondisi terkini:

```text
okax-pos/
├── app/                              # Direktori utama Next.js (App Router)
│   ├── actions/                      # Server Actions (logika backend)
│   │   ├── inventory.ts              # Penyesuaian stok (stock opname)
│   │   ├── purchase.ts               # Pencatatan pembelian barang dari supplier
│   │   ├── shift.ts                  # Login PIN, buka/tutup shift sales
│   │   └── transaction.ts            # Proses, hapus, dan hapus batch transaksi
│   │
│   ├── admin/                        # Halaman & Routing untuk Admin Backoffice
│   │   ├── layout.tsx                # Layout admin (Sidebar + konten utama)
│   │   ├── page.tsx                  # Dashboard utama (ringkasan bisnis)
│   │   ├── login/
│   │   │   └── page.tsx              # Halaman login admin (PIN-based)
│   │   ├── products/
│   │   │   ├── page.tsx              # CRUD daftar produk (nama, harga, kategori, satuan)
│   │   │   ├── categories/
│   │   │   │   └── page.tsx          # CRUD kategori produk
│   │   │   └── units/
│   │   │       └── page.tsx          # CRUD satuan produk (pcs, kg, dus, dll)
│   │   ├── inventory/
│   │   │   ├── page.tsx              # Manajemen bahan baku / ingredients
│   │   │   ├── purchases/
│   │   │   │   └── page.tsx          # Pencatatan pembelian dari supplier
│   │   │   ├── suppliers/
│   │   │   │   └── page.tsx          # CRUD data supplier
│   │   │   └── adjustments/
│   │   │       └── page.tsx          # Penyesuaian stok (stock opname)
│   │   ├── customers/
│   │   │   ├── page.tsx              # CRUD pelanggan/toko (nama, telepon, alamat, area)
│   │   │   ├── areas/
│   │   │   │   └── page.tsx          # CRUD area/rute pengiriman
│   │   │   └── customer-list/
│   │   │       └── page.tsx          # Daftar pelanggan (tampilan alternatif)
│   │   ├── employees/
│   │   │   └── page.tsx              # CRUD pegawai/sales (nama, role, PIN)
│   │   ├── receivables/
│   │   │   └── page.tsx              # Manajemen piutang (tagihan belum lunas)
│   │   ├── reports/
│   │   │   ├── page.tsx              # Laporan transaksi (50 terakhir)
│   │   │   ├── sales/
│   │   │   │   └── page.tsx          # Riwayat penjualan detail + hapus transaksi
│   │   │   ├── recap/
│   │   │   │   └── page.tsx          # Rekap penjualan (agregasi per periode)
│   │   │   ├── stock/
│   │   │   │   └── page.tsx          # Riwayat pergerakan stok (inventory ledger)
│   │   │   └── stock-summary/
│   │   │       └── page.tsx          # Rekap ringkasan stok produk
│   │   └── settings/
│   │       └── page.tsx              # Pengaturan toko (nama, alamat, pajak PPN)
│   │
│   ├── components/                   # Reusable UI Components
│   │   ├── InstallPrompt.tsx         # Banner install PWA (Android + iOS)
│   │   ├── admin/
│   │   │   └── Sidebar.tsx           # Navigasi samping admin (collapsible, responsive)
│   │   └── pos/
│   │       ├── Cart.tsx              # Keranjang belanja + kontrol order & pelanggan
│   │       ├── CustomerModal.tsx     # Modal pemilihan/pencarian pelanggan
│   │       └── ProductCard.tsx       # Kartu tampilan produk di POS (list-style)
│   │
│   ├── pos/                          # Halaman & Routing untuk antarmuka Sales/Penjualan
│   │   ├── layout.tsx                # Layout POS (header + status online)
│   │   ├── page.tsx                  # Halaman utama POS (katalog + keranjang)
│   │   ├── checkout/
│   │   │   └── page.tsx              # Proses pembayaran (lunas/tempo) + struk
│   │   └── shift/
│   │       └── page.tsx              # Login shift sales (PIN-based)
│   │
│   ├── globals.css                   # File styling global (Tailwind v4 + custom vars)
│   ├── layout.tsx                    # Root layout (font, metadata, PWA prompt)
│   ├── page.tsx                      # Redirect otomatis ke /pos
│   └── favicon.ico
│
├── lib/                              # Modul utilitas dan konfigurasi
│   ├── store/
│   │   └── usePosStore.ts            # Zustand store (keranjang, shift, pelanggan, order)
│   └── supabase/
│       └── client.ts                 # Singleton Supabase client
│
├── public/                           # Aset statis
│   ├── OKAX.png                      # Logo/ikon aplikasi
│   └── manifest.json                 # PWA Web App Manifest
│
├── next.config.ts                    # Konfigurasi Next.js + PWA (Workbox)
├── package.json
├── tsconfig.json
├── postcss.config.mjs
├── eslint.config.mjs
├── .env.local                        # Environment variables (Supabase URL + Keys)
└── DEVELOPER_GUIDE.md                # Dokumen ini
```

---

## 🔑 Environment Variables

File `.env.local` berisi konfigurasi koneksi ke Supabase:

| Variabel | Deskripsi |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key Supabase |
| `NEXT_SUPABASE_SERVICE_ROLE_KEY` | *(Opsional)* Service role key untuk server actions (purchase, inventory) |

---

## 🔄 Alur Aplikasi (App Flow)

Aplikasi memiliki **dua antarmuka utama** yang melayani peran berbeda:

### 1. Sales / POS Flow (`/pos/*`)
Antarmuka ini digunakan oleh staf sales untuk memproses pesanan harian.

```
/pos/shift (Login PIN) → /pos (Katalog + Keranjang) → /pos/checkout (Pembayaran)
```

#### Langkah-langkah:
1. **Login Shift** (`/pos/shift`): Sales memasukkan PIN → sistem memverifikasi via `loginWithPin()` → membuka shift via `openShift()` → data shift disimpan di Zustand store (persist ke localStorage).
2. **Halaman POS** (`/pos`): Menampilkan katalog produk dengan pencarian & filter kategori. Produk ter-subscribe ke Supabase Realtime (auto-refresh jika ada perubahan dari Backoffice).
3. **Keranjang** (`Cart.tsx`): Mengelola item pesanan, kuantitas, tipe order (Kirim/Ambil), pemilihan pelanggan via `CustomerModal.tsx`, dan catatan.
4. **Checkout** (`/pos/checkout`): Pilih status pembayaran (Lunas/Tempo). Jika Tempo, bisa set tanggal jatuh tempo. Proses via `processTransaction()` → simpan ke `transactions` + `transaction_items` + deduct stok produk.
5. **Sukses**: Tampilkan struk pembayaran dengan opsi cetak struk atau cetak surat jalan.

#### Guard/Proteksi:
- Tanpa shift aktif → redirect ke `/pos/shift`.
- Keranjang kosong → tidak bisa ke checkout.
- Pelanggan wajib dipilih sebelum lanjut bayar.
- Stok dicek saat menambah ke keranjang (validasi `maxStock`).

### 2. Admin / Backoffice Flow (`/admin/*`)
Antarmuka ini digunakan oleh pemilik toko atau manajer untuk mengelola seluruh bisnis.

#### Otentikasi:
- Login via PIN di `/admin/login` → hanya role `super_admin` atau `manager` yang diizinkan.
- Session disimpan di `sessionStorage` sebagai `admin_auth`.
- Setiap halaman admin mengecek `sessionStorage` → redirect ke login jika tidak ada.

#### Modul-modul:

| Menu Sidebar | Path | Fungsi |
|---|---|---|
| **Dashboard** | `/admin` | Ringkasan Penjualan, Laba Bersih, Piutang, Pembelian (dengan filter tanggal, pelanggan, produk). Tabel peringatan stok menipis (< 20). |
| **Produk → Daftar Produk** | `/admin/products` | CRUD produk (nama, kategori, harga jual, satuan). Bulk select + delete. |
| **Produk → Kategori** | `/admin/products/categories` | CRUD kategori produk. |
| **Produk → Satuan** | `/admin/products/units` | CRUD satuan (pcs, kg, dus, karton, dll). |
| **Inventory → Pembelian** | `/admin/inventory/purchases` | Catat pembelian dari supplier (pilih supplier, tambah item + kuantitas + harga beli). Otomatis update stok produk + `cost_price`. |
| **Inventory → Data Supplier** | `/admin/inventory/suppliers` | CRUD data supplier (nama, alamat, telepon). |
| **Inventory → Penyesuaian Stok** | `/admin/inventory/adjustments` | Stock opname manual. Catat perbedaan stok aktual vs sistem dengan alasan (rusak, hilang, koreksi, dll). |
| **Inventory → Bahan Baku** | `/admin/inventory` | CRUD bahan baku/ingredients (untuk fitur BOM di masa depan). |
| **Pelanggan → Daftar Toko** | `/admin/customers` | CRUD pelanggan/toko (nama, telepon, alamat, area). |
| **Pelanggan → Area / Rute** | `/admin/customers/areas` | CRUD area/rute pengiriman. |
| **Riwayat → Riwayat Penjualan** | `/admin/reports/sales` | Detail semua transaksi penjualan dengan filter, hapus satuan/batch dengan opsi restore stok. |
| **Riwayat → Rekap Penjualan** | `/admin/reports/recap` | Agregasi penjualan per periode (harian/bulanan). |
| **Riwayat → Riwayat Stok** | `/admin/reports/stock` | Inventory Ledger — riwayat pergerakan barang masuk/keluar dari semua sumber (pembelian, penjualan, opname). |
| **Riwayat → Rekap Stok** | `/admin/reports/stock-summary` | Ringkasan stok semua produk. |
| **Piutang** | `/admin/receivables` | Menampilkan transaksi dengan status `unpaid`. Tandai lunas → update `payment_status` ke `paid`. Indikator jatuh tempo. |
| **Sales & Pegawai** | `/admin/employees` | CRUD pegawai (nama, role: `cashier`/`manager`/`super_admin`, PIN). Super Admin tidak bisa dihapus. |
| **Pengaturan** | `/admin/settings` | Profil bisnis (nama toko, alamat), tarif PPN (%), dan service charge (%). |

---

## 🛠 Panduan Teknis & Arsitektur

### 1. State Management (Zustand + Persist)
File: `lib/store/usePosStore.ts`

Store ini menggunakan middleware `persist` dengan `localStorage` sebagai storage. State yang disimpan:
- **`cart`**: Array `CartItem` (id, productId, name, price, quantity, unit, maxStock).
- **`currentShift`**: `ShiftInfo` (id, cashierId, cashierName, startTime, startingCash).
- **`activeCustomer`**: Pelanggan yang dipilih (`{ id, name }`). Nilai spesial `id: 'new-customer'` untuk pelanggan baru.
- **`orderType`**: `'delivery' | 'pickup'`.
- **`notes`**: Catatan/nama pelanggan baru.

Actions: `addToCart`, `removeFromCart`, `updateQuantity`, `clearCart`, `setShift`, `endShift`, `setActiveCustomer`, `setOrderType`, `setNotes`.

Validasi stok dilakukan di `addToCart` dan `updateQuantity` — jika kuantitas melebihi `maxStock`, operasi ditolak dengan alert.

### 2. Server Actions (`app/actions/`)

| File | Fungsi | Deskripsi |
|---|---|---|
| `shift.ts` | `loginWithPin(pin)` | Verifikasi PIN dari tabel `users`. Hanya role `cashier`, `manager`, `super_admin` yang diizinkan. |
| | `openShift(cashierId, startingCash)` | Insert shift baru dengan status `open` ke tabel `shifts`. |
| | `closeShift(shiftId, endingCash)` | Update shift dengan `end_time` dan status `closed`. |
| `transaction.ts` | `processTransaction(payload)` | Insert ke `transactions` + `transaction_items` + deduct `products.stock`. Menyimpan `cost_price` dari produk. |
| | `deleteTransaction(txId, shouldRestoreStock)` | Hapus transaksi tunggal + kembalikan stok jika diminta. |
| | `deleteTransactions(txIds, shouldRestoreStock)` | Hapus batch transaksi + restore stok teragregasi per produk. |
| `purchase.ts` | `createPurchase(supplierId, items, note, totalAmount)` | Insert ke `purchases` + `purchase_items` + update `products.stock` dan `cost_price`. |
| `inventory.ts` | `createStockAdjustment(productId, oldStock, newStock, reason, note)` | Insert ke `stock_adjustments` + update `products.stock`. |
| | `deleteAdjustments(ids, revertStock)` | Hapus penyesuaian + revert stok jika diminta. |

### 3. Interaksi Database (Supabase)

#### Tabel-tabel utama (berdasarkan penggunaan di kode):
| Tabel | Fungsi |
|---|---|
| `users` | Akun pegawai (full_name, role, pin) |
| `shifts` | Sesi kerja sales (cashier_id, starting_cash, ending_cash, status, start_time, end_time) |
| `products` | Produk (name, category_id, unit_id, price, cost_price, stock) |
| `categories` | Kategori produk (name) |
| `units` | Satuan produk (name) |
| `transactions` | Transaksi penjualan (shift_id, cashier_id, customer_id, order_type, subtotal, tax, total, payment_method, payment_status, due_date, table_number) |
| `transaction_items` | Item per transaksi (transaction_id, product_id, quantity, price, cost_price) |
| `customers` | Pelanggan/toko (name, phone, address, area_id) |
| `areas` | Area/rute pengiriman (name) |
| `suppliers` | Supplier barang (name, address, phone) |
| `purchases` | Header pembelian (supplier_id, total_amount, note) |
| `purchase_items` | Item per pembelian (purchase_id, product_id, qty, buy_price) |
| `stock_adjustments` | Log penyesuaian stok (product_id, old_stock, new_stock, difference, reason, note) |
| `ingredients` | Bahan baku (name, unit, current_stock, min_stock_alert) |
| `store_settings` | Pengaturan toko (store_name, address, tax_rate, service_charge) |

#### Pola Arsitektur:
- **Client-side reads**: Semua halaman menggunakan `createClient` langsung untuk baca data (SELECT). Menggunakan `useEffect` + state management.
- **Realtime**: Halaman POS subscribe ke Supabase Realtime channel untuk deteksi perubahan produk secara live.
- **Server Actions untuk mutasi**: Operasi critical (transaksi, pembelian, penyesuaian stok) dikirim melalui Next.js Server Actions untuk keamanan.
- **Pajak dinamis**: Tarif PPN diambil dari `store_settings.tax_rate` di runtime (default 11%).

### 4. Sistem Otentikasi

Aplikasi menggunakan sistem PIN sederhana (tanpa Supabase Auth):
- **POS Sales**: Login via PIN → verifikasi dari tabel `users` → shift disimpan di Zustand (localStorage) → persist antar page refresh.
- **Admin Backoffice**: Login via PIN → hanya `super_admin` / `manager` → disimpan di `sessionStorage('admin_auth')` → hilang saat tab ditutup.

### 5. Progressive Web App (PWA)

Konfigurasi PWA di `next.config.ts` menggunakan `@ducanh2912/next-pwa`:
- Service Worker di-generate ke folder `public/`.
- `cacheOnFrontEndNav: true` — caching navigasi frontend.
- `aggressiveFrontEndNavCaching: true` — caching agresif.
- `reloadOnOnline: true` — reload saat kembali online.
- Manifest di `public/manifest.json` dengan display `standalone`.
- Komponen `InstallPrompt.tsx` menampilkan banner install untuk Android (via `beforeinstallprompt`) dan instruksi iOS (Add to Home Screen).

### 6. Styling & Design System

- Menggunakan Tailwind CSS v4 dengan `@import "tailwindcss"` syntax.
- Custom CSS variables di `globals.css` untuk `--background` dan `--foreground`.
- Font: Geist Sans dan Geist Mono via `next/font/google`.
- Dipaksa mode terang (`color-scheme: light`) — dark mode di-disable.
- Input field di-force warna slate-900 untuk konsistensi.
- Komponen UI menggunakan pola:
  - `rounded-2xl` / `rounded-3xl` untuk container
  - `shadow-sm` / `shadow-md` untuk depth
  - `border border-slate-100` untuk separator halus
  - Animasi transisi dengan `transition-colors`, `transition-all`
  - Responsive: `flex-col lg:flex-row` pattern

---

## 💡 Tips untuk Developer Selanjutnya

1. **Server vs Client Components**: Perhatikan penggunaan `'use client'` di Next.js 16. Semua halaman yang interaktif sudah ditandai. Layout admin (`/admin/layout.tsx`) adalah **server component** yang menampung Sidebar (client component).

2. **Pola CRUD yang Konsisten**: Hampir semua halaman admin mengikuti pola yang sama:
   - `useEffect` → cek auth → fetch data
   - State: `isLoading`, `isModalOpen`, `formData`, `isSubmitting`
   - Full-page modal overlay (slide-up transition) untuk form Tambah/Edit
   - Floating action bar untuk bulk delete

3. **Supabase Client**: Ada dua pola:
   - `lib/supabase/client.ts` → singleton export (belum banyak dipakai).
   - Inline `createClient()` di setiap page/component → ini yang paling banyak dipakai. Pertimbangkan untuk menyatukannya.

4. **Styling**: Gunakan kelas Tailwind CSS semaksimal mungkin. Jika membutuhkan kelas dinamis, gunakan utilitas `clsx` dikombinasikan `tailwind-merge` agar kelas tidak saling menabrak.

5. **Library `xlsx`**: Sudah diinstal tapi penggunaannya ada di halaman reports (sales/recap) untuk fitur ekspor ke Excel. Cek halaman `reports/sales` dan `reports/recap` untuk implementasinya.

6. **Library `idb`**: Sudah diinstal untuk IndexedDB local storage. Ini dipersiapkan untuk mekanisme offline storage di masa depan, tapi belum diimplementasikan secara aktif di kode saat ini.

7. **Tidak Ada File SQL**: Saat ini tidak ada file `.sql` di root proyek. Skema database dikelola langsung melalui Supabase Dashboard. Disarankan untuk mendokumentasikan skema jika ada perubahan signifikan.

---

## 🚦 Menjalankan Aplikasi

```bash
# Install dependencies
npm install

# Jalankan development server
npm run dev

# Build untuk produksi
npm run build

# Jalankan server produksi
npm start
```

Pastikan file `.env.local` sudah terisi dengan benar sebelum menjalankan.

Semoga panduan ini membantu Anda memahami *codebase* Okax POS dengan cepat! 🚀
