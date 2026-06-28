-- Eksekusi skrip ini di SQL Editor pada Dashboard Supabase Anda

CREATE TABLE IF NOT EXISTS store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name TEXT NOT NULL DEFAULT 'Okax Coffee',
  address TEXT NOT NULL DEFAULT 'Jl. Sudirman No. 123, Jakarta',
  tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 11.00,
  service_charge DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial row if not exists
INSERT INTO store_settings (store_name, address, tax_rate, service_charge)
SELECT 'Okax Coffee', 'Jl. Sudirman No. 123, Jakarta', 11.00, 0.00
WHERE NOT EXISTS (SELECT 1 FROM store_settings);

-- RLS
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public all store_settings" ON store_settings FOR ALL USING (true);

-- Aktifkan Realtime untuk tabel products agar POS dapat meng-update secara otomatis tanpa refresh
ALTER PUBLICATION supabase_realtime ADD TABLE products;
