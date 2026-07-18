'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Loader2 } from 'lucide-react';
import { loginWithPin } from '@/app/actions/shift';

export default function AdminLoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Jika sudah login, redirect
  useEffect(() => {
    if (sessionStorage.getItem('admin_auth')) {
      router.push('/admin');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) return;
    
    setIsLoading(true);
    setError('');
    
    const res = await loginWithPin(pin);
    setIsLoading(false);
    
    if (res.success && res.user) {
      if (res.user.role === 'super_admin' || res.user.role === 'manager') {
        sessionStorage.setItem('admin_auth', JSON.stringify(res.user));
        router.push('/admin');
      } else {
        setError('Akses ditolak. Anda tidak memiliki izin Admin.');
      }
    } else {
      setError(res.error || 'PIN tidak valid');
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-900 absolute inset-0 z-50">
      <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">DIMDIM SHINE <span className="text-blue-600">Admin</span></h1>
          <p className="text-slate-500 mt-2 text-sm">Masukkan PIN Manager/Admin</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-6 border border-red-100 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <KeyRound size={20} />
            </div>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN (misal: 9999)"
              className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all"
              autoFocus
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading || !pin}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-bold py-3.5 rounded-xl transition-all shadow-sm"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Masuk ke Dashboard'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <button 
            onClick={() => router.push('/pos/shift')}
            className="text-sm text-slate-500 hover:text-blue-600 transition-colors"
          >
            Kembali ke Aplikasi POS
          </button>
        </div>
      </div>
    </div>
  );
}
