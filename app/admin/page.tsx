'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Banknote, CreditCard, TrendingUp, ShoppingBag, Loader2 } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminDashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    grossSales: 0,
    netSales: 0,
    totalTransactions: 0,
    averageTicket: 0
  });

  useEffect(() => {
    // Auth Check
    const authStr = sessionStorage.getItem('admin_auth');
    if (!authStr) {
      router.push('/admin/login');
      return;
    }

    const fetchStats = async () => {
      try {
        // Ambil transaksi hari ini (sederhana)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
          .from('transactions')
          .select('total, subtotal, tax')
          .gte('created_at', today.toISOString())
          .eq('status', 'paid');

        if (error) throw error;

        if (data) {
          const gross = data.reduce((sum, tx) => sum + tx.total, 0);
          const net = data.reduce((sum, tx) => sum + tx.subtotal, 0);
          const count = data.length;
          
          setStats({
            grossSales: gross,
            netSales: net,
            totalTransactions: count,
            averageTicket: count > 0 ? gross / count : 0
          });
        }
      } catch (err) {
        console.error('Gagal mengambil data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [router]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard Analitik</h1>
        <p className="text-slate-500">Ringkasan performa bisnis Anda hari ini.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center gap-3 text-slate-500 mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Banknote size={20} />
            </div>
            <span className="font-medium">Penjualan Kotor</span>
          </div>
          <div className="text-3xl font-bold text-slate-800">{formatPrice(stats.grossSales)}</div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center gap-3 text-slate-500 mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp size={20} />
            </div>
            <span className="font-medium">Penjualan Bersih</span>
          </div>
          <div className="text-3xl font-bold text-slate-800">{formatPrice(stats.netSales)}</div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center gap-3 text-slate-500 mb-4">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <ShoppingBag size={20} />
            </div>
            <span className="font-medium">Total Transaksi</span>
          </div>
          <div className="text-3xl font-bold text-slate-800">{stats.totalTransactions}</div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center gap-3 text-slate-500 mb-4">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <CreditCard size={20} />
            </div>
            <span className="font-medium">Rata-rata Transaksi</span>
          </div>
          <div className="text-3xl font-bold text-slate-800">{formatPrice(stats.averageTicket)}</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Aktivitas Terbaru</h2>
        <div className="h-40 flex items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          Grafik Tren Penjualan Akan Tampil Di Sini
        </div>
      </div>
    </div>
  );
}
