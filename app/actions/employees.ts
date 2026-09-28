'use server';

import { db } from '@/lib/server/db';
import { requireRole } from '@/lib/server/session';

export async function listEmployees() {
  try {
    await requireRole(['super_admin']);
    const { data, error } = await db().from('users').select('id,full_name,role,is_active').order('role');
    if (error) throw error;
    return { success: true as const, employees: data ?? [] };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal memuat pegawai' };
  }
}

export async function saveEmployee(id: string | null, fullName: string, role: string, pin: string) {
  try {
    await requireRole(['super_admin']);
    if (!fullName.trim() || !['cashier','manager','super_admin'].includes(role)) throw new Error('Data pegawai tidak valid');
    if (pin && !/^[0-9]{6,8}$/.test(pin)) throw new Error('PIN harus 6–8 digit');
    if (!id && !pin) throw new Error('PIN baru wajib diisi');
    const { data, error } = await db().rpc('pos_save_user', {
      p_id: id, p_name: fullName, p_role: role, p_pin: pin || null,
    });
    if (error) throw error;
    return { success: true as const, user: Array.isArray(data) ? data[0] : data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal menyimpan akun' };
  }
}

export async function deactivateEmployee(id: string) {
  try {
    const actor = await requireRole(['super_admin']);
    if (actor.userId === id) throw new Error('Tidak dapat menonaktifkan akun sendiri');
    const { error } = await db().rpc('pos_deactivate_user', { p_id: id });
    if (error) throw error;
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal menonaktifkan akun' };
  }
}

export async function activateEmployee(id: string) {
  try {
    await requireRole(['super_admin']);
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('ID pegawai tidak valid');
    const { data: account, error: lookupError } = await db().from('users')
      .select('pin_hash,legacy_pin_expires_at').eq('id', id).eq('is_active', false).single();
    if (lookupError) throw lookupError;
    if (!account.pin_hash || account.legacy_pin_expires_at)
      throw new Error('Atur PIN pegawai melalui Ubah/Reset sebelum mengaktifkan akun.');
    const { data, error } = await db().from('users').update({
      is_active: true, updated_at: new Date().toISOString(),
    }).eq('id', id).eq('is_active', false).select('id').single();
    if (error) throw error;
    return { success: true as const, id: data.id as string };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal mengaktifkan akun' };
  }
}
