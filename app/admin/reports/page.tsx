'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { FileText, Loader2, Calendar } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminReports() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const authStr = sessionStorage.getItem('admin_auth');
    if (!authStr) {
      router.push('/admin/login');
      return;
    }
    fetchTransactions();
  }, [router]);

  const fetchTransactions = async () => {
    setIsLoading(true);
    // Mengambil transaksi terbaru dengan relasi kasir (jika Supabase foreign key di-setup dgn baik)
    const { data, error } = await supabase
      .from('transactions')
      .select('*, users(full_name)')
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (!error && data) {
      setTransactions(data);
    }
    setIsLoading(false);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };
  
  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Laporan Transaksi</h1>
          <p className="text-slate-500">Riwayat transaksi penjualan (50 transaksi terakhir).</p>
        </div>
        <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm">
          <Calendar size={18} />
          Pilih Tanggal
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                  <th className="font-medium p-4 pl-6">Tanggal & Waktu</th>
                  <th className="font-medium p-4">ID Transaksi</th>
                  <th className="font-medium p-4">Kasir</th>
                  <th className="font-medium p-4">Metode</th>
                  <th className="font-medium p-4">Tipe</th>
                  <th className="font-medium p-4 text-right pr-6">Total Tagihan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 pl-6 text-slate-600">{formatDate(tx.created_at)}</td>
                    <td className="p-4 font-mono text-slate-400 text-xs">
                      {tx.id.split('-')[0]}...
                    </td>
                    <td className="p-4 text-slate-700 font-medium">
                      {tx.users ? tx.users.full_name : 'Unknown'}
                    </td>
                    <td className="p-4">
                      <span className="uppercase text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                        {tx.payment_method}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="capitalize text-xs font-medium text-slate-600">
                        {tx.order_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right font-bold text-emerald-600">
                      {formatPrice(tx.total)}
                    </td>
                  </tr>
                ))}
                
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      Belum ada transaksi.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
