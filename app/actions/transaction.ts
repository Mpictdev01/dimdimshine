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
        total,
        payment_method,
        payment_status: payment_status || 'paid',
        due_date: due_date || null,
        table_number: table_number || null
      }])
      .select()
      .single();

    if (txError) throw txError;

    // Fetch products to get cost_price, current stock, and their BOM (product_ingredients)
    const productIds = items.map((i: any) => i.productId);
    const { data: products } = await supabase
      .from('products')
      .select('id, stock, cost_price, product_ingredients(ingredient_id, quantity)')
      .in('id', productIds);

    const productsMap = new Map(products?.map(p => [p.id, p]) || []);

    // Fetch ingredient costs to dynamically calculate BOM cost
    let ingredientIds: string[] = [];
    products?.forEach(p => {
      if (p.product_ingredients) {
        p.product_ingredients.forEach((pi: any) => ingredientIds.push(pi.ingredient_id));
      }
    });
    
    let ingredientsMap = new Map();
    if (ingredientIds.length > 0) {
      const { data: ingredients } = await supabase
        .from('ingredients')
        .select('id, cost_price')
        .in('id', ingredientIds);
      ingredientsMap = new Map(ingredients?.map(i => [i.id, i]) || []);
    }

    // 2. Create transaction items
    const txItems = items.map((item: any) => {
      const prod = productsMap.get(item.productId);
      let calculatedCostPrice = prod?.cost_price || 0;
      
      if (prod?.product_ingredients && prod.product_ingredients.length > 0) {
        let bomCost = 0;
        for (const pi of prod.product_ingredients) {
          const ing = ingredientsMap.get(pi.ingredient_id);
          bomCost += (ing?.cost_price || 0) * pi.quantity;
        }
        calculatedCostPrice = bomCost;
      }

      return {
        transaction_id: transaction.id,
        product_id: item.productId,
        quantity: item.quantity,
        price: item.price,
        cost_price: calculatedCostPrice
      };
    });

    const { error: itemsError } = await supabase
      .from('transaction_items')
      .insert(txItems);

    if (itemsError) throw itemsError;

    // 3. Deduct inventory (Bahan Baku / Stok Fisik)
    for (const item of items) {
      const prod = productsMap.get(item.productId);
      if (prod) {
        // Cek apakah punya resep (BOM)
        if (prod.product_ingredients && prod.product_ingredients.length > 0) {
          // Potong stok dari bahan baku
          for (const pi of prod.product_ingredients) {
            // Ambil stok bahan baku saat ini
            const { data: ing } = await supabase
              .from('ingredients')
              .select('current_stock')
              .eq('id', pi.ingredient_id)
              .single();
              
            if (ing) {
              const deductedStock = item.quantity * pi.quantity;
              await supabase
                .from('ingredients')
                .update({ current_stock: (ing.current_stock || 0) - deductedStock })
                .eq('id', pi.ingredient_id);
            }
          }
        } else {
          // Tidak ada resep, potong stok fisik produk
          if (typeof prod.stock === 'number') {
            await supabase
              .from('products')
              .update({ stock: prod.stock - item.quantity })
              .eq('id', item.productId);
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
        // Ambil info produk dan BOM-nya
        const { data: prod } = await supabase
          .from('products')
          .select('stock, product_ingredients(ingredient_id, quantity)')
          .eq('id', item.product_id)
          .single();
          
        if (prod) {
          if (prod.product_ingredients && prod.product_ingredients.length > 0) {
            // Kembalikan ke bahan baku
            for (const pi of prod.product_ingredients) {
              const { data: ing } = await supabase
                .from('ingredients')
                .select('current_stock')
                .eq('id', pi.ingredient_id)
                .single();
              
              if (ing) {
                const restoredStock = item.quantity * pi.quantity;
                await supabase
                  .from('ingredients')
                  .update({ current_stock: (ing.current_stock || 0) + restoredStock })
                  .eq('id', pi.ingredient_id);
              }
            }
          } else {
            // Kembalikan stok fisik produk
            if (typeof prod.stock === 'number') {
              await supabase
                .from('products')
                .update({ stock: prod.stock + item.quantity })
                .eq('id', item.product_id);
            }
          }
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

      // 2. Kembalikan stok satu-satu dengan logika BOM
      if (txItems && txItems.length > 0) {
        for (const item of txItems) {
          // Ambil info produk dan BOM-nya
          const { data: prod } = await supabase
            .from('products')
            .select('stock, product_ingredients(ingredient_id, quantity)')
            .eq('id', item.product_id)
            .single();
            
          if (prod) {
            if (prod.product_ingredients && prod.product_ingredients.length > 0) {
              // Kembalikan ke bahan baku
              for (const pi of prod.product_ingredients) {
                const { data: ing } = await supabase
                  .from('ingredients')
                  .select('current_stock')
                  .eq('id', pi.ingredient_id)
                  .single();
                
                if (ing) {
                  const restoredStock = item.quantity * pi.quantity;
                  await supabase
                    .from('ingredients')
                    .update({ current_stock: (ing.current_stock || 0) + restoredStock })
                    .eq('id', pi.ingredient_id);
                }
              }
            } else {
              // Kembalikan stok fisik produk
              if (typeof prod.stock === 'number') {
                await supabase
                  .from('products')
                  .update({ stock: prod.stock + item.quantity })
                  .eq('id', item.product_id);
              }
            }
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
