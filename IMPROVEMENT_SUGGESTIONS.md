# 🔍 Analisis & Saran Perbaikan — DIMDIM SHINE POS

Dokumen ini berisi temuan dan rekomendasi perbaikan berdasarkan review menyeluruh terhadap seluruh codebase.

---

## 🔴 Kritis (Keamanan & Data Integrity)

### 1. Supabase Keys Terekspos di Client-side
**File**: Hampir semua `page.tsx` dan komponen
**Masalah**: Setiap halaman membuat `createClient()` baru dengan `NEXT_PUBLIC_SUPABASE_ANON_KEY` secara inline. Key ini terekspos ke browser. Tanpa **Row Level Security (RLS)** yang ketat di Supabase, siapa pun bisa mengakses/manipulasi data langsung via API.

**Rekomendasi**:
- Aktifkan **RLS (Row Level Security)** di semua tabel Supabase.
- Pindahkan operasi sensitif (DELETE, UPDATE stok, mutasi data) ke **Server Actions** (beberapa sudah, tapi banyak yang belum — misal: hapus produk, hapus supplier, update pelanggan masih dilakukan langsung dari client).
- Pertimbangkan menggunakan `NEXT_SUPABASE_SERVICE_ROLE_KEY` (bukan public key) di semua Server Actions.

### 2. Otentikasi Admin Sangat Lemah
**File**: `app/admin/login/page.tsx`, semua halaman admin
**Masalah**:
- Login admin hanya cek `sessionStorage.getItem('admin_auth')` — ini bisa di-bypass dengan menjalankan `sessionStorage.setItem('admin_auth', '{}')` di console browser.
- PIN tersimpan sebagai plaintext di tabel `users` dan terlihat saat edit pegawai.
- Tidak ada mekanisme session expiry, rate limiting, atau lockout setelah N percobaan gagal.

**Rekomendasi**:
- Implementasi auth yang lebih robust: gunakan **Supabase Auth** atau minimal buat Server Action untuk validasi session di setiap request.
- Hash PIN menggunakan bcrypt/argon2 sebelum disimpan.
- Tambahkan rate limiting (misal: max 5 percobaan login per menit).
- Tambahkan session token dengan expiry time.

### 3. Race Condition pada Update Stok
**File**: `app/actions/transaction.ts`, `app/actions/purchase.ts`
**Masalah**: Pola "read current stock → calculate new stock → update" rentan race condition. Jika 2 transaksi terjadi bersamaan, stok bisa salah.

```
// Saat ini (vulnerable):
const prod = await supabase.from('products').select('stock')...
await supabase.from('products').update({ stock: prod.stock - qty })...

// Seharusnya menggunakan RPC/database function:
await supabase.rpc('decrement_stock', { product_id: id, qty: amount })
```

**Rekomendasi**: Buat **Supabase Database Function (RPC)** untuk atomic stock operations:
```sql
CREATE OR REPLACE FUNCTION decrement_stock(p_id UUID, qty INT)
RETURNS void AS $$
  UPDATE products SET stock = stock - qty WHERE id = p_id;
$$ LANGUAGE sql;
```

---

## 🟠 Penting (Arsitektur & Kualitas Kode)

### 4. Supabase Client Diinisialisasi Berulang
**File**: Hampir semua file
**Masalah**: Setiap file membuat instance `createClient()` baru secara inline. Ini menghasilkan puluhan koneksi duplikat dan melanggar prinsip DRY.

**Rekomendasi**: Sudah ada `lib/supabase/client.ts` tapi hampir tidak dipakai. Seharusnya:
- Semua client-side import dari `@/lib/supabase/client`.
- Buat `lib/supabase/server.ts` untuk Server Actions dengan service role key.

### 5. Tidak Ada Type Safety (Banyak `any`)
**File**: Seluruh codebase
**Masalah**: Hampir semua state menggunakan `any[]` — ini menghilangkan keuntungan TypeScript.
```typescript
// Saat ini:
const [products, setProducts] = useState<any[]>([]);

// Seharusnya:
interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category_id: string | null;
  // ...
}
const [products, setProducts] = useState<Product[]>([]);
```

**Rekomendasi**: Buat file `lib/types.ts` atau generate types otomatis dari Supabase schema menggunakan `supabase gen types typescript`.

### 6. Tidak Ada Error Boundary
**Masalah**: Jika terjadi error di salah satu komponen, seluruh halaman crash tanpa fallback UI.

**Rekomendasi**: Tambahkan `error.tsx` di setiap route segment untuk handling error graceful.

### 7. Tidak Ada Loading UI (Streaming)
**Masalah**: Loading hanya ditangani dengan state `isLoading` di setiap halaman secara manual.

**Rekomendasi**: Manfaatkan `loading.tsx` Next.js di route segment untuk Suspense boundary otomatis.

---

## 🟡 Sedang (Fungsionalitas & UX)

### 8. Dashboard Filter Tidak Persisten
**File**: `app/admin/page.tsx`
**Masalah**: Setiap kali navigasi keluar dan kembali ke Dashboard, filter reset ke "hari ini". Pengguna harus re-apply filter berulang kali.

**Rekomendasi**: Simpan filter di URL search params (`?startDate=...&endDate=...`) agar bisa di-bookmark dan persisten.

### 9. Tombol "Pilih Tanggal" di Laporan Tidak Berfungsi
**File**: `app/admin/reports/page.tsx` (line 64-67)
**Masalah**: Tombol "Pilih Tanggal" di halaman Laporan Transaksi hanya render UI tapi tidak ada handler/fungsionalitas.

**Rekomendasi**: Implementasikan filter tanggal seperti di halaman lain, atau hapus tombol tersebut.

### 10. Validasi Form Minim
**Masalah**: Banyak form yang hanya mengandalkan `required` HTML. Tidak ada validasi:
- Harga produk negatif
- PIN terlalu pendek/panjang
- Format nomor telepon
- Nama duplikat

**Rekomendasi**: Tambahkan validasi client-side yang lebih ketat dan tampilkan inline error messages.

### 11. Tidak Ada Konfirmasi Sebelum Meninggalkan Halaman
**Masalah**: Jika sales sudah mengisi keranjang lalu menavigasi ke halaman lain (misal tidak sengaja klik back), data keranjang bisa hilang tanpa peringatan.

**Rekomendasi**: Tambahkan `beforeunload` listener atau konfirmasi navigasi.

### 12. Halaman Inventory (`/admin/inventory`) Menggunakan Tabel `ingredients`
**File**: `app/admin/inventory/page.tsx`
**Masalah**: Halaman utama inventory mengelola `ingredients` (bahan baku), yang merupakan konsep berbeda dari inventory produk. Ini bisa membingungkan pengguna karena di sidebar tertulis "Inventory" tapi isinya bahan baku.

**Rekomendasi**: Rename label di sidebar menjadi "Bahan Baku" atau pisahkan sebagai sub-menu tersendiri.

### 13. Tidak Ada Pagination
**Masalah**: Semua data di-fetch sekaligus tanpa pagination. Halaman reports/sales mengambil seluruh transaksi. Untuk database yang sudah besar, ini akan sangat lambat.

**Rekomendasi**: Implementasikan cursor-based atau offset pagination, terutama di:
- Riwayat Penjualan
- Riwayat Stok
- Daftar Produk
- Daftar Pelanggan

### 14. Hapus Transaksi Dari Sales Report Berbahaya
**File**: `app/admin/reports/sales/page.tsx`
**Masalah**: Admin bisa menghapus transaksi secara permanen. Tidak ada soft-delete atau audit trail.

**Rekomendasi**:
- Implementasi **soft-delete** (`deleted_at` timestamp) alih-alih hard delete.
- Buat audit log untuk melacak siapa yang menghapus dan kapan.

---

## 🟢 Minor / Nice-to-Have

### 15. Responsive Mobile Admin Backoffice
**Masalah**: Meskipun Sidebar sudah responsive (hamburger menu), beberapa tabel admin tidak optimal di layar kecil (tabel lebar horizontal tanpa scrollbar yang jelas).

**Rekomendasi**: Tambahkan tampilan kartu (card view) sebagai alternatif tabel di breakpoint mobile.

### 16. Tidak Ada Dark Mode
**Masalah**: `globals.css` secara eksplisit menghapus dark mode (`color-scheme: light`).

**Rekomendasi**: Pertimbangkan dukungan dark mode untuk kenyamanan pengguna malam hari (opsional, tergantung kebutuhan bisnis).

### 17. `cost_price` Overwrite pada Pembelian
**File**: `app/actions/purchase.ts` (line 67)
**Masalah**: Saat pembelian baru dicatat, `cost_price` produk langsung di-overwrite ke harga beli terakhir. Ini tidak akurat jika ada pembelian dengan harga berbeda (seharusnya weighted average atau FIFO).

**Rekomendasi**: Implementasi metode harga rata-rata tertimbang (weighted average cost):
```
new_cost = ((old_stock × old_cost) + (new_qty × buy_price)) / (old_stock + new_qty)
```

### 18. Tidak Ada Notifikasi / Toast
**Masalah**: Semua feedback menggunakan `alert()` browser native — terlihat kuno dan mengganggu alur kerja.

**Rekomendasi**: Implementasi toast notification system (buat komponen sendiri atau gunakan library ringan).

### 19. Realtime Hanya di Halaman POS
**File**: `app/pos/page.tsx`
**Masalah**: Subscribe realtime hanya aktif di halaman POS untuk produk. Halaman admin tidak auto-refresh jika ada perubahan dari tempat lain.

**Rekomendasi**: Tambahkan realtime subscription di halaman-halaman kritis admin (Dashboard, Piutang, Stok).

### 20. Export/Import Data
**Masalah**: Tidak ada fitur import data bulk (misal: import daftar produk dari Excel).

**Rekomendasi**: Tambahkan fitur import CSV/Excel untuk produk dan pelanggan, menggunakan library `xlsx` yang sudah diinstal.

---

## 📊 Ringkasan Prioritas

| Prioritas | Jumlah | Item |
|---|---|---|
| 🔴 **Kritis** | 3 | Keamanan auth, RLS, race condition stok |
| 🟠 **Penting** | 4 | DRY supabase client, TypeScript types, error/loading boundaries |
| 🟡 **Sedang** | 7 | Pagination, soft-delete, validasi form, filter URL, dll |
| 🟢 **Minor** | 6 | Dark mode, toast, weighted avg cost, realtime admin, dll |

> **Rekomendasi urutan pengerjaan**: Mulai dari item 🔴 (keamanan), lalu 🟠 (arsitektur), baru sisanya sesuai dampak bisnis.
