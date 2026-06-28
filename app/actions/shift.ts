'use server';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function loginWithPin(pin: string) {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, full_name, role')
      .eq('pin', pin)
      .single();

    if (error || !users) {
      return { success: false, error: 'PIN tidak valid' };
    }

    if (users.role !== 'cashier' && users.role !== 'super_admin' && users.role !== 'manager') {
      return { success: false, error: 'Peran tidak diizinkan untuk membuka shift' };
    }

    return { success: true, user: users };
  } catch (err: any) {
    return { success: false, error: err.message || 'Terjadi kesalahan' };
  }
}

export async function openShift(cashierId: string, startingCash: number) {
  try {
    const { data: shift, error } = await supabase
      .from('shifts')
      .insert([
        {
          cashier_id: cashierId,
          starting_cash: startingCash,
          status: 'open',
        }
      ])
      .select()
      .single();

    if (error) throw error;
    
    return { success: true, shift };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal membuka shift' };
  }
}

export async function closeShift(shiftId: string, endingCash: number) {
  try {
    const { data: shift, error } = await supabase
      .from('shifts')
      .update({
        ending_cash: endingCash,
        end_time: new Date().toISOString(),
        status: 'closed'
      })
      .eq('id', shiftId)
      .select()
      .single();

    if (error) throw error;
    
    return { success: true, shift };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menutup shift' };
  }
}
