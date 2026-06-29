'use server';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function processTransaction(payload: any) {
  try {
    const { 
      shift_id, cashier_id, customer_id, order_type, 
      subtotal, tax, service_charge, total, 
      payment_method, payment_status, due_date, table_number, items 
    } = payload;

    // 1. Create transaction
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert([{
        shift_id,
        cashier_id,
        customer_id: customer_id || null,
        order_type,
        subtotal,
        tax,
        service_charge,
        total,
        payment_method,
        payment_status: payment_status || 'paid',
        due_date: due_date || null,
        table_number: table_number || null
      }])
      .select()
      .single();

    if (txError) throw txError;

    // 2. Create transaction items
    const txItems = items.map((item: any) => ({
      transaction_id: transaction.id,
      product_id: item.productId,
      quantity: item.quantity,
      price: item.price
    }));

    const { error: itemsError } = await supabase
      .from('transaction_items')
      .insert(txItems);

    if (itemsError) throw itemsError;

    // 3. Deduct inventory (Stok Fisik Distributor)
    for (const item of items) {
      // Dapatkan stok saat ini
      const { data: prod } = await supabase
        .from('products')
        .select('stock')
        .eq('id', item.productId)
        .single();
        
      if (prod && typeof prod.stock === 'number') {
        await supabase
          .from('products')
          .update({ stock: prod.stock - item.quantity })
          .eq('id', item.productId);
      }
    }

    return { success: true, transaction };
  } catch (err: any) {
    console.error('Transaction processing error:', err);
    return { success: false, error: err.message || 'Gagal memproses transaksi' };
  }
}
