'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { X, Loader2, Search, Boxes } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface IngredientsStockModalProps {
  onClose: () => void;
}

export default function IngredientsStockModal({ onClose }: IngredientsStockModalProps) {
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchIngredients = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .order('name');

      if (error) throw error;
      if (data) setIngredients(data);
    } catch (err) {
      console.error('Gagal mengambil data bahan baku:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIngredients();
  }, []);

  const filteredIngredients = ingredients.filter(ing =>
    ing.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 p-4 flex items-center justify-between shrink-0 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Boxes className="text-blue-600" />
            Stok Bahan Baku
          </h2>
          <p className="text-sm text-slate-500 mt-1 ml-[28px]">
            Pantau sisa persediaan bahan baku secara real-time.
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
            <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
            <p>Memuat data stok bahan baku...</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6 pb-8">
            
            {/* Search Bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search size={18} />
              </div>
              <input
                type="text"
                placeholder="Cari nama bahan baku..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
            </div>

            {/* Ingredients Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm">
                    <tr>
                      <th className="p-4 pl-6 font-medium">Nama Bahan Baku</th>
                      <th className="p-4 pr-6 font-medium text-right">Jumlah Stok</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredIngredients.map(ing => {
                      const yieldQty = ing.yield_quantity || 1;
                      const stockInPurchaseUnit = (ing.current_stock || 0) / yieldQty;
                      const displayStock = Number.isInteger(stockInPurchaseUnit)
                        ? stockInPurchaseUnit
                        : stockInPurchaseUnit.toFixed(2).replace(/\.?0+$/, '');
                      
                      const isLowStock = (ing.current_stock || 0) <= ((ing.min_stock_alert || 0) * yieldQty);

                      return (
                        <tr key={ing.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 pl-6 font-semibold text-slate-800">
                            {ing.name}
                          </td>
                          <td className="p-4 pr-6 text-right">
                            <div className="flex flex-col items-end gap-0.5">
                              <span className={`font-bold text-base ${isLowStock ? 'text-red-600' : 'text-slate-800'}`}>
                                {displayStock} {ing.unit}
                              </span>
                              {yieldQty > 1 && (
                                <span className={`text-[11px] font-medium ${isLowStock ? 'text-red-400' : 'text-slate-500'}`}>
                                  ≈ {ing.current_stock || 0} {ing.yield_unit || ing.unit}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredIngredients.length === 0 && (
                      <tr>
                        <td colSpan={2} className="p-8 text-center text-slate-400">
                          Tidak ada bahan baku yang ditemukan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
