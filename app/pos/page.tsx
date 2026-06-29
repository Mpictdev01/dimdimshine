'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { usePosStore } from '@/lib/store/usePosStore';
import ProductCard from '@/app/components/pos/ProductCard';
import Cart from '@/app/components/pos/Cart';
import CustomerModal from '@/app/components/pos/CustomerModal';
import { Search, Loader2, LogOut, UserCircle } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function PosPage() {
  const router = useRouter();
  const { currentShift, endShift, orderType, activeCustomer, setOrderType } = usePosStore();
  
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>(['Semua']);
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Jika tidak ada shift aktif, paksa ke halaman buka shift
    if (!currentShift) {
      router.push('/pos/shift');
      return;
    }

    const fetchProducts = async () => {
      try {
        const [prodRes, catRes] = await Promise.all([
          supabase.from('products').select('*, categories(name), units(name)'),
          supabase.from('categories').select('name').order('name')
        ]);
        
        if (prodRes.error) throw prodRes.error;
        if (catRes.error) throw catRes.error;
        
        if (prodRes.data) {
          setProducts(prodRes.data);
        }
        if (catRes.data) {
          const allCategories = catRes.data.map((c: any) => c.name);
          // Tambahkan 'Uncategorized' jika ada produk tanpa kategori
          const hasUncategorized = prodRes.data?.some(p => !p.categories?.name);
          if (hasUncategorized) allCategories.push('Uncategorized');
          
          setCategories(['Semua', ...allCategories]);
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

  const handleLogout = () => {
    endShift();
    router.push('/pos/shift');
  };

  const filteredProducts = products.filter(p => {
    const catName = p.categories?.name || 'Uncategorized';
    const matchCategory = activeCategory === 'Semua' || catName === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="flex h-full w-full bg-slate-50 relative">
      {/* Kiri: Katalog Produk */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Top Controls: Search & Profil */}
        <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between gap-6 shrink-0">
          <div className="flex-1 relative max-w-xl">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Cari produk (nama / kode)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
              <UserCircle size={20} className="text-blue-500" />
              <span className="font-semibold text-sm">Sales: {currentShift.cashierName}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 font-medium text-sm rounded-xl transition-colors border border-red-100"
            >
              <LogOut size={16} /> Keluar
            </button>
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
            <div className="flex flex-col gap-2">
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

    </div>
  );
}
