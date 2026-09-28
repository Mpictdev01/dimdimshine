'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { currentSession, listAdminAccounts, loginAccount, logoutAccount } from '@/app/actions/auth';
import Image from 'next/image';

export default function AdminLoginPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<{id:string; full_name:string}[]>([]);
  const [userId, setUserId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    currentSession().then(active => {
      if (active?.mustChangePin) router.replace('/change-pin');
      else if (active && active.role !== 'cashier') router.replace('/admin');
    });
    listAdminAccounts().then(setAccounts).catch(() => setError('Daftar akun gagal dimuat. Muat ulang halaman.'));
  }, [router]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setError('');
    const result = await loginAccount(userId, pin);
    setBusy(false);
    if (!result.success) { setError(result.error); return; }
    if (result.user.mustChangePin) { router.replace('/change-pin'); return; }
    if (result.user.role === 'cashier') {
      await logoutAccount();
      setError('Akun kasir tidak memiliki akses admin.');
      return;
    }
    router.replace('/admin');
  }
  return <main className="clay-shell flex min-h-screen items-center justify-center bg-slate-900 p-4">
    <form onSubmit={submit} className="clay-surface w-full max-w-sm space-y-5 rounded-3xl bg-white p-7 sm:p-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <Image src="/poslogo.png" alt="Logo DIMDIM SHINE" width={88} height={88} className="clay-logo h-[88px] w-[88px] object-cover" priority />
        <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-400">Backoffice</span>
        <h1 className="text-2xl font-black text-slate-800">Masuk Admin</h1>
        <p className="text-sm text-slate-500">Kelola DIMDIM SHINE</p>
      </div>
      <label htmlFor="account" className="block text-sm font-medium">Akun admin</label>
      <select id="account" value={userId} onChange={event => setUserId(event.target.value)} required className="w-full rounded-xl border p-3">
        <option value="">Pilih akun</option>
        {accounts.map(account => <option key={account.id} value={account.id}>{account.full_name}</option>)}
      </select>
      <label htmlFor="admin-pin" className="block text-sm font-medium">PIN</label>
      <input id="admin-pin" type="password" inputMode="numeric" autoComplete="current-password" value={pin}
        onChange={event => setPin(event.target.value)} required className="w-full rounded-xl border p-3" />
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button disabled={busy || !userId} className="w-full rounded-xl bg-blue-600 p-3 font-bold text-white disabled:opacity-50">
        {busy ? 'Memeriksa…' : 'Masuk Admin'}
      </button>
      <button type="button" onClick={() => router.push('/pos/shift')} className="w-full text-sm text-slate-500">Ke POS</button>
    </form>
  </main>;
}
