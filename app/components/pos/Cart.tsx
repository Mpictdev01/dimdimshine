'use client';

import { usePosStore } from '@/lib/store/usePosStore';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Cart() {
  const { cart, removeFromCart, updateQuantity, clearCart, orderType } = usePosStore();
  const router = useRouter();
  
  const [taxRate, setTaxRate] = useState(11); // Default 11%

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('store_settings').select('tax_rate').limit(1).single();
      if (data) setTaxRate(data.tax_rate);
    };
    fetchSettings();
  }, []);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

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
    <div className="flex flex-col h-full bg-white border-l border-slate-200">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <h2 className="font-bold text-slate-800">Pesanan Saat Ini</h2>
        <button 
          onClick={clearCart}
          className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center gap-1 transition-colors"
        >
          <Trash2 size={16} /> Kosongkan
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {cart.map((item) => (
          <div key={item.id} className="flex flex-col p-3 border border-slate-100 rounded-xl bg-slate-50/50">
            <div className="flex justify-between mb-2">
              <span className="font-medium text-slate-800 line-clamp-1 flex-1 pr-2">{item.name}</span>
              <span className="font-semibold text-slate-800">{formatPrice(item.price * item.quantity)}</span>
            </div>
            {item.modifiers && Object.keys(item.modifiers).length > 0 && (
              <div className="text-xs text-slate-500 mb-2">
                {Object.entries(item.modifiers).map(([k, v]) => `${k}: ${v}`).join(', ')}
              </div>
            )}
            <div className="flex justify-between items-center mt-1">
              <div className="text-sm text-slate-500">{formatPrice(item.price)} / item</div>
              <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-1">
                <button 
                  onClick={() => item.quantity > 1 ? updateQuantity(item.id, item.quantity - 1) : removeFromCart(item.id)}
                  className="w-7 h-7 flex items-center justify-center rounded bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-95 transition-all"
                >
                  <Minus size={14} />
                </button>
                <span className="w-4 text-center font-semibold text-sm">{item.quantity}</span>
                <button 
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="w-7 h-7 flex items-center justify-center rounded bg-blue-100 text-blue-700 hover:bg-blue-200 active:scale-95 transition-all"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-slate-100 bg-white">
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
        <button 
          onClick={() => router.push('/pos/checkout')}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-md active:scale-[0.98]"
        >
          Bayar
        </button>
      </div>
    </div>
  );
}
