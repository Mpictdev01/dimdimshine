'use server';

import { db } from '@/lib/server/db';
import { requireRole } from '@/lib/server/session';

interface PurchaseItemPayload {
  product_id?: string;
  ingredient_id?: string;
  qty: number;
  buy_price: number;
  type: 'product' | 'ingredient';
}

export async function createPurchase(supplierId: string, items: PurchaseItemPayload[], note: string, clientTotal: number) {
  try {
    void clientTotal; // Invoice total is recalculated atomically in the database.
    await requireRole(['manager','super_admin']);
    if (!Array.isArray(items) || !items.length || items.length > 100) throw new Error('Daftar pembelian tidak valid');
    const clean = items.map(item => {
      if (!['product','ingredient'].includes(item.type) || !Number.isInteger(item.qty) || item.qty < 1 ||
        !Number.isFinite(item.buy_price) || item.buy_price < 0) throw new Error('Item pembelian tidak valid');
      return { type: item.type, product_id: item.type === 'product' ? item.product_id : null,
        ingredient_id: item.type === 'ingredient' ? item.ingredient_id : null,
        qty: item.qty, buy_price: item.buy_price };
    });
    const { data, error } = await db().rpc('pos_create_purchase', {
      p_supplier_id: supplierId, p_items: clean, p_note: note?.trim() ?? '',
    });
    if (error) throw error;
    return { success: true as const, purchaseId: data.id };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal mencatat pembelian' };
  }
}
