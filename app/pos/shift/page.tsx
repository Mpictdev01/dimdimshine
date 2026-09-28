'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { activeShift, openShift } from '@/app/actions/shift';
import { currentSession, listCashierAccounts, loginAccount, logoutAccount } from '@/app/actions/auth';
import { usePosStore } from '@/lib/store/usePosStore';
import Image from 'next/image';

export default function ShiftPage() {
  const router = useRouter();
  const { setShift, endShift, clearCart } = usePosStore();
  const [accounts, setAccounts] = useState<{id:string; full_name:string}[]>([]);
  const [userId, setUserId] = useState('');
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    listCashierAccounts().then(setAccounts).catch(() => setError('Daftar akun gagal dimuat. Coba muat ulang.'));
    currentSession().then(async active => {
      if (!active) { endShift(); clearCart(); return; }
      if (active.mustChangePin) { router.replace('/change-pin'); return; }
      setName(active.fullName);
      const shift = await activeShift();
      if (shift) { setShift(shift); router.replace('/pos'); }
      else { endShift(); clearCart(); }
    }).catch(() => setError('Sesi tidak dapat diperiksa. Coba muat ulang.'));
  }, [router, setShift, endShift, clearCart]);
  async function login(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    const result = await loginAccount(userId, pin);
    setBusy(false);
    if (!result.success) { setError(result.error); return; }
    if (result.user.mustChangePin) { router.replace('/change-pin'); return; }
    setName(result.user.full_name);
    const shift = await activeShift();
    if (shift) { setShift(shift); router.replace('/pos'); }
  }
  async function start(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    const result = await openShift();
    setBusy(false);
    if (!result.success) { setError(result.error); return; }
    setShift({ id: result.shift.id, cashierId: result.user.userId, cashierName: result.user.fullName,
      startTime: result.shift.start_time });
    router.replace('/pos');
  }
  return <main className="clay-shell flex h-full items-center justify-center bg-slate-50 p-4">
    <div className="clay-surface w-full max-w-sm rounded-3xl bg-white p-7 sm:p-8 space-y-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <Image src="/poslogo.png" alt="Logo DIMDIM SHINE" width={88} height={88} className="clay-logo h-[88px] w-[88px] object-cover" priority />
        <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-400">Terminal Kasir</span>
        <h1 className="text-2xl font-black text-slate-800">{name ? 'Buka Shift' : 'Masuk Kasir'}</h1>
        <p className="text-sm text-slate-500">DIMDIM SHINE POS</p>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {name ? <form onSubmit={start} className="space-y-4">
        <p className="text-sm text-slate-600">Kasir: {name}</p>
        <button disabled={busy} className="w-full rounded-lg bg-blue-600 p-3 text-white disabled:opacity-50">{busy ? 'Membuka…' : 'Buka shift'}</button>
        <button type="button" onClick={async () => { await logoutAccount(); setName(''); endShift(); clearCart(); }} className="w-full text-sm text-slate-500">Ganti akun</button>
      </form> : <form onSubmit={login} className="space-y-4">
        <label htmlFor="staff-account" className="block text-sm font-medium">Akun kasir</label>
        <select id="staff-account" value={userId} onChange={event => setUserId(event.target.value)} required className="w-full rounded-xl border p-3">
          <option value="">Pilih akun</option>
          {accounts.map(account => <option key={account.id} value={account.id}>{account.full_name}</option>)}
        </select>
        <label htmlFor="staff-pin" className="block text-sm font-medium">PIN</label>
        <input id="staff-pin" type="password" inputMode="numeric" autoComplete="current-password" value={pin}
          onChange={event => setPin(event.target.value)} required className="w-full rounded-xl border p-3" />
        <button disabled={busy || !userId} className="w-full rounded-lg bg-blue-600 p-3 text-white disabled:opacity-50">{busy ? 'Memeriksa…' : 'Masuk'}</button>
      </form>}
    </div>
  </main>;
}
