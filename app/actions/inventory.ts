'use server';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function createStockAdjustment(
  productId: string,
  oldStock: number,
  newStock: number,
  reason: string,
  note?: string
) {
  try {
    const difference = newStock - oldStock;

    // 1. Catat ke tabel stock_adjustments
    const { error: insertError } = await supabase
      .from('stock_adjustments')
      .insert([{
        product_id: productId,
        old_stock: oldStock,
        new_stock: newStock,
        difference: difference,
        reason: reason,
        note: note || null
      }]);

    if (insertError) throw insertError;

    // 2. Update tabel products
    const { error: updateError } = await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', productId);

    if (updateError) throw updateError;

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
        const productDiffs: Record<string, number> = {};
        adjs.forEach(adj => {
          productDiffs[adj.product_id] = (productDiffs[adj.product_id] || 0) + Number(adj.difference);
        });

        for (const [productId, diff] of Object.entries(productDiffs)) {
          const { data: p } = await supabase.from('products').select('stock').eq('id', productId).single();
          if (p) {
            const newStock = Math.max(0, Number(p.stock) - diff);
            await supabase.from('products').update({ stock: newStock }).eq('id', productId);
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
