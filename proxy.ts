import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (process.env.MAINTENANCE_MODE === 'true') {
    return new NextResponse('DIMDIM SHINE sedang dalam jeda operasional. Coba lagi setelah pembaruan selesai.',
      { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '120' } });
  }
  if (path === '/admin/login' || path === '/pos/shift') return NextResponse.next();
  const token = request.cookies.get('dimdim_session')?.value;
  if (!token) return NextResponse.redirect(new URL(path.startsWith('/admin') ? '/admin/login' : '/pos/shift', request.url));
  const key = process.env.SUPABASE_SECRET_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!key || !url) return new NextResponse('Konfigurasi server belum lengkap', { status: 503 });
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const response = await fetch(`${url}/rest/v1/pos_sessions?token_hash=eq.${tokenHash}&select=expires_at,revoked_at,users(role,must_change_pin,is_active)&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store',
  });
  if (!response.ok) return new NextResponse('Sesi tidak dapat diverifikasi', { status: 503 });
  const [active] = await response.json();
  const valid = active && !active.revoked_at && active.users?.is_active && Date.parse(active.expires_at) > Date.now();
  if (!valid) return NextResponse.redirect(new URL('/pos/shift', request.url));
  if (active.users?.must_change_pin && path !== '/change-pin') return NextResponse.redirect(new URL('/change-pin', request.url));
  if (path.startsWith('/admin') && active.users?.role === 'cashier') return NextResponse.redirect(new URL('/pos', request.url));
  if (path.startsWith('/admin/employees') && active.users?.role !== 'super_admin') return NextResponse.redirect(new URL('/admin', request.url));
  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*', '/pos/:path*', '/change-pin'] };
