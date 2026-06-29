-- Eksekusi skrip ini di SQL Editor Supabase untuk mengatur Modul Inventory & Pembelian

-- 1. Buat Tabel Suppliers (Pabrik / Bandar)
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;

-- 2. Buat Tabel Pembelian (Masuk dari Supplier)
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  total_amount DECIMAL(15,2) DEFAULT 0,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE purchases DISABLE ROW LEVEL SECURITY;

-- 3. Buat Tabel Item Pembelian (Rincian barang masuk)
CREATE TABLE IF NOT EXISTS purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  qty DECIMAL(10,2) NOT NULL,
  buy_price DECIMAL(15,2) NOT NULL
);

ALTER TABLE purchase_items DISABLE ROW LEVEL SECURITY;
