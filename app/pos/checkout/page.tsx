'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePosStore } from '@/lib/store/usePosStore';
import { processTransaction } from '@/app/actions/transaction';
import { ArrowLeft, Banknote, CreditCard, QrCode, CheckCircle2, Printer, Loader2, Clock, FileText } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, currentShift, orderType, activeCustomer, notes, setNotes, clearCart, setActiveCustomer } = usePosStore();
  
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'card' | 'tempo'>('cash');
  const [cashGiven, setCashGiven] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [lastTxId, setLastTxId] = useState<string | null>(null);
  const [taxRate, setTaxRate] = useState(11);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('store_settings').select('tax_rate').limit(1).single();
      if (data) setTaxRate(data.tax_rate);
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    if (!currentShift) {
      router.push('/pos/shift');
    } else if (cart.length === 0 && !isSuccess) {
      router.push('/pos');
    }
  }, [currentShift, cart.length, isSuccess, router]);

  if (!currentShift || (cart.length === 0 && !isSuccess)) {
    return null;
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  const cashAmount = parseFloat(cashGiven || '0');
  const change = cashAmount - total;
  const isValidCash = paymentMethod !== 'cash' || cashAmount >= total;

  const handleQuickCash = (amount: number) => {
    setCashGiven((prev) => (parseFloat(prev || '0') + amount).toString());
  };

  const handleCheckout = async () => {
    if (paymentMethod === 'cash' && !isValidCash) return;

    setIsLoading(true);

    const payload = {
      shift_id: currentShift.id,
      cashier_id: currentShift.cashierId,
      customer_id: activeCustomer?.id || null,
      order_type: orderType,
      subtotal,
      tax,
      service_charge: 0,
      total,
      payment_method: paymentMethod,
      payment_status: paymentMethod === 'tempo' ? 'unpaid' : 'paid',
      due_date: paymentMethod === 'tempo' && dueDate ? dueDate : null,
      table_number: notes || null, // Meminjam kolom table_number untuk menyimpan Catatan/Nama Pelanggan Baru
      items: cart
    };

    const res = await processTransaction(payload);
    setIsLoading(false);

    if (res.success) {
      setLastTxId(res.transaction?.id);
      setIsSuccess(true);
      clearCart();
      setActiveCustomer(null);
      setNotes('');
    } else {
      alert(res.error || 'Terjadi kesalahan saat memproses pembayaran');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const handlePrint = () => {
    window.print();
  };

  const handlePrintSuratJalan = () => {
    // Di aplikasi nyata, ini bisa membuka window popup dengan layout surat jalan khusus
    alert("Mencetak Surat Jalan (Tanpa Harga)...");
    window.print();
  };

  if (isSuccess) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-50 print-bg-white">
        <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full text-center border border-slate-100 print-no-shadow print-p-0">
          <div className="mx-auto w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 print-hidden">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Pembayaran Berhasil</h2>
          <p className="text-slate-500 mb-8 font-mono text-sm">ID: {lastTxId}</p>

          <div className="bg-slate-50 p-6 rounded-2xl mb-8 text-left border border-slate-100 print-border-black print-bg-white">
            <h3 className="font-bold text-lg mb-4 pb-2 border-b border-slate-200">Struk Pesanan</h3>
            <div className="space-y-3 font-mono text-sm mb-4">
              {/* Ini hanya preview struk ringan */}
              <div className="flex justify-between text-slate-500">
                <span>Metode</span>
                <span className="uppercase font-semibold text-slate-800">{paymentMethod}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Total Tagihan</span>
                <span className="font-semibold text-slate-800">{formatPrice(total)}</span>
              </div>
              {paymentMethod === 'cash' && (
                <>
                  <div className="flex justify-between text-slate-500">
                    <span>Tunai</span>
                    <span>{formatPrice(cashAmount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-800 pt-2 border-t border-dashed border-slate-300">
                    <span>Kembalian</span>
                    <span>{formatPrice(change)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 print-hidden">
            <button
              onClick={handlePrint}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-medium py-3 rounded-xl transition-colors shadow-sm"
            >
              <Printer size={20} /> Cetak Faktur (PDF)
            </button>
            <button
              onClick={handlePrintSuratJalan}
              className="w-full flex items-center justify-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium py-3 rounded-xl transition-colors shadow-sm"
            >
              <FileText size={20} /> Cetak Surat Jalan
            </button>
            <button
              onClick={() => router.push('/pos')}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-xl transition-colors mt-2"
            >
              Pesanan Baru
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-slate-50">
      {/* Left: Summary */}
      <div className="w-1/2 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center gap-4 bg-slate-50">
          <button 
            onClick={() => router.push('/pos')}
            className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Detail Pembayaran</h1>
            <p className="text-sm text-slate-500">
              {cart.length} item • {orderType === 'delivery' ? 'Kirim' : 'Ambil Sendiri'} 
              {activeCustomer ? ` • ${activeCustomer.name}` : notes ? ` • Baru: ${notes}` : ''}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
          {cart.map(item => (
            <div key={item.id} className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100">
              <div className="flex gap-4 items-center">
                <span className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-600 text-sm">
                  {item.quantity}x
                </span>
                <div>
                  <h3 className="font-semibold text-slate-800">{item.name}</h3>
                </div>
              </div>
              <span className="font-semibold text-slate-800">{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>

        <div className="p-6 bg-slate-800 text-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-slate-300">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Pajak ({taxRate}%)</span>
              <span>{formatPrice(tax)}</span>
            </div>
          </div>
          <div className="flex justify-between text-2xl font-bold">
            <span>Total Bayar</span>
            <span className="text-emerald-400">{formatPrice(total)}</span>
          </div>
        </div>
      </div>

      {/* Right: Payment Method */}
      <div className="w-1/2 p-8 flex flex-col justify-center max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Metode Pembayaran</h2>
        
        <div className="grid grid-cols-4 gap-3 mb-8">
          <button
            onClick={() => setPaymentMethod('cash')}
            className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-3 border-2 transition-all ${
              paymentMethod === 'cash' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white hover:border-blue-200 text-slate-600'
            }`}
          >
            <Banknote size={28} />
            <span className="font-semibold text-sm">Tunai</span>
          </button>
          <button
            onClick={() => setPaymentMethod('qris')}
            className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-3 border-2 transition-all ${
              paymentMethod === 'qris' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white hover:border-blue-200 text-slate-600'
            }`}
          >
            <QrCode size={28} />
            <span className="font-semibold text-sm">QRIS</span>
          </button>
          <button
            onClick={() => setPaymentMethod('card')}
            className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-3 border-2 transition-all ${
              paymentMethod === 'card' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white hover:border-blue-200 text-slate-600'
            }`}
          >
            <CreditCard size={28} />
            <span className="font-semibold text-sm">Kartu</span>
          </button>
          <button
            onClick={() => setPaymentMethod('tempo')}
            className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-3 border-2 transition-all ${
              paymentMethod === 'tempo' ? 'border-amber-600 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white hover:border-amber-200 text-slate-600'
            }`}
          >
            <Clock size={28} />
            <span className="font-semibold text-sm">Tempo</span>
          </button>
        </div>

        {paymentMethod === 'cash' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mb-8 animate-in fade-in slide-in-from-bottom-4">
            <label className="block text-sm font-semibold text-slate-700 mb-3">Nominal Uang Diterima</label>
            <div className="relative mb-6">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl">Rp</span>
              <input
                type="number"
                value={cashGiven}
                onChange={(e) => setCashGiven(e.target.value)}
                className="w-full pl-14 pr-4 py-4 text-2xl font-bold text-slate-800 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all"
                placeholder="0"
              />
            </div>
            
            <div className="grid grid-cols-4 gap-3 mb-6">
              {[10000, 20000, 50000, 100000].map(amt => (
                <button
                  key={amt}
                  onClick={() => handleQuickCash(amt)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-xl transition-colors"
                >
                  +{amt / 1000}k
                </button>
              ))}
            </div>

            <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="font-medium text-slate-500">Kembalian</span>
              <span className={`text-2xl font-bold ${change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {change >= 0 ? formatPrice(change) : 'Uang Kurang'}
              </span>
            </div>
          </div>
        )}

        {paymentMethod === 'tempo' && (
          <div className="bg-amber-50 p-6 rounded-3xl border border-amber-200 shadow-sm mb-8 animate-in fade-in slide-in-from-bottom-4">
            <label className="block text-sm font-semibold text-amber-900 mb-3">Tenggat Waktu / Janji Bayar</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-4 text-xl font-bold text-slate-800 bg-white border-2 border-amber-200 rounded-2xl focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 transition-all"
            />
            <p className="text-amber-700 text-sm mt-3 flex gap-2">
              <Clock size={16} className="mt-0.5 shrink-0"/>
              Kosongkan jika tenggat waktu bayar fleksibel. Jika diisi, sistem akan menandai faktur ini jatuh tempo pada tanggal yang dipilih.
            </p>
          </div>
        )}

        <button
          onClick={handleCheckout}
          disabled={isLoading || (paymentMethod === 'cash' && !isValidCash)}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold py-5 rounded-2xl text-lg shadow-lg shadow-blue-600/30 active:scale-[0.98] transition-all"
        >
          {isLoading ? <Loader2 className="animate-spin" size={24} /> : 'Proses Pembayaran'}
        </button>
      </div>
    </div>
  );
}
