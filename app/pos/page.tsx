'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { usePosStore } from '@/lib/store/usePosStore';
import ProductCard from '@/app/components/pos/ProductCard';
import Cart from '@/app/components/pos/Cart';
import TableMap from '@/app/components/pos/TableMap';
import { Coffee, Search, Utensils, Hash, Loader2 } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function PosPage() {
  const router = useRouter();
  const { currentShift, orderType, activeTable, setOrderType } = usePosStore();
  
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>(['Semua']);
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showTableMap, setShowTableMap] = useState(false);

  useEffect(() => {
    // Jika tidak ada shift aktif, paksa ke halaman buka shift
    if (!currentShift) {
      router.push('/pos/shift');
      return;
    }

    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase.from('products').select('*');
        if (error) throw error;
        
        if (data) {
          setProducts(data);
          const uniqueCategories = Array.from(new Set(data.map(p => p.category)));
          setCategories(['Semua', ...uniqueCategories]);
        }
      } catch (err) {
        console.error('Failed to fetch products:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();

    // Berlangganan (Subscribe) ke perubahan realtime di tabel products
    const channel = supabase
      .channel('realtime:products')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          console.log('Perubahan produk terdeteksi!', payload);
          // Ambil ulang produk jika ada perubahan (Tambah/Ubah/Hapus) di Backoffice
          fetchProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentShift, router]);

  if (!currentShift) return null; // Akan dialihkan ke /pos/shift

  const filteredProducts = products.filter(p => {
    const matchCategory = activeCategory === 'Semua' || p.category === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="flex h-full w-full bg-slate-50 relative">
      {/* Kiri: Katalog Produk */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Top Controls: Dine In/Takeaway, Search */}
        <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-center p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setOrderType('dine_in')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                orderType === 'dine_in' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Utensils size={16} /> Dine In
            </button>
            <button
              onClick={() => { setOrderType('takeaway'); }}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                orderType === 'takeaway' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Coffee size={16} /> Takeaway
            </button>
          </div>

          {orderType === 'dine_in' && (
            <button
              onClick={() => setShowTableMap(true)}
              className={`px-4 py-2 rounded-xl font-medium text-sm transition-all flex items-center gap-2 border-2 ${
                activeTable ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Hash size={16} /> 
              {activeTable ? activeTable : 'Pilih Meja'}
            </button>
          )}

          <div className="flex-1 max-w-md relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Cari produk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
            />
          </div>
        </div>

        {/* Kategori */}
        <div className="px-4 py-3 bg-white border-b border-slate-100 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2 rounded-full whitespace-nowrap font-medium text-sm transition-colors ${
                activeCategory === cat 
                  ? 'bg-slate-800 text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid Produk */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-slate-400">
              <Loader2 className="animate-spin" size={32} />
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Search size={48} className="mb-4 opacity-30" />
              <p>Tidak ada produk yang cocok dengan pencarian.</p>
            </div>
          )}
        </div>
      </div>

      {/* Kanan: Keranjang */}
      <div className="w-[380px] shrink-0 h-full">
        <Cart />
      </div>

      {showTableMap && (
        <TableMap onClose={() => setShowTableMap(false)} />
      )}
    </div>
  );
}
