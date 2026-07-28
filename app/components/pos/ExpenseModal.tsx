'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { usePosStore } from '@/lib/store/usePosStore';
import { createExpense, deleteExpense } from '@/app/actions/expense';
import { X, Loader2, Plus, Trash2, Wallet, Receipt, AlertCircle } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ExpenseModalProps {
  onClose: () => void;
}

interface Expense {
  id: string;
  amount: number;
  description: string;
  created_at: string;
}

export default function ExpenseModal({ onClose }: ExpenseModalProps) {
  const { currentShift } = usePosStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const fetchExpenses = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error: fetchError } = await supabase
        .from('expenses')
        .select('id, amount, description, created_at')
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      if (data) setExpenses(data);
    } catch (err) {
      console.error('Gagal mengambil data pengeluaran:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSubmit = async () => {
    setError('');

    const parsedAmount = parseFloat(amount.replace(/[^\d]/g, ''));
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Masukkan jumlah yang valid');
      return;
    }
    if (!description.trim()) {
      setError('Deskripsi tidak boleh kosong');
      return;
    }
    if (!currentShift) {
      setError('Tidak ada shift aktif');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createExpense(
        currentShift.id,
        currentShift.cashierId,
        parsedAmount,
        description.trim()
      );

      if (!result.success) {
        setError(result.error || 'Gagal mencatat pengeluaran');
        return;
      }

      // Reset form & refresh
      setAmount('');
      setDescription('');
      await fetchExpenses();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (expenseId: string) => {
    if (!confirm('Hapus pengeluaran ini?')) return;

    try {
      const result = await deleteExpense(expenseId);
      if (!result.success) {
        alert(result.error || 'Gagal menghapus');
        return;
      }
      await fetchExpenses();
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan');
    }
  };

  const handleAmountChange = (value: string) => {
    // Only allow digits
    const digits = value.replace(/[^\d]/g, '');
    if (digits === '') {
      setAmount('');
      return;
    }
    // Format with thousand separator
    const num = parseInt(digits, 10);
    setAmount(num.toLocaleString('id-ID'));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 p-4 flex items-center justify-between shrink-0 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Wallet className="text-amber-600" />
            Pengeluaran Hari Ini
          </h2>
          <p className="text-sm text-slate-500 mt-1 ml-[28px]">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="animate-spin text-amber-600 mb-4" size={48} />
            <p>Memuat data pengeluaran...</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6 md:space-y-8 pb-8">

            {/* Total Pengeluaran Card */}
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 rounded-2xl shadow-lg text-white">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Wallet size={20} />
                </div>
                <span className="font-semibold text-sm uppercase tracking-wide text-amber-100">Total Pengeluaran Hari Ini</span>
              </div>
              <div className="text-3xl font-black">
                {formatPrice(totalExpenses)}
              </div>
              <p className="text-sm text-amber-100 mt-2">
                {expenses.length} pengeluaran tercatat
              </p>
            </div>

            {/* Form Input */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
                <Plus className="text-amber-600" size={20} />
                <h3 className="font-bold text-slate-800">Tambah Pengeluaran</h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Jumlah (Rp) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500 font-semibold text-sm">Rp</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={amount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      placeholder="0"
                      className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-slate-50 focus:bg-white transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Deskripsi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Contoh: Bensin motor, Parkir, Makan siang..."
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-slate-50 focus:bg-white transition-colors"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isSubmitting) handleSubmit();
                    }}
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-4 py-3 rounded-xl border border-red-100">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !amount || !description.trim()}
                  className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                    isSubmitting || !amount || !description.trim()
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20'
                  }`}
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Plus size={18} />
                  )}
                  {isSubmitting ? 'Menyimpan...' : 'Tambah Pengeluaran'}
                </button>
              </div>
            </div>

            {/* Riwayat Pengeluaran */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
                <Receipt className="text-amber-600" size={20} />
                <h3 className="font-bold text-slate-800">Riwayat Hari Ini</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {expenses.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <Wallet size={36} className="mx-auto mb-2 opacity-40" />
                    <p className="font-medium">Belum ada pengeluaran hari ini.</p>
                  </div>
                ) : (
                  expenses.map((exp) => (
                    <div key={exp.id} className="flex items-center justify-between p-4 px-6 hover:bg-slate-50 transition-colors group">
                      <div className="flex-1 min-w-0 mr-4">
                        <p className="font-semibold text-slate-800 truncate">{exp.description}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {formatTime(exp.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-bold text-red-600 text-sm">
                          -{formatPrice(exp.amount)}
                        </span>
                        <button
                          onClick={() => handleDelete(exp.id)}
                          className="w-8 h-8 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                          title="Hapus pengeluaran"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
