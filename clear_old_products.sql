-- Eksekusi skrip ini untuk membersihkan data dummy F&B lama
-- Ini akan menghapus semua riwayat transaksi dummy (jika ada) dan semua produk kopi lama

DELETE FROM transaction_items;
DELETE FROM transactions;
DELETE FROM products;
