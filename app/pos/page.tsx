'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { usePosStore } from '@/lib/store/usePosStore';
import ProductCard from '@/app/components/pos/ProductCard';
import Cart from '@/app/components/pos/Cart';
import CustomerModal from '@/app/components/pos/CustomerModal';
import { Search, Loader2, LogOut, UserCircle, ShoppingBag, X } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function PosPage() {
  const router = useRouter();
  const { currentShift, endShift, orderType, activeCustomer, setOrderType, cart } = usePosStore();
  
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>(['Semua']);
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showMobileCart, setShowMobileCart] = useState(false);

  useEffect(() => {
    // Jika tidak ada shift aktif, paksa ke halaman buka shift
    if (!currentShift) {
      router.push('/pos/shift');
      return;
    }

    const fetchProducts = async () => {
      try {
        const [prodRes, catRes, ingRes] = await Promise.all([
          supabase.from('products').select('*, categories(name), units(name), product_ingredients(ingredient_id, quantity)'),
          supabase.from('categories').select('name').order('name'),
          supabase.from('ingredients').select('id, current_stock')
        ]);
        
        if (prodRes.error) throw prodRes.error;
        if (catRes.error) throw catRes.error;
        if (ingRes.error) throw ingRes.error;
        
        if (prodRes.data) {
          const ingredientsMap = new Map(ingRes.data?.map(i => [i.id, i.current_stock || 0]) || []);
          
          // Kalkulasi maxStock
          const productsWithCalculatedStock = prodRes.data.map(p => {
            let maxStock = p.stock || 0;
            
            if (p.product_ingredients && p.product_ingredients.length > 0) {
              // Jika punya BOM, maxStock adalah hasil pembagian stok bahan baku dengan quantity resep
              const possibleQuantities = p.product_ingredients.map((pi: any) => {
                const availableIngStock = ingredientsMap.get(pi.ingredient_id) || 0;
                return Math.floor(availableIngStock / pi.quantity);
              });
              // Ambil nilai terkecil (limiting ingredient)
              maxStock = Math.min(...possibleQuantities);
            }
            
            return { ...p, stock: maxStock }; // Override stock property
          });

          setProducts(productsWithCalculatedStock);
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

  const cartItemsCount = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <div className="flex h-full w-full bg-slate-50 relative overflow-hidden">
      {/* Kiri: Katalog Produk */}
      <div className="flex-1 flex flex-col h-full w-full overflow-hidden">
        
        {/* Top Controls: Search & Profil */}
        <div className="p-4 bg-white border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 shrink-0">
          <div className="w-full sm:flex-1 relative max-w-xl">
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

          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-2 text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 flex-1 sm:flex-none justify-center">
              <UserCircle size={20} className="text-blue-500" />
              <span className="font-semibold text-sm truncate max-w-[120px] sm:max-w-none">Sales: {currentShift.cashierName}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 font-medium text-sm rounded-xl transition-colors border border-red-100"
            >
              <LogOut size={16} /> <span className="hidden sm:inline">Keluar</span>
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
        <div className="flex-1 overflow-y-auto p-4 pb-24 lg:pb-4">
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

      {/* Overlay untuk mobile cart */}
      {showMobileCart && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden transition-opacity"
          onClick={() => setShowMobileCart(false)}
        />
      )}

      {/* Kanan: Keranjang */}
      <div className={`
        fixed inset-y-0 right-0 z-50 w-[85%] sm:w-[380px] transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 bg-white
        ${showMobileCart ? 'translate-x-0' : 'translate-x-full'}
      `}>
        {showMobileCart && (
          <div className="absolute top-4 left-[-48px] lg:hidden">
            <button 
              onClick={() => setShowMobileCart(false)} 
              className="bg-white text-slate-800 p-2 rounded-l-xl shadow-[-4px_0_10px_rgba(0,0,0,0.1)] border-y border-l border-slate-200 flex items-center justify-center"
            >
              <X size={24} />
            </button>
          </div>
        )}
        <Cart />
      </div>

      {/* Tombol Floating Cart Mobile */}
      <button 
        onClick={() => setShowMobileCart(true)}
        className="lg:hidden fixed bottom-6 right-6 z-30 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl shadow-xl flex items-center justify-center transition-transform active:scale-95"
      >
        <ShoppingBag size={24} />
        {cartItemsCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold min-w-[24px] h-6 px-1.5 rounded-full flex items-center justify-center border-2 border-white">
            {cartItemsCount}
          </span>
        )}
      </button>

    </div>
  );
}
