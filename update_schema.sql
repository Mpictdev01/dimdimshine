-- SQL Schema Update for BOM (Bill of Materials) Feature

-- 1. Create the many-to-many relationship table between products and ingredients
CREATE TABLE IF NOT EXISTS public.product_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE CASCADE,
    quantity DECIMAL(12,2) NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.product_ingredients ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policy for anon access (consistent with current PIN-based auth logic)
CREATE POLICY "Allow anon full access on product_ingredients" 
ON public.product_ingredients 
FOR ALL TO anon 
USING (true) WITH CHECK (true);

-- 4. Alter purchase_items to allow ingredient purchases
ALTER TABLE public.purchase_items ADD COLUMN IF NOT EXISTS ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE SET NULL;

-- 5. Konversi Satuan (Yield/Porsi) untuk Bahan Baku
ALTER TABLE public.ingredients ADD COLUMN IF NOT EXISTS yield_quantity DECIMAL(12,2) DEFAULT 1;
ALTER TABLE public.ingredients ADD COLUMN IF NOT EXISTS yield_unit VARCHAR(50);

-- 6. Dukungan Opname untuk Bahan Baku
ALTER TABLE public.stock_adjustments ADD COLUMN IF NOT EXISTS ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE CASCADE;
ALTER TABLE public.stock_adjustments ALTER COLUMN product_id DROP NOT NULL;

-- 7. Add cost_price to ingredients to track HPP correctly
ALTER TABLE public.ingredients ADD COLUMN IF NOT EXISTS cost_price DECIMAL(12,2) NOT NULL DEFAULT 0;
