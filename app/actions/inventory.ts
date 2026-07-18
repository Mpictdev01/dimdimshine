'use server';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function createStockAdjustment(
  targetId: string,
  type: 'product' | 'ingredient',
  oldStock: number, // Ini dalam satuan beli (kalau ingredient) atau satuan utama (kalau product)
  newStock: number, // Ini dalam satuan beli (kalau ingredient) atau satuan utama (kalau product)
  reason: string,
  note?: string
) {
  try {
    const difference = newStock - oldStock; // Dalam satuan beli/utama

    // 1. Catat ke tabel stock_adjustments
    const payload: any = {
      old_stock: oldStock,
      new_stock: newStock,
      difference: difference,
      reason: reason,
      note: note || null
    };

    if (type === 'product') {
      payload.product_id = targetId;
    } else {
      payload.ingredient_id = targetId;
    }

    const { error: insertError } = await supabase
      .from('stock_adjustments')
      .insert([payload]);

    if (insertError) throw insertError;

    // 2. Update tabel products atau ingredients
    if (type === 'product') {
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', targetId);
      if (updateError) throw updateError;
    } else {
      // Ambil yield_quantity untuk konversi
      const { data: ing, error: fetchError } = await supabase
        .from('ingredients')
        .select('yield_quantity')
        .eq('id', targetId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const yieldQty = parseFloat(ing.yield_quantity || '1');
      const convertedNewStock = newStock * yieldQty;

      const { error: updateError } = await supabase
        .from('ingredients')
        .update({ current_stock: convertedNewStock })
        .eq('id', targetId);
      if (updateError) throw updateError;
    }

    return { success: true };
  } catch (err: any) {
    console.error('Create Stock Adjustment Error:', err);
    return { success: false, error: err.message || 'Gagal menyimpan penyesuaian stok' };
  }
}

export async function deleteAdjustments(ids: string[], revertStock: boolean) {
  try {
    if (revertStock) {
      const { data: adjs, error: fetchErr } = await supabase
        .from('stock_adjustments')
        .select('*')
        .in('id', ids);
      if (fetchErr) throw fetchErr;

      if (adjs && adjs.length > 0) {
        // Group by product and ingredient
        const productDiffs: Record<string, number> = {};
        const ingredientDiffs: Record<string, number> = {};
        
        adjs.forEach(adj => {
          if (adj.product_id) {
            productDiffs[adj.product_id] = (productDiffs[adj.product_id] || 0) + Number(adj.difference);
          } else if (adj.ingredient_id) {
            ingredientDiffs[adj.ingredient_id] = (ingredientDiffs[adj.ingredient_id] || 0) + Number(adj.difference);
          }
        });

        // Revert products
        for (const [productId, diff] of Object.entries(productDiffs)) {
          const { data: p } = await supabase.from('products').select('stock').eq('id', productId).single();
          if (p) {
            const newStock = Math.max(0, Number(p.stock) - diff);
            await supabase.from('products').update({ stock: newStock }).eq('id', productId);
          }
        }

        // Revert ingredients
        for (const [ingredientId, diff] of Object.entries(ingredientDiffs)) {
          const { data: ing } = await supabase.from('ingredients').select('current_stock, yield_quantity').eq('id', ingredientId).single();
          if (ing) {
            const yieldQty = parseFloat(ing.yield_quantity || '1');
            const convertedDiff = diff * yieldQty;
            const newStock = Math.max(0, Number(ing.current_stock) - convertedDiff);
            await supabase.from('ingredients').update({ current_stock: newStock }).eq('id', ingredientId);
          }
        }
      }
    }

    const { error: delErr } = await supabase
      .from('stock_adjustments')
      .delete()
      .in('id', ids);
    if (delErr) throw delErr;

    return { success: true };
  } catch (err: any) {
    console.error('Delete Adjustments Error:', err);
    return { success: false, error: err.message || 'Gagal menghapus penyesuaian' };
  }
}

