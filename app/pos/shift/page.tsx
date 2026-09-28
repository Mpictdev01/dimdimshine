'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { activeShift, openShift } from '@/app/actions/shift';
import { currentSession, listStaffAccounts, loginAccount, logoutAccount } from '@/app/actions/auth';
import { usePosStore } from '@/lib/store/usePosStore';

export default function ShiftPage() {
  const router = useRouter();
  const { setShift, endShift } = usePosStore();
  const [accounts, setAccounts] = useState<{id:string; full_name:string}[]>([]);
  const [userId, setUserId] = useState('');
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [startingCash, setStartingCash] = useState('0');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    listStaffAccounts().then(setAccounts).catch(() => setError('Daftar akun gagal dimuat. Coba muat ulang.'));
    currentSession().then(async active => {
      if (!active) { endShift(); return; }
      if (active.mustChangePin) { router.replace('/change-pin'); return; }
      setName(active.fullName);
      const shift = await activeShift();
      if (shift) { setShift(shift); router.replace('/pos'); }
      else endShift();
    }).catch(() => setError('Sesi tidak dapat diperiksa. Coba muat ulang.'));
  }, [router, setShift, endShift]);
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
    const result = await openShift(Number(startingCash));
    setBusy(false);
    if (!result.success) { setError(result.error); return; }
    setShift({ id: result.shift.id, cashierId: result.user.userId, cashierName: result.user.fullName,
      startTime: result.shift.start_time, startingCash: Number(result.shift.starting_cash) });
    router.replace('/pos');
  }
  return <main className="flex h-full items-center justify-center bg-slate-50 p-4">
    <div className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-xl space-y-5">
      <h1 className="text-2xl font-bold">{name ? 'Buka Shift' : 'Login POS'}</h1>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {name ? <form onSubmit={start} className="space-y-4">
        <p className="text-sm text-slate-600">Kasir: {name}</p>
        <label htmlFor="starting-cash" className="block text-sm font-medium">Kas tunai awal (Rp)</label>
        <input id="starting-cash" type="number" min="0" step="1" value={startingCash}
          onChange={event => setStartingCash(event.target.value)} required className="w-full rounded-lg border p-3" />
        <button disabled={busy} className="w-full rounded-lg bg-blue-600 p-3 text-white disabled:opacity-50">{busy ? 'Membuka…' : 'Buka shift'}</button>
        <button type="button" onClick={async () => { await logoutAccount(); setName(''); endShift(); }} className="w-full text-sm text-slate-500">Ganti akun</button>
      </form> : <form onSubmit={login} className="space-y-4">
        <label htmlFor="staff-account" className="block text-sm font-medium">Akun staf</label>
        <select id="staff-account" value={userId} onChange={event => setUserId(event.target.value)} required className="w-full rounded-lg border p-3">
          <option value="">Pilih akun</option>
          {accounts.map(account => <option key={account.id} value={account.id}>{account.full_name}</option>)}
        </select>
        <label htmlFor="staff-pin" className="block text-sm font-medium">PIN</label>
        <input id="staff-pin" type="password" inputMode="numeric" autoComplete="current-password" value={pin}
          onChange={event => setPin(event.target.value)} required className="w-full rounded-lg border p-3" />
        <button disabled={busy || !userId} className="w-full rounded-lg bg-blue-600 p-3 text-white disabled:opacity-50">{busy ? 'Memeriksa…' : 'Masuk'}</button>
      </form>}
    </div>
  </main>;
}
