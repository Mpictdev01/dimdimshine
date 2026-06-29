-- Eksekusi skrip ini di SQL Editor Supabase untuk mengatur Modul Area/Rute Pelanggan

-- 1. Buat tabel Area Pelanggan
CREATE TABLE IF NOT EXISTS customer_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE customer_areas DISABLE ROW LEVEL SECURITY;

-- 2. Tambahkan relasi Area ke Pelanggan (Customers)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES customer_areas(id) ON DELETE SET NULL;
