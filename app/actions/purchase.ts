'use server';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface PurchaseItemPayload {
  product_id: string;
  qty: number;
  buy_price: number;
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
      product_id: item.product_id,
      qty: item.qty,
      buy_price: item.buy_price
    }));

    const { error: itemsError } = await supabase
      .from('purchase_items')
      .insert(purchaseItems);

    if (itemsError) throw itemsError;

    // 3. Update Product Stocks
    // Since we don't have an RPC function for adding stock yet, we'll do it sequentially
    for (const item of items) {
      // Get current stock
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('stock')
        .eq('id', item.product_id)
        .single();
        
      if (fetchError) throw fetchError;
      
      const newStock = (product.stock || 0) + item.qty;
      
      // Update stock
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', item.product_id);
        
      if (updateError) throw updateError;
    }

    return { success: true, purchaseId: purchase.id };
  } catch (error: any) {
    console.error('Create Purchase Error:', error);
    return { success: false, error: error.message };
  }
}
