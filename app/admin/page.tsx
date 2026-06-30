'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Banknote, TrendingUp, PackageSearch, AlertTriangle, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminDashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  
  const [stats, setStats] = useState({
    salesToday: 0,
    totalPiutang: 0,
    purchasesMonth: 0,
  });

  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);

  useEffect(() => {
    // Auth Check
    const authStr = sessionStorage.getItem('admin_auth');
    if (!authStr) {
      router.push('/admin/login');
      return;
    }

    const fetchDashboardData = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        // 1. Penjualan Hari Ini
        const { data: salesData } = await supabase
          .from('transactions')
          .select('total')
          .gte('created_at', today.toISOString());

        const salesToday = salesData?.reduce((sum, tx) => sum + tx.total, 0) || 0;

        // 2. Total Piutang Belum Lunas
        const { data: piutangData } = await supabase
          .from('transactions')
          .select('total')
          .eq('payment_status', 'unpaid');
          
        const totalPiutang = piutangData?.reduce((sum, tx) => sum + tx.total, 0) || 0;

        // 3. Pembelian Bulan Ini
        const { data: purchaseData } = await supabase
          .from('purchases')
          .select('total_amount')
          .gte('created_at', firstDayOfMonth.toISOString());
          
        const purchasesMonth = purchaseData?.reduce((sum, p) => sum + p.total_amount, 0) || 0;

        // 4. Produk Stok Menipis (Di bawah 20)
        const { data: lowStock } = await supabase
          .from('products')
          .select('*, units(name), categories(name)')
          .lt('stock', 20)
          .order('stock', { ascending: true })
          .limit(10);

        setStats({ salesToday, totalPiutang, purchasesMonth });
        if (lowStock) setLowStockProducts(lowStock);

      } catch (err) {
        console.error('Gagal mengambil data dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
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
    <div className="p-8 h-full overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard Utama</h1>
        <p className="text-slate-500">Pantau arus kas, piutang pelanggan, dan peringatan stok gudang.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 text-blue-50 opacity-50 group-hover:scale-110 transition-transform">
            <TrendingUp size={120} />
          </div>
          <div className="flex items-center gap-3 text-slate-600 mb-2 relative z-10">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <TrendingUp size={20} />
            </div>
            <span className="font-semibold text-sm uppercase tracking-wide">Penjualan Hari Ini</span>
          </div>
          <div className="text-3xl font-black text-slate-800 relative z-10">{formatPrice(stats.salesToday)}</div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 text-amber-50 opacity-50 group-hover:scale-110 transition-transform">
            <Banknote size={120} />
          </div>
          <div className="flex items-center gap-3 text-slate-600 mb-2 relative z-10">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
              <Banknote size={20} />
            </div>
            <span className="font-semibold text-sm uppercase tracking-wide">Piutang Berjalan</span>
          </div>
          <div className="text-3xl font-black text-slate-800 relative z-10">{formatPrice(stats.totalPiutang)}</div>
          <Link href="/admin/receivables" className="relative z-10 mt-3 text-sm text-amber-700 font-medium inline-flex items-center gap-1 hover:gap-2 transition-all">
            Lihat Detail Piutang <ArrowRight size={14} />
          </Link>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 text-emerald-50 opacity-50 group-hover:scale-110 transition-transform">
            <PackageSearch size={120} />
          </div>
          <div className="flex items-center gap-3 text-slate-600 mb-2 relative z-10">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <PackageSearch size={20} />
            </div>
            <span className="font-semibold text-sm uppercase tracking-wide">Pembelian (Bulan Ini)</span>
          </div>
          <div className="text-3xl font-black text-slate-800 relative z-10">{formatPrice(stats.purchasesMonth)}</div>
          <Link href="/admin/inventory/purchases" className="relative z-10 mt-3 text-sm text-emerald-700 font-medium inline-flex items-center gap-1 hover:gap-2 transition-all">
            Catat Barang Masuk <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Tabel Peringatan Stok */}
      <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
        <div className="p-5 border-b border-red-100 bg-red-50/50 flex items-center gap-3">
          <div className="p-2 bg-red-100 text-red-600 rounded-full">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-red-900">Peringatan Stok Menipis</h2>
            <p className="text-sm text-red-700">Produk-produk berikut memiliki sisa stok kurang dari 20. Segera lakukan restock ke pabrik!</p>
          </div>
        </div>
        
        <div className="p-0">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-slate-500 text-sm">
                <th className="font-medium p-4 pl-6">Nama Produk</th>
                <th className="font-medium p-4">Kategori</th>
                <th className="font-medium p-4 text-right">Harga Jual</th>
                <th className="font-medium p-4 text-center pr-6">Sisa Stok Fisik</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lowStockProducts.map((prod) => (
                <tr key={prod.id} className="hover:bg-red-50/30 transition-colors">
                  <td className="p-4 pl-6 font-semibold text-slate-800">
                    {prod.name}
                  </td>
                  <td className="p-4 text-slate-600 text-sm">
                    {prod.categories?.name || 'Uncategorized'}
                  </td>
                  <td className="p-4 text-right text-slate-600 font-medium">
                    {formatPrice(prod.price)}
                  </td>
                  <td className="p-4 pr-6 text-center">
                    <span className="inline-flex items-center justify-center min-w-[3rem] px-2 py-1 rounded-md text-sm font-bold bg-red-100 text-red-700 border border-red-200">
                      {prod.stock || 0}
                    </span>
                    <span className="text-xs text-slate-500 ml-1">{prod.units?.name}</span>
                  </td>
                </tr>
              ))}
              {lowStockProducts.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    <div className="inline-block p-3 bg-emerald-50 text-emerald-500 rounded-full mb-3">
                      <PackageSearch size={24} />
                    </div>
                    <p className="font-medium text-emerald-700">Semua stok produk Anda dalam kondisi aman!</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
