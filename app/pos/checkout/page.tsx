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
  
  const [paymentMethod, setPaymentMethod] = useState<'lunas' | 'tempo'>('lunas');
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

  const handleCheckout = async () => {

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
      <div className="flex h-full w-full items-center justify-center bg-slate-100 print-bg-white p-4">
        <div className="bg-white p-6 sm:p-10 rounded-3xl shadow-2xl max-w-md w-full text-center border border-slate-100 print-no-shadow print-p-0 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-emerald-400 to-teal-500 print-hidden"></div>
          <div className="mx-auto w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6 print-hidden shadow-inner ring-8 ring-emerald-50/50">
            <CheckCircle2 size={48} className="animate-in zoom-in duration-500" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-800 mb-2 tracking-tight">Pembayaran Berhasil</h2>
          <p className="text-slate-400 mb-8 font-mono text-sm tracking-wider">TX ID: {lastTxId}</p>

          <div className="bg-slate-50/80 p-6 rounded-2xl mb-8 text-left border border-slate-100 print-border-black print-bg-white relative">
            {/* Perforated edge effect */}
            <div className="absolute -top-3 left-0 w-full flex justify-between px-2 print-hidden opacity-30">
              {[...Array(12)].map((_, i) => <div key={i} className="w-3 h-3 rounded-full bg-white shadow-sm"></div>)}
            </div>
            
            <h3 className="font-bold text-lg mb-4 pb-3 border-b border-dashed border-slate-300 text-slate-700 flex justify-between items-end">
              Struk Pesanan
              <span className="text-xs font-normal text-slate-400 uppercase tracking-wider">{paymentMethod}</span>
            </h3>
            
            <div className="space-y-3 text-sm mb-4">
              <div className="flex justify-between text-slate-500">
                <span>Total Tagihan</span>
                <span className="font-semibold text-slate-800">{formatPrice(total)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 print-hidden">
            <button
              onClick={handlePrint}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3.5 rounded-xl transition-all shadow-md active:scale-[0.98]"
            >
              <Printer size={20} /> Cetak Struk
            </button>
            <div className="flex gap-3">
              <button
                onClick={handlePrintSuratJalan}
                className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3.5 rounded-xl transition-all active:scale-[0.98]"
              >
                <FileText size={18} /> Surat Jalan
              </button>
              <button
                onClick={() => router.push('/pos')}
                className="w-full flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-3.5 rounded-xl transition-all active:scale-[0.98]"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-slate-50 custom-scrollbar">
      <div className="flex flex-col lg:flex-row min-h-full w-full">
        {/* Left: Summary */}
        <div className="w-full lg:w-[45%] bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800 text-slate-200 flex flex-col">
          <div className="p-6 border-b border-slate-800/60 flex items-center gap-4 bg-slate-900/95 sticky top-0 z-10 backdrop-blur-md shadow-sm">
          <button 
            onClick={() => router.push('/pos')}
            className="w-10 h-10 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Detail Pembayaran</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              <span className="inline-flex items-center justify-center bg-slate-800 px-2 py-0.5 rounded text-xs font-medium mr-2">{orderType === 'delivery' ? 'Kirim' : 'Ambil Sendiri'}</span>
              {cart.length} item {activeCustomer ? ` • ${activeCustomer.name}` : notes ? ` • Baru: ${notes}` : ''}
            </p>
          </div>
        </div>

        <div className="p-6 space-y-3 bg-slate-900 flex-1">
          {cart.map(item => (
            <div key={item.id} className="flex justify-between items-center bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50">
              <div className="flex gap-4 items-center">
                <span className="w-9 h-9 bg-slate-700 text-white rounded-xl flex items-center justify-center font-bold text-sm shadow-inner shrink-0">
                  {item.quantity}
                </span>
                <div>
                  <h3 className="font-semibold text-white">{item.name}</h3>
                  <p className="text-slate-400 text-xs mt-0.5">{formatPrice(item.price)} per unit</p>
                </div>
              </div>
              <span className="font-semibold text-white ml-2 shrink-0">{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>

        <div className="p-6 sm:p-8 bg-slate-950 border-t border-slate-800 sticky bottom-0 z-10">
          <div className="space-y-4 mb-6 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal</span>
              <span className="text-slate-300">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Pajak ({taxRate}%)</span>
              <span className="text-slate-300">{formatPrice(tax)}</span>
            </div>
          </div>
          <div className="flex justify-between items-end pt-4 border-t border-slate-800/80">
            <span className="text-slate-400 font-medium mb-1">Total Tagihan</span>
            <span className="text-3xl font-extrabold text-emerald-400 tracking-tight">{formatPrice(total)}</span>
          </div>
        </div>
      </div>

      {/* Right: Payment Method */}
      <div className="w-full lg:w-[55%] bg-white flex flex-col">
        <div className="p-6 sm:p-8 lg:p-12 max-w-3xl mx-auto w-full flex-1 flex flex-col">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 tracking-tight">Pilih Metode Pembayaran</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-10">
            <button
              onClick={() => setPaymentMethod('lunas')}
              className={`p-5 rounded-2xl flex flex-col items-center justify-center gap-3 border-2 transition-all duration-200 ${
                paymentMethod === 'lunas' 
                  ? 'border-blue-600 bg-blue-50/50 text-blue-700 shadow-md shadow-blue-100' 
                  : 'border-slate-100 bg-white hover:border-blue-200 hover:bg-slate-50 text-slate-500'
              }`}
            >
              <CheckCircle2 size={32} strokeWidth={paymentMethod === 'lunas' ? 2.5 : 2} />
              <span className="font-semibold text-sm">Lunas</span>
            </button>
            <button
              onClick={() => setPaymentMethod('tempo')}
              className={`p-5 rounded-2xl flex flex-col items-center justify-center gap-3 border-2 transition-all duration-200 ${
                paymentMethod === 'tempo' 
                  ? 'border-amber-500 bg-amber-50/50 text-amber-700 shadow-md shadow-amber-100' 
                  : 'border-slate-100 bg-white hover:border-amber-200 hover:bg-slate-50 text-slate-500'
              }`}
            >
              <Clock size={32} strokeWidth={paymentMethod === 'tempo' ? 2.5 : 2} />
              <span className="font-semibold text-sm text-center">Tempo<br className="hidden sm:block"/>(Piutang)</span>
            </button>
          </div>



          {paymentMethod === 'tempo' && (
            <div className="bg-amber-50/50 p-6 sm:p-8 rounded-3xl border border-amber-100 shadow-sm mb-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <label className="block text-sm font-semibold text-amber-900 mb-4">Tenggat Waktu / Janji Bayar (Opsional)</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-6 py-5 text-xl font-bold text-slate-800 bg-white border-2 border-amber-200 rounded-2xl focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all shadow-sm"
              />
              <div className="mt-4 flex gap-3 p-4 bg-amber-100/50 rounded-xl text-amber-800">
                <Clock size={20} className="shrink-0 text-amber-600"/>
                <p className="text-sm leading-relaxed">
                  Kosongkan jika tenggat waktu bayar fleksibel. Jika diisi, sistem akan otomatis menandai faktur ini jatuh tempo pada tanggal yang dipilih.
                </p>
              </div>
            </div>
          )}

          <div className="mt-auto pt-8">
            <button
              onClick={handleCheckout}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-5 rounded-2xl text-xl shadow-xl shadow-blue-600/20 active:scale-[0.98] transition-all disabled:shadow-none"
            >
              {isLoading ? <Loader2 className="animate-spin" size={28} /> : 'Proses Pembayaran'}
            </button>
            <p className="text-center text-slate-400 text-sm mt-4 pb-8 lg:pb-0">
              Pastikan data pesanan dan nominal sudah sesuai sebelum memproses.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
