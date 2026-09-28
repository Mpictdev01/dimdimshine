'use server';

import { db } from '@/lib/server/db';
import { requireRole } from '@/lib/server/session';

export async function createExpense(shiftId: string, _cashierId: string, amount: number, description: string) {
  try {
    const actor = await requireRole(['cashier','manager','super_admin']);
    if (!Number.isFinite(amount) || amount <= 0 || !description?.trim()) throw new Error('Jumlah atau deskripsi tidak valid');
    const { data, error } = await db().rpc('pos_create_expense', { p_user_id: actor.userId,
      p_shift_id: shiftId, p_amount: amount, p_description: description.trim() });
    if (error) throw error;
    return { success: true as const, expense: data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal mencatat pengeluaran' };
  }
}

export async function deleteExpense(expenseId: string) {
  try {
    const actor = await requireRole(['cashier','manager','super_admin']);
    const { error } = await db().rpc('pos_delete_expense', { p_actor_id: actor.userId,
      p_expense_id: expenseId, p_is_admin: actor.role !== 'cashier' });
    if (error) throw error;
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal menghapus pengeluaran' };
  }
}
