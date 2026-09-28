'use server';

import { db } from '@/lib/server/db';
import { requireRole } from '@/lib/server/session';

export async function createStockAdjustment(
  targetId: string, type: 'product' | 'ingredient', _oldStock: number,
  newStock: number, reason: string, note?: string,
) {
  try {
    await requireRole(['manager','super_admin']);
    if (!Number.isFinite(newStock) || newStock < 0) throw new Error('Stok baru tidak valid');
    const { error } = await db().rpc('pos_adjust_stock', {
      p_target_id: targetId, p_type: type, p_new_stock: newStock,
      p_reason: reason, p_note: note ?? null,
    });
    if (error) throw error;
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal menyimpan penyesuaian' };
  }
}

export async function deleteAdjustments(ids: string[], revertStock: boolean) {
  try {
    await requireRole(['manager','super_admin']);
    const { error } = await db().rpc('pos_delete_adjustments', { p_ids: ids, p_revert: revertStock });
    if (error) throw error;
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal menghapus penyesuaian' };
  }
}
