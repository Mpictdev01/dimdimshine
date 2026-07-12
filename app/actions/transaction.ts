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

    // Fetch products to get cost_price and current stock
    const productIds = items.map((i: any) => i.productId);
    const { data: products } = await supabase
      .from('products')
      .select('id, stock, cost_price')
      .in('id', productIds);

    const productsMap = new Map(products?.map(p => [p.id, p]) || []);

    // 2. Create transaction items
    const txItems = items.map((item: any) => ({
      transaction_id: transaction.id,
      product_id: item.productId,
      quantity: item.quantity,
      price: item.price,
      cost_price: productsMap.get(item.productId)?.cost_price || 0
    }));

    const { error: itemsError } = await supabase
      .from('transaction_items')
      .insert(txItems);

    if (itemsError) throw itemsError;

    // 3. Deduct inventory (Stok Fisik Distributor)
    for (const item of items) {
      const prod = productsMap.get(item.productId);
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

export async function deleteTransaction(txId: string, shouldRestoreStock: boolean = true) {
  try {
    // 1. Ambil data transaction_items beserta info produk
    const { data: txItems, error: fetchError } = await supabase
      .from('transaction_items')
      .select('product_id, quantity')
      .eq('transaction_id', txId);

    if (fetchError) throw fetchError;

    // 2. Kembalikan stok ke masing-masing produk JIKA di-request
    if (shouldRestoreStock && txItems && txItems.length > 0) {
      for (const item of txItems) {
        // Ambil stok saat ini
        const { data: prod } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.product_id)
          .single();
          
        if (prod && typeof prod.stock === 'number') {
          // Kembalikan stok
          await supabase
            .from('products')
            .update({ stock: prod.stock + item.quantity })
            .eq('id', item.product_id);
        }
      }
    }

    // 3. Hapus transaction_items (meskipun sudah cascade, kita pastikan)
    const { error: delItemsError } = await supabase
      .from('transaction_items')
      .delete()
      .eq('transaction_id', txId);

    if (delItemsError) throw delItemsError;

    // 4. Hapus transaksi utama
    const { error: delTxError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', txId);

    if (delTxError) throw delTxError;

    return { success: true };
  } catch (err: any) {
    console.error('Delete transaction error:', err);
    return { success: false, error: err.message || 'Gagal menghapus transaksi' };
  }
}

export async function deleteTransactions(txIds: string[], shouldRestoreStock: boolean = true) {
  try {
    if (shouldRestoreStock) {
      // 1. Ambil data semua transaction_items dari ID yang dipilih
      const { data: txItems, error: fetchError } = await supabase
        .from('transaction_items')
        .select('product_id, quantity')
        .in('transaction_id', txIds);

      if (fetchError) throw fetchError;

      // 2. Agregasi total kuantitas per produk untuk mengurangi hit API
      if (txItems && txItems.length > 0) {
        const productDiffs: Record<string, number> = {};
        txItems.forEach(item => {
          productDiffs[item.product_id] = (productDiffs[item.product_id] || 0) + item.quantity;
        });

        // 3. Kembalikan stok ke masing-masing produk
        for (const [productId, qtyToRestore] of Object.entries(productDiffs)) {
          const { data: prod } = await supabase
            .from('products')
            .select('stock')
            .eq('id', productId)
            .single();
            
          if (prod && typeof prod.stock === 'number') {
            await supabase
              .from('products')
              .update({ stock: prod.stock + qtyToRestore })
              .eq('id', productId);
          }
        }
      }
    }

    // 4. Hapus transaksi utama (karena cascade, transaction_items otomatis terhapus)
    const { error: delTxError } = await supabase
      .from('transactions')
      .delete()
      .in('id', txIds);

    if (delTxError) throw delTxError;

    return { success: true };
  } catch (err: any) {
    console.error('Delete transactions error:', err);
    return { success: false, error: err.message || 'Gagal menghapus transaksi' };
  }
}
