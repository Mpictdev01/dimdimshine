'use server';

import { changeOwnPin, session, signIn, signOut, staffAccounts } from '@/lib/server/session';

export async function listCashierAccounts() {
  return staffAccounts(['cashier']);
}

export async function listAdminAccounts() {
  return staffAccounts(['manager', 'super_admin']);
}

export async function loginAccount(userId: string, pin: string) {
  try { return await signIn(userId, pin); }
  catch { return { success: false as const, error: 'Login gagal. Coba lagi.' }; }
}

export async function currentSession() {
  return session();
}

export async function logoutAccount() {
  await signOut();
  return { success: true };
}

export async function updateOwnPin(newPin: string) {
  try { await changeOwnPin(newPin); return { success: true as const }; }
  catch (error) { return { success: false as const, error: error instanceof Error ? error.message : 'Gagal mengganti PIN' }; }
}
