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

interface CompletedTransaction {
  id: string;
  total: number;
  subtotal: number;
  tax: number;
  paymentMethod: string;
  orderType: string;
  items: { name: string; quantity: number; price: number }[];
}

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, currentShift, orderType, notes, setNotes, clearCart } = usePosStore();
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris'>('cash');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [lastTxId, setLastTxId] = useState<string | null>(null);
  const [completedTx, setCompletedTx] = useState<CompletedTransaction | null>(null);
  const [taxRate, setTaxRate] = useState(11);
  const [storeInfo, setStoreInfo] = useState({ name: 'DIMDIM SHINE POS', address: '' });

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('store_settings').select('store_name, address, tax_rate').limit(1).single();
      if (data) {
        if (data.tax_rate !== undefined) setTaxRate(data.tax_rate);
        if (data.store_name) setStoreInfo({ name: data.store_name, address: data.address || '' });
      }
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
      customer_id: null,
      order_type: orderType,
      subtotal,
      tax,
      service_charge: 0,
      total,
      payment_method: paymentMethod,
      payment_status: 'paid',
      due_date: null,
      table_number: notes || null,
      items: cart
    };

    const res = await processTransaction(payload);
    setIsLoading(false);

    if (res.success) {
      const txId = res.transaction?.id || '';
      setLastTxId(txId);
      setCompletedTx({
        id: txId,
        total,
        subtotal,
        tax,
        paymentMethod,
        orderType,
        items: cart.map(i => ({ name: i.name, quantity: i.quantity, price: i.price }))
      });
      setIsSuccess(true);
      clearCart();
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

  if (isSuccess && completedTx) {
    return (
      <>
        {/* Printable 58mm Thermal Receipt (Only visible on print) */}
        <div className="hidden print:block thermal-receipt font-mono text-[10px] text-black">
          <div className="text-center font-bold text-[12px] uppercase">{storeInfo.name}</div>
          {storeInfo.address && <div className="text-center text-[9px] mb-1">{storeInfo.address}</div>}
          <div className="text-center my-1">================================</div>
          <div className="flex justify-between">
            <span>Tgl: {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
            <span>Jam: {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="truncate">Tx : {completedTx.id}</div>
          <div>Kasir: {currentShift?.cashierName || 'Sales'}</div>
          <div>Order: {completedTx.orderType === 'delivery' ? 'KIRIM' : 'AMBIL'} ({completedTx.paymentMethod.toUpperCase()})</div>
          <div className="text-center my-1">--------------------------------</div>
          
          <div className="space-y-1">
            {completedTx.items.map((item, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="font-bold">{item.name}</div>
                <div className="flex justify-between pl-2">
                  <span>{item.quantity} x {formatPrice(item.price)}</span>
                  <span className="font-bold">{formatPrice(item.price * item.quantity)}</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center my-1">--------------------------------</div>
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatPrice(completedTx.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Pajak ({taxRate}%)</span>
            <span>{formatPrice(completedTx.tax)}</span>
          </div>
          <div className="text-center my-1">--------------------------------</div>
          <div className="flex justify-between font-bold text-[11px]">
            <span>TOTAL</span>
            <span>{formatPrice(completedTx.total)}</span>
          </div>
          <div className="text-center my-1">================================</div>
          <div className="text-center text-[9px] mt-2 font-sans font-medium">
            *** TERIMA KASIH ***<br/>
            Selamat Menikmati
          </div>
        </div>

        {/* Screen View (Hidden when printing) */}
        <div className="flex h-full w-full items-center justify-center bg-slate-100 print:hidden p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl max-w-md w-full text-center border border-slate-100 relative overflow-hidden my-auto max-h-[calc(100vh-1rem)] flex flex-col">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
            
            <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-2 shrink-0 shadow-inner ring-4 ring-emerald-50/50">
              <CheckCircle2 size={28} className="animate-in zoom-in duration-500 sm:w-8 sm:h-8" />
            </div>
            
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight shrink-0">Pembayaran Berhasil</h2>
            <p className="text-slate-400 mb-3 font-mono text-[11px] sm:text-xs tracking-wider truncate shrink-0 px-2" title={completedTx.id}>
              TX ID: {completedTx.id}
            </p>

            <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl mb-3 text-left border border-slate-100 relative flex-1 flex flex-col min-h-0 overflow-hidden">
              <h3 className="font-bold text-sm sm:text-base mb-2 pb-2 border-b border-dashed border-slate-300 text-slate-700 flex justify-between items-center shrink-0">
                <span>Struk Pesanan</span>
                <span className="text-[11px] font-normal text-slate-400 uppercase tracking-wider">{completedTx.paymentMethod === 'cash' ? 'Tunai' : 'QRIS'} • {completedTx.orderType === 'delivery' ? 'Kirim' : 'Ambil'}</span>
              </h3>
              
              <div className="border-b border-slate-200 pb-2 mb-2 space-y-1.5 overflow-y-auto flex-1 pr-1 custom-scrollbar min-h-[40px]">
                {completedTx.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs sm:text-sm">
                    <span className="font-medium text-slate-700 truncate pr-2">{item.quantity}x {item.name}</span>
                    <span className="font-semibold text-slate-800 shrink-0">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-xs sm:text-sm shrink-0 pt-1">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span>{formatPrice(completedTx.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Pajak ({taxRate}%)</span>
                  <span>{formatPrice(completedTx.tax)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm sm:text-base text-slate-800 pt-1.5 border-t border-dashed border-slate-300">
                  <span>Total Tagihan</span>
                  <span className="text-emerald-600">{formatPrice(completedTx.total)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 shrink-0">
              <button
                onClick={handlePrint}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm transition-all shadow-md active:scale-[0.98]"
              >
                <Printer size={16} /> Cetak Struk (58mm)
              </button>
              <button
                onClick={() => router.push('/pos')}
                className="w-full flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm transition-all active:scale-[0.98]"
              >
                Selesai & Kembali ke POS
              </button>
            </div>
          </div>
        </div>
      </>
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
              {cart.length} item {notes ? ` • Catatan: ${notes}` : ''}
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
              onClick={() => setPaymentMethod('cash')}
              className={`p-5 rounded-2xl flex flex-col items-center justify-center gap-3 border-2 transition-all duration-200 ${
                paymentMethod === 'cash' 
                  ? 'border-blue-600 bg-blue-50/50 text-blue-700 shadow-md shadow-blue-100' 
                  : 'border-slate-100 bg-white hover:border-blue-200 hover:bg-slate-50 text-slate-500'
              }`}
            >
              <Banknote size={32} strokeWidth={paymentMethod === 'cash' ? 2.5 : 2} />
              <span className="font-semibold text-sm">Tunai</span>
            </button>
            <button
              onClick={() => setPaymentMethod('qris')}
              className={`p-5 rounded-2xl flex flex-col items-center justify-center gap-3 border-2 transition-all duration-200 ${
                paymentMethod === 'qris' 
                  ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700 shadow-md shadow-emerald-100' 
                  : 'border-slate-100 bg-white hover:border-emerald-200 hover:bg-slate-50 text-slate-500'
              }`}
            >
              <QrCode size={32} strokeWidth={paymentMethod === 'qris' ? 2.5 : 2} />
              <span className="font-semibold text-sm text-center">QRIS</span>
            </button>
          </div>

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
