'use server';

import { db } from '@/lib/server/db';
import { requireRole } from '@/lib/server/session';

export async function activeShift() {
  const actor = await requireRole(['cashier','manager','super_admin']);
  const { data, error } = await db().from('shifts').select('id, cashier_id, start_time, starting_cash, status')
    .eq('cashier_id', actor.userId).eq('status', 'open').order('start_time', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data ? { id: data.id, cashierId: actor.userId, cashierName: actor.fullName,
    startTime: data.start_time, startingCash: Number(data.starting_cash) } : null;
}

export async function openShift(startingCash: number) {
  try {
    const actor = await requireRole(['cashier','manager','super_admin']);
    if (!Number.isFinite(startingCash) || startingCash < 0) throw new Error('Kas awal tidak valid');
    const { data, error } = await db().rpc('pos_open_shift', { p_user_id: actor.userId, p_starting_cash: startingCash });
    if (error) throw error;
    return { success: true as const, shift: data, user: actor };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal membuka shift' };
  }
}

export async function shiftSummary(shiftId: string) {
  const actor = await requireRole(['cashier','manager','super_admin']);
  const { data: shift, error } = await db().from('shifts').select('id, cashier_id, starting_cash, status, start_time')
    .eq('id', shiftId).single();
  if (error || !shift || (actor.role === 'cashier' && shift.cashier_id !== actor.userId)) throw new Error('Shift tidak ditemukan');
  const [tx, exp] = await Promise.all([
    db().from('transactions').select('id, total, payment_method, created_at').eq('shift_id', shiftId).eq('payment_status', 'paid'),
    db().from('expenses').select('id, amount, description, created_at').eq('shift_id', shiftId),
  ]);
  if (tx.error || exp.error) throw tx.error ?? exp.error;
  const cashSales = (tx.data ?? []).filter(row => row.payment_method === 'cash').reduce((sum,row) => sum + Number(row.total), 0);
  const qrisSales = (tx.data ?? []).filter(row => row.payment_method === 'qris').reduce((sum,row) => sum + Number(row.total), 0);
  const expenses = (exp.data ?? []).reduce((sum,row) => sum + Number(row.amount), 0);
  return { shift, transactions: tx.data ?? [], expenses: exp.data ?? [], cashSales, qrisSales,
    expenseTotal: expenses, expectedCash: Number(shift.starting_cash) + cashSales - expenses };
}

export async function closeShift(shiftId: string, endingCash: number) {
  try {
    const actor = await requireRole(['cashier','manager','super_admin']);
    if (!Number.isFinite(endingCash) || endingCash < 0) throw new Error('Kas fisik tidak valid');
    const { data, error } = await db().rpc('pos_close_shift', {
      p_user_id: actor.userId, p_shift_id: shiftId, p_physical_cash: endingCash,
    });
    if (error) throw error;
    return { success: true as const, shift: data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal menutup shift' };
  }
}
