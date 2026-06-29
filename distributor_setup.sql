-- SKRIP MIGRASI POS DISTRIBUTOR
-- Eksekusi skrip ini di SQL Editor pada Dashboard Supabase Anda

-- 1. Buat Tabel Units (Satuan)
CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Buat Tabel Customers (Pelanggan)
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Modifikasi Tabel Products
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock_alert DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES units(id);

-- 4. Modifikasi Tabel Transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_status TEXT CHECK (payment_status IN ('paid', 'unpaid')) DEFAULT 'paid';

-- Mengubah Check Constraint (Batasan) untuk Order Type (Pengiriman/Pickup)
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_order_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_order_type_check CHECK (order_type IN ('delivery', 'pickup', 'dine_in', 'takeaway')); -- Menyimpan nilai lama agar tidak error pada data dummy

-- Mengubah Check Constraint untuk Metode Pembayaran (Menambahkan 'tempo')
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_payment_method_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_payment_method_check CHECK (payment_method IN ('cash', 'qris', 'card', 'split', 'tempo'));

-- 5. Hapus Tabel F&B yang Tidak Terpakai
DROP TABLE IF EXISTS product_bom CASCADE;
DROP TABLE IF EXISTS ingredients CASCADE;

-- 6. Insert Data Default Satuan (LOV)
INSERT INTO units (name) VALUES ('Karung'), ('Dus'), ('Bal'), ('Renteng'), ('Pcs') ON CONFLICT (name) DO NOTHING;

-- 7. Atur Keamanan RLS
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all units" ON units;
CREATE POLICY "Allow public all units" ON units FOR ALL USING (true);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all customers" ON customers;
CREATE POLICY "Allow public all customers" ON customers FOR ALL USING (true);
