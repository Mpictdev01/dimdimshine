'use server';

import { db } from '@/lib/server/db';
import { requireRole } from '@/lib/server/session';

export async function saveIngredient(input: {
  id?: string | null; name: string; unit: string; minStockAlert: number;
  yieldQuantity: number; yieldUnit: string; costPrice: number;
}) {
  try {
    await requireRole(['manager','super_admin']);
    if (!input.name?.trim() || !Number.isFinite(input.minStockAlert) || input.minStockAlert < 0 ||
      !Number.isFinite(input.yieldQuantity) || input.yieldQuantity <= 0 ||
      !Number.isFinite(input.costPrice) || input.costPrice < 0) throw new Error('Bahan baku tidak valid');
    const { data, error } = await db().rpc('pos_save_ingredient', {
      p_id: input.id ?? null, p_name: input.name, p_unit: input.unit,
      p_min_alert: input.minStockAlert, p_yield_quantity: input.yieldQuantity,
      p_yield_unit: input.yieldUnit, p_cost_price: input.costPrice,
    });
    if (error) throw error;
    return { success: true as const, ingredient: data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal menyimpan bahan baku' };
  }
}

export async function deleteIngredient(id: string) {
  try {
    await requireRole(['manager','super_admin']);
    const { error } = await db().rpc('pos_delete_ingredient', { p_id: id });
    if (error) throw error;
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal menghapus bahan baku' };
  }
}
