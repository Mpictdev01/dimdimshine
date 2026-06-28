-- Eksekusi skrip ini di SQL Editor pada Dashboard Supabase Anda

-- 1. Users / Employees (Custom table, no email auth needed based on user request)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  role TEXT CHECK (role IN ('super_admin', 'manager', 'cashier')) NOT NULL,
  pin TEXT UNIQUE NOT NULL, -- PIN for fast POS login
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Ingredients (Inventory)
CREATE TABLE IF NOT EXISTS ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  unit TEXT NOT NULL, -- e.g., 'gram', 'ml', 'pcs'
  current_stock DECIMAL(10, 2) DEFAULT 0,
  min_stock_alert DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Product BOM (Bill of Materials)
CREATE TABLE IF NOT EXISTS product_bom (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity_required DECIMAL(10, 2) NOT NULL,
  UNIQUE(product_id, ingredient_id)
);

-- 5. Shifts
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cashier_id UUID REFERENCES users(id),
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  starting_cash DECIMAL(10, 2) NOT NULL,
  ending_cash DECIMAL(10, 2),
  status TEXT CHECK (status IN ('open', 'closed')) DEFAULT 'open'
);

-- 6. Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID REFERENCES shifts(id),
  cashier_id UUID REFERENCES users(id),
  table_number TEXT,
  order_type TEXT CHECK (order_type IN ('dine_in', 'takeaway')),
  subtotal DECIMAL(10, 2) NOT NULL,
  tax DECIMAL(10, 2) DEFAULT 0,
  service_charge DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('cash', 'qris', 'card', 'split')),
  status TEXT CHECK (status IN ('pending', 'paid', 'cancelled')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Transaction Items
CREATE TABLE IF NOT EXISTS transaction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  modifiers JSONB, -- Store selected modifiers like {"ice": "less", "sugar": "normal"}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INSERT DUMMY DATA FOR TESTING
INSERT INTO users (full_name, role, pin) VALUES ('Super Admin', 'super_admin', '9999') ON CONFLICT DO NOTHING;
INSERT INTO users (full_name, role, pin) VALUES ('Kasir 1', 'cashier', '1234') ON CONFLICT DO NOTHING;

INSERT INTO products (name, category, price) VALUES 
('Es Kopi Susu', 'Minuman', 25000),
('Americano', 'Minuman', 20000),
('Croissant', 'Makanan', 30000);

-- Enable RLS and setup basic policies to allow public access (for development/testing)
-- IN PRODUCTION, THIS SHOULD BE RESTRICTED based on authenticated user or API Keys
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_bom ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public all users" ON users FOR ALL USING (true);
CREATE POLICY "Allow public all products" ON products FOR ALL USING (true);
CREATE POLICY "Allow public all ingredients" ON ingredients FOR ALL USING (true);
CREATE POLICY "Allow public all product_bom" ON product_bom FOR ALL USING (true);
CREATE POLICY "Allow public all shifts" ON shifts FOR ALL USING (true);
CREATE POLICY "Allow public all transactions" ON transactions FOR ALL USING (true);
CREATE POLICY "Allow public all transaction_items" ON transaction_items FOR ALL USING (true);
