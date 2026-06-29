-- Eksekusi skrip ini di SQL Editor Supabase untuk mengatur Kategori

-- 0. Reset (Hapus) tabel lama yang gagal
ALTER TABLE products DROP COLUMN IF EXISTS category_id;
DROP TABLE IF EXISTS categories;

-- 1. Buat tabel Kategori
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MATIKAN RLS (Row Level Security) agar bisa di-INSERT dari aplikasi
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;

-- 2. Ubah tabel produk
-- Karena kita sudah menghapus produk lama, kita bisa langsung mengubah strukturnya.
ALTER TABLE products DROP COLUMN IF EXISTS category;
ALTER TABLE products DROP COLUMN IF EXISTS image_url;
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id);
