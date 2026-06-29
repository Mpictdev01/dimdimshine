-- PERINGATAN: Skrip ini akan MENGHAPUS SEMUA DATA TRANSAKSI, PRODUK, KATEGORI LAMA!
-- Gunakan ini JIKA Anda ingin mereset aplikasi agar benar-benar bersih sebelum jualan.

-- 1. Hapus isi riwayat (wajib dihapus lebih dulu karena nyangkut ke produk)
DELETE FROM transaction_items;
DELETE FROM transactions;
DELETE FROM purchase_items;
DELETE FROM purchases;

-- 2. Hapus isi produk dan pengaturannya
DELETE FROM products;
DELETE FROM categories;
DELETE FROM units;
DELETE FROM suppliers;
DELETE FROM customer_areas;
DELETE FROM customers;

-- Selesai. Database Anda sekarang 100% kosong dan siap digunakan jualan asli.
