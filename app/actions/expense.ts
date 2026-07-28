'use server';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function createExpense(
  shiftId: string,
  cashierId: string,
  amount: number,
  description: string
) {
  try {
    if (!description.trim()) {
      return { success: false, error: 'Deskripsi tidak boleh kosong' };
    }
    if (amount <= 0) {
      return { success: false, error: 'Jumlah harus lebih dari 0' };
    }

    const { data: expense, error } = await supabase
      .from('expenses')
      .insert([
        {
          shift_id: shiftId,
          cashier_id: cashierId,
          amount,
          description: description.trim(),
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return { success: true, expense };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mencatat pengeluaran' };
  }
}

export async function deleteExpense(expenseId: string) {
  try {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId);

    if (error) throw error;

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menghapus pengeluaran' };
  }
}
