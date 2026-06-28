'use server';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function processTransaction(payload: any) {
  try {
    const { 
      shift_id, cashier_id, table_number, order_type, 
      subtotal, tax, service_charge, total, 
      payment_method, items 
    } = payload;

    // 1. Create transaction
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert([{
        shift_id,
        cashier_id,
        table_number,
        order_type,
        subtotal,
        tax,
        service_charge,
        total,
        payment_method,
        status: 'paid'
      }])
      .select()
      .single();

    if (txError) throw txError;

    // 2. Create transaction items
    const txItems = items.map((item: any) => ({
      transaction_id: transaction.id,
      product_id: item.productId,
      quantity: item.quantity,
      price: item.price,
      modifiers: item.modifiers || null
    }));

    const { error: itemsError } = await supabase
      .from('transaction_items')
      .insert(txItems);

    if (itemsError) throw itemsError;

    // 3. Deduct inventory based on BOM (Bill of Materials)
    // Untuk production, ini sebaiknya dilakukan via Database Function / RPC agar atomik.
    // Di sini kita gunakan iterasi sederhana untuk demonstrasi.
    for (const item of items) {
      // Get BOM for product
      const { data: bomList } = await supabase
        .from('product_bom')
        .select('ingredient_id, quantity_required')
        .eq('product_id', item.productId);
      
      if (bomList && bomList.length > 0) {
        for (const bom of bomList) {
          const totalRequired = bom.quantity_required * item.quantity;
          
          // Dapatkan stok saat ini (idealnya pakai RPC untuk hindari race condition)
          const { data: ing } = await supabase
            .from('ingredients')
            .select('current_stock')
            .eq('id', bom.ingredient_id)
            .single();
            
          if (ing) {
            await supabase
              .from('ingredients')
              .update({ current_stock: ing.current_stock - totalRequired })
              .eq('id', bom.ingredient_id);
          }
        }
      }
    }

    return { success: true, transaction };
  } catch (err: any) {
    console.error('Transaction processing error:', err);
    return { success: false, error: err.message || 'Gagal memproses transaksi' };
  }
}
