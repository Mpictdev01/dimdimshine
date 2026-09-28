'use client';

import { usePosStore } from '@/lib/store/usePosStore';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { quoteSale } from '@/app/actions/transaction';

export default function Cart() {
  const { cart, removeFromCart, updateQuantity, clearCart } = usePosStore();
  const router = useRouter();
  
  const [quoteRecord, setQuoteRecord] = useState<{ key:string; quote:{ subtotal:number; tax:number; total:number; taxRate:number;
    items: { productId: string; name: string; quantity: number; price: number }[] } } | null>(null);
  const [quoteError, setQuoteError] = useState('');

  const cartKey = cart.map(item => `${item.id}:${item.quantity}`).join('|');
  useEffect(() => {
    if (!cart.length) return;
    let cancelled = false;
    quoteSale(cart.map(item => ({ productId: item.productId, quantity: item.quantity }))).then(result => {
      if (cancelled) return;
      if (result.success) { setQuoteRecord({ key: cartKey, quote: result.quote }); setQuoteError(''); }
      else { setQuoteRecord(null); setQuoteError(result.error); }
    });
    return () => { cancelled = true; };
  }, [cart, cartKey]);

  const quote = quoteRecord?.key === cartKey ? quoteRecord.quote : null;
  const subtotal = Number(quote?.subtotal ?? 0);
  const tax = Number(quote?.tax ?? 0);
  const total = Number(quote?.total ?? 0);
  const taxRate = Number(quote?.taxRate ?? 0);
  const quoteItems = new Map(quote?.items.map(item => [item.productId, item]) ?? []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6">
        <ShoppingBag size={48} className="mb-4 opacity-50" />
        <p className="font-medium">Keranjang masih kosong</p>
        <p className="text-sm mt-2 text-center">Pilih produk dari menu untuk menambahkan ke pesanan.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200 relative">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <h2 className="font-bold text-slate-800">Pesanan Saat Ini</h2>
        <button 
          onClick={() => { if (window.confirm('Kosongkan semua isi keranjang?')) clearCart(); }}
          className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center gap-1 transition-colors"
        >
          <Trash2 size={16} /> Kosongkan
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {cart.map((item) => {
          const priced = quoteItems.get(item.productId);
          return <div key={item.id} className="flex flex-col p-3 border border-slate-100 rounded-xl bg-slate-50/50">
            <div className="flex justify-between mb-2">
              <span className="font-medium text-slate-800 line-clamp-1 flex-1 pr-2">{priced?.name ?? item.name}</span>
              <span className="font-semibold text-slate-800">{priced ? formatPrice(Number(priced.price) * item.quantity) : 'Menghitung...'}</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <div className="text-sm text-slate-500">{priced ? formatPrice(Number(priced.price)) : 'Menghitung...'} / item</div>
              <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-1">
                <button 
                  onClick={() => item.quantity > 1 ? updateQuantity(item.id, item.quantity - 1) : removeFromCart(item.id)}
                  aria-label={`Kurangi ${item.name}`}
                  className="w-7 h-7 flex items-center justify-center rounded bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-95 transition-all"
                >
                  <Minus size={14} />
                </button>
                <input
                  type="number"
                  aria-label={`Jumlah ${item.name}`}
                  min="1"
                  value={item.quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val > 0) updateQuantity(item.id, val);
                  }}
                  className="w-12 h-7 text-center font-semibold text-sm border border-slate-200 focus:ring-2 focus:ring-blue-500 rounded bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button 
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  aria-label={`Tambah ${item.name}`}
                  className="w-7 h-7 flex items-center justify-center rounded bg-blue-100 text-blue-700 hover:bg-blue-200 active:scale-95 transition-all"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>;
        })}

      </div>

      <div className="p-4 border-t border-slate-100 bg-white shadow-[0_-4px_15px_rgba(0,0,0,0.03)] z-10">
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-slate-500 text-sm">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-500 text-sm">
            <span>Pajak ({taxRate}%)</span>
            <span>{formatPrice(tax)}</span>
          </div>
          <div className="border-t border-dashed my-2 pt-2 flex justify-between font-bold text-lg text-slate-800">
            <span>Total</span>
            <span className="text-blue-600">{formatPrice(total)}</span>
          </div>
        </div>
        
        {quoteError && <p role="alert" className="mb-3 text-sm text-red-700">{quoteError}</p>}
        <button 
          onClick={() => router.push('/pos/checkout')}
          disabled={!quote}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold py-4 rounded-xl transition-all shadow-md active:scale-[0.98]"
        >
          Lanjut Pembayaran
        </button>
      </div>
    </div>
  );
}
