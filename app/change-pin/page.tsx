'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateOwnPin } from '@/app/actions/auth';

export default function ChangePinPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const result = await updateOwnPin(pin);
    setBusy(false);
    if (result.success) router.replace('/pos/shift');
    else setError(result.error);
  }
  return <main className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
    <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow space-y-4">
      <h1 className="text-xl font-bold">Ganti PIN</h1>
      <p className="text-sm text-slate-600">PIN baru harus 6–8 digit. Setelah diganti, silakan masuk kembali.</p>
      <label htmlFor="new-pin" className="block text-sm font-medium">PIN baru</label>
      <input id="new-pin" type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{6,8}" minLength={6} maxLength={8}
        value={pin} onChange={event => setPin(event.target.value)} required className="w-full rounded-lg border p-3" />
      {error && <p role="alert" className="text-red-700 text-sm">{error}</p>}
      <button disabled={busy} className="w-full rounded-lg bg-blue-600 p-3 text-white disabled:opacity-50">{busy ? 'Menyimpan…' : 'Simpan PIN'}</button>
    </form>
  </main>;
}
