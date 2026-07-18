'use server';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface PurchaseItemPayload {
  product_id?: string;
  ingredient_id?: string;
  qty: number;
  buy_price: number;
  type: 'product' | 'ingredient';
}

export async function createPurchase(
  supplierId: string, 
  items: PurchaseItemPayload[], 
  note: string,
  totalAmount: number
) {
  try {
    // 1. Create Purchase Record
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .insert([{
        supplier_id: supplierId,
        total_amount: totalAmount,
        note: note
      }])
      .select()
      .single();

    if (purchaseError) throw purchaseError;

    // 2. Insert Purchase Items
    const purchaseItems = items.map(item => ({
      purchase_id: purchase.id,
      product_id: item.type === 'product' ? item.product_id : null,
      ingredient_id: item.type === 'ingredient' ? item.ingredient_id : null,
      qty: item.qty,
      buy_price: item.buy_price
    }));

    const { error: itemsError } = await supabase
      .from('purchase_items')
      .insert(purchaseItems);

    if (itemsError) throw itemsError;

    // 3. Update Stocks sequentially
    for (const item of items) {
      if (item.type === 'product' && item.product_id) {
        const { data: product, error: fetchError } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.product_id)
          .single();
          
        if (fetchError) throw fetchError;
        
        const newStock = (product.stock || 0) + item.qty;
        const { error: updateError } = await supabase
          .from('products')
          .update({ stock: newStock, cost_price: item.buy_price })
          .eq('id', item.product_id);
          
        if (updateError) throw updateError;
      } else if (item.type === 'ingredient' && item.ingredient_id) {
        const { data: ing, error: fetchError } = await supabase
          .from('ingredients')
          .select('current_stock, yield_quantity')
          .eq('id', item.ingredient_id)
          .single();
          
        if (fetchError) throw fetchError;
        
        // Konversi: jumlah beli (satuan besar) dikali yield_quantity (porsi)
        const yieldQty = parseFloat(ing.yield_quantity || '1');
        const convertedStock = item.qty * yieldQty;
        
        const newStock = (ing.current_stock || 0) + convertedStock;
        
        // Ingredients table doesn't have cost_price in our final schema
        const { error: updateError } = await supabase
          .from('ingredients')
          .update({ current_stock: newStock })
          .eq('id', item.ingredient_id);
          
        if (updateError) throw updateError;
      }
    }

    return { success: true, purchaseId: purchase.id };
  } catch (error: any) {
    console.error('Create Purchase Error:', error);
    return { success: false, error: error.message };
  }
}
