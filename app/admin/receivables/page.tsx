'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Loader2, Search, CheckCircle, Clock } from 'lucide-react';

const isPast = (date: Date) => {
  const now = new Date();
  now.setHours(0,0,0,0);
  return date < now;
};

const isToday = (date: Date) => {
  const now = new Date();
  return date.getDate() === now.getDate() && 
         date.getMonth() === now.getMonth() && 
         date.getFullYear() === now.getFullYear();
};

const startOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(0,0,0,0);
  return d;
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(date);
};

const formatDateOnly = (date: Date) => {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).format(date);
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminReceivables() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchReceivables();
  }, []);

  const fetchReceivables = async () => {
    setIsLoading(true);
    // Ambil transaksi yang belum dibayar (Tempo)
    const { data, error } = await supabase
      .from('transactions')
      .select('*, customers(name, phone)')
      .eq('payment_status', 'unpaid')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTransactions(data);
    }
    setIsLoading(false);
  };

  const handleMarkAsPaid = async (txId: string) => {
    if (!confirm('Tandai faktur ini sebagai LUNAS? Pastikan Anda sudah menerima pembayaran.')) return;
    
    setIsProcessing(txId);
    const { error } = await supabase
      .from('transactions')
      .update({ payment_status: 'paid' })
      .eq('id', txId);

    if (!error) {
      setTransactions(transactions.filter(t => t.id !== txId));
    } else {
      alert('Gagal memperbarui status pembayaran.');
    }
    setIsProcessing(null);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
  };

  const filteredTransactions = transactions.filter(t => 
    t.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (t.customers?.name && t.customers.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalPiutang = transactions.reduce((sum, tx) => sum + tx.total, 0);

  return (
    <div className="p-4 md:p-8 h-full relative flex flex-col">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-end mb-4 md:mb-8 shrink-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">Manajemen Piutang</h1>
          <p className="text-slate-500 text-sm">Kelola tagihan pelanggan (Kasbon/Tempo) yang belum lunas.</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-6 py-3 rounded-2xl flex flex-col items-end self-start sm:self-auto w-full sm:w-auto">
          <span className="text-sm font-medium opacity-80">Total Piutang Berjalan</span>
          <span className="text-2xl font-bold">{formatPrice(totalPiutang)}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col flex-1 min-h-0">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div className="relative w-full sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Cari ID Faktur atau Nama Pelanggan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white shadow-sm z-10">
                <tr className="text-slate-500 text-sm border-b border-slate-200">
                  <th className="font-medium p-4 pl-6">Tanggal & ID</th>
                  <th className="font-medium p-4">Pelanggan</th>
                  <th className="font-medium p-4">Total Tagihan</th>
                  <th className="font-medium p-4">Status</th>
                  <th className="font-medium p-4 text-right pr-6">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="font-semibold text-slate-800">
                        {formatDate(new Date(tx.created_at))}
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-1">{tx.id.split('-')[0].toUpperCase()}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-800">{tx.customers?.name || 'Tanpa Nama'}</div>
                      {tx.customers?.phone && <div className="text-xs text-slate-500">{tx.customers.phone}</div>}
                    </td>
                    <td className="p-4 font-bold text-slate-800">
                      {formatPrice(tx.total)}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                          <Clock size={14} /> Belum Lunas
                        </span>
                        {tx.due_date && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            isPast(startOfDay(new Date(tx.due_date))) && !isToday(startOfDay(new Date(tx.due_date)))
                              ? 'bg-red-100 text-red-700' 
                              : 'text-slate-500'
                          }`}>
                            Jatuh Tempo: {formatDateOnly(new Date(tx.due_date))}
                            {isPast(startOfDay(new Date(tx.due_date))) && !isToday(startOfDay(new Date(tx.due_date))) && ' (Terlewat)'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <button 
                        onClick={() => handleMarkAsPaid(tx.id)}
                        disabled={isProcessing === tx.id}
                        className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold px-4 py-2 rounded-xl transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                      >
                        {isProcessing === tx.id ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                        Tandai Lunas
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-500">
                      <CheckCircle size={48} className="mx-auto mb-4 opacity-20 text-emerald-500" />
                      <p className="font-medium text-lg text-slate-700">Tidak ada piutang</p>
                      <p>Semua tagihan pelanggan saat ini telah dilunasi.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
