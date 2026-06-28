'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Coins, ArrowRight, Loader2, LogOut } from 'lucide-react';
import { loginWithPin, openShift } from '@/app/actions/shift';
import { usePosStore } from '@/lib/store/usePosStore';

export default function ShiftPage() {
  const router = useRouter();
  const { setShift, currentShift, endShift } = usePosStore();
  
  const [step, setStep] = useState<'pin' | 'cash'>(currentShift ? 'cash' : 'pin');
  const [pin, setPin] = useState('');
  const [startingCash, setStartingCash] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cashierUser, setCashierUser] = useState<{id: string; full_name: string} | null>(null);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) return;
    
    setIsLoading(true);
    setError('');
    
    const res = await loginWithPin(pin);
    setIsLoading(false);
    
    if (res.success && res.user) {
      setCashierUser(res.user);
      setStep('cash');
      setPin('');
    } else {
      setError(res.error || 'Login gagal');
    }
  };

  const handleCashSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startingCash || !cashierUser) return;
    
    setIsLoading(true);
    setError('');
    
    const cashAmount = parseFloat(startingCash);
    const res = await openShift(cashierUser.id, cashAmount);
    
    setIsLoading(false);
    
    if (res.success && res.shift) {
      setShift({
        id: res.shift.id,
        cashierId: cashierUser.id,
        cashierName: cashierUser.full_name,
        startTime: res.shift.start_time,
        startingCash: cashAmount
      });
      router.push('/pos');
    } else {
      setError(res.error || 'Gagal membuka shift');
    }
  };

  const handleLogout = () => {
    setCashierUser(null);
    setStep('pin');
    endShift();
  };

  if (currentShift) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <Coins size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Shift Aktif</h2>
          <p className="text-slate-500 mb-8">Kasir: <span className="font-semibold">{currentShift.cashierName}</span></p>
          
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push('/pos')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-colors"
            >
              Kembali ke POS
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-xl transition-colors"
            >
              <LogOut size={18} />
              Tutup / Keluar Shift
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-slate-100">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-800">
            {step === 'pin' ? 'Login Kasir' : 'Buka Shift'}
          </h2>
          <p className="text-slate-500 mt-2">
            {step === 'pin' 
              ? 'Masukkan PIN Anda untuk masuk ke sistem POS' 
              : `Halo, ${cashierUser?.full_name}. Masukkan modal awal hari ini.`}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 border border-red-100">
            {error}
          </div>
        )}

        {step === 'pin' ? (
          <form onSubmit={handlePinSubmit} className="space-y-6">
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <KeyRound size={20} />
                </div>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Masukkan PIN (misal: 1234)"
                  className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all"
                  autoFocus
                  required
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={isLoading || !pin}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-medium py-3.5 rounded-xl transition-all shadow-sm"
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Lanjutkan'}
              {!isLoading && <ArrowRight size={20} />}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCashSubmit} className="space-y-6">
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 font-medium">
                  Rp
                </div>
                <input
                  type="number"
                  value={startingCash}
                  onChange={(e) => setStartingCash(e.target.value)}
                  placeholder="0"
                  className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all"
                  autoFocus
                  required
                  min="0"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep('pin')}
                className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3.5 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isLoading || !startingCash}
                className="w-2/3 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white font-medium py-3.5 rounded-xl transition-all shadow-sm"
              >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Buka Shift'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
