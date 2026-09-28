import 'server-only';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { db } from './db';

const COOKIE = 'dimdim_session';
export type Role = 'cashier' | 'manager' | 'super_admin';
export type Session = {
  userId: string;
  fullName: string;
  role: Role;
  mustChangePin: boolean;
  expiresAt: string;
};

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

export async function staffAccounts(roles: Role[]) {
  if (process.env.MAINTENANCE_MODE === 'true') throw new Error('POS sedang dalam jeda operasional');
  const { data, error } = await db().from('users').select('id, full_name')
    .eq('is_active', true).in('role', roles).order('full_name');
  if (error) throw error;
  return data ?? [];
}

export async function signIn(userId: string, pin: string) {
  if (process.env.MAINTENANCE_MODE === 'true') throw new Error('POS sedang dalam jeda operasional');
  if (!/^[0-9a-f-]{36}$/.test(userId) || !/^[0-9]{4,8}$/.test(pin))
    return { success: false as const, error: 'Akun atau PIN tidak valid' };
  const requestHeaders = await headers();
  const ip = (requestHeaders.get('x-vercel-forwarded-for') ?? requestHeaders.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
  const ipHash = createHmac('sha256', process.env.SUPABASE_SECRET_KEY!).update(ip).digest('hex');
  const token = randomBytes(32).toString('base64url');
  const { data, error } = await db().rpc('pos_login', {
    p_user_id: userId, p_pin: pin, p_ip_hash: ipHash, p_token_hash: sha256(token),
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return { success: false as const, error: 'Akun atau PIN tidak valid, atau percobaan terlalu banyak' };
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
    path: '/', expires: new Date(row.expires_at),
  });
  return { success: true as const, user: {
    id: row.user_id as string, full_name: row.full_name as string,
    role: row.role as Role, mustChangePin: row.must_change_pin as boolean,
  } };
}

export async function session(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const { data, error } = await db().from('pos_sessions')
    .select('user_id, expires_at, revoked_at, users(full_name, role, must_change_pin, is_active)')
    .eq('token_hash', sha256(token)).maybeSingle();
  if (error || !data || data.revoked_at || Date.parse(data.expires_at) <= Date.now()) return null;
  const user = Array.isArray(data.users) ? data.users[0] : data.users;
  if (!user || !user.is_active) return null;
  return { userId: data.user_id, fullName: user.full_name, role: user.role as Role,
    mustChangePin: user.must_change_pin, expiresAt: data.expires_at };
}

export async function requireRole(allowed: Role[], allowPinChange = false): Promise<Session> {
  if (process.env.MAINTENANCE_MODE === 'true') throw new Error('POS sedang dalam jeda operasional');
  const active = await session();
  if (!active) throw new Error('Sesi berakhir. Silakan masuk kembali.');
  if (active.mustChangePin && !allowPinChange) throw new Error('Ganti PIN sebelum melanjutkan.');
  if (!allowed.includes(active.role)) throw new Error('Akses ditolak.');
  return active;
}

export async function signOut() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (token) await db().from('pos_sessions').update({ revoked_at: new Date().toISOString() }).eq('token_hash', sha256(token));
  (await cookies()).delete(COOKIE);
}

export async function changeOwnPin(newPin: string) {
  const active = await requireRole(['cashier', 'manager', 'super_admin'], true);
  if (!/^[0-9]{6,8}$/.test(newPin)) throw new Error('PIN baru harus 6–8 digit.');
  const { error } = await db().rpc('pos_change_pin', { p_user_id: active.userId, p_new_pin: newPin });
  if (error) throw error;
  (await cookies()).delete(COOKIE);
}
