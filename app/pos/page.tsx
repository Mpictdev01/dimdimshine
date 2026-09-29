'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { browserDataClient } from '@/lib/browser-data-client';
import { usePosStore } from '@/lib/store/usePosStore';
import ProductCard from '@/app/components/pos/ProductCard';
import Cart from '@/app/components/pos/Cart';
import ReportModal from '@/app/components/pos/ReportModal';
import ExpenseModal from '@/app/components/pos/ExpenseModal';
import IngredientsStockModal from '@/app/components/pos/IngredientsStockModal';
import IngredientStockRequestModal from '@/app/components/pos/IngredientStockRequestModal';
import { Search, Loader2, LogOut, UserCircle, ShoppingBag, X, FileText, Wallet, Boxes, Menu, Plus } from 'lucide-react';
import clsx from 'clsx';
import { closeShift } from '@/app/actions/shift';
import { logoutAccount } from '@/app/actions/auth';
import { calculateRecipeAvailability, type StockIngredient } from '@/lib/product-availability';

const supabase = browserDataClient;

export default function PosPage() {
  const router = useRouter();
  const { currentShift, endShift, clearCart, cart } = usePosStore();
  
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>(['Semua']);
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showIngredientsModal, setShowIngredientsModal] = useState(false);
  const [showStockRequestModal, setShowStockRequestModal] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [animateCart, setAnimateCart] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const isFirstRender = useRef(true);
  const closingRef = useRef(false);

  useEffect(() => {
    // Jika tidak ada shift aktif, paksa ke halaman buka shift
    if (!currentShift) {
      router.push('/pos/shift');
      return;
    }

    const fetchProducts = async () => {
      setIsLoading(true); setLoadError('');
      try {
        const [prodRes, catRes, ingRes] = await Promise.all([
          supabase.from('products').select('*, categories(name), units(name), product_ingredients(ingredient_id, quantity)'),
          supabase.from('categories').select('name').order('name'),
          supabase.from('ingredients').select('id, name, current_stock, yield_quantity, yield_unit, unit')
        ]);
        
        if (prodRes.error) throw prodRes.error;
        if (catRes.error) throw catRes.error;
        if (ingRes.error) throw ingRes.error;
        
        if (prodRes.data) {
          const ingredientsMap = new Map<string, StockIngredient>(
            (ingRes.data ?? []).map((ingredient: StockIngredient) => [ingredient.id, ingredient] as const),
          );
          
          // Kalkulasi maxStock
          const productsWithCalculatedStock = prodRes.data.map(p => {
            let maxStock = p.stock || 0;
            let rawStockInfo = '';
            
            const availability = calculateRecipeAvailability(p.product_ingredients, ingredientsMap);
            if (availability) {
              maxStock = availability.maxStock;
              const limiting = availability.limiting.ingredient;
              if (limiting && Number(limiting.yield_quantity) > 1) {
                rawStockInfo = `(≈ ${(Number(limiting.current_stock ?? 0) / Number(limiting.yield_quantity)).toFixed(2).replace(/\.?0+$/, '')} ${limiting.unit || ''})`;
              }
            }

            return { ...p, stock: maxStock, rawStockInfo,
              ingredientShortages: availability?.shortages ?? [] };
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
        setLoadError('Produk gagal dimuat. Periksa koneksi lalu coba lagi.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();

  }, [currentShift, router, reload]);

  useEffect(() => {
    if (!currentShift) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') setReload(value => value + 1);
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [currentShift]);

  const cartItemsCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (cartItemsCount > 0) {
      setAnimateCart(true);
      const timer = setTimeout(() => setAnimateCart(false), 400);
      return () => clearTimeout(timer);
    }
  }, [cartItemsCount]);

  if (!currentShift) return null; // Akan dialihkan ke /pos/shift

  const handleLogout = async () => {
    if (closingRef.current || !window.confirm('Tutup shift dan keluar?')) return;
    closingRef.current = true;
    setIsClosing(true);
    try {
      const result = await closeShift(currentShift.id);
      if (!result.success) { alert(result.error); return; }
      endShift();
      clearCart();
      try {
        await logoutAccount();
      } catch {
        alert('Shift sudah ditutup, tetapi sesi belum berhasil keluar. Gunakan "Ganti akun" pada halaman berikutnya.');
      }
      router.replace('/pos/shift');
    } catch (error) { alert(error instanceof Error ? error.message : 'Gagal menutup shift'); }
    finally {
      closingRef.current = false;
      setIsClosing(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const catName = p.categories?.name || 'Uncategorized';
    const matchCategory = activeCategory === 'Semua' || catName === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="flex h-full w-full bg-slate-50 relative overflow-hidden">
      {/* Kiri: Katalog Produk */}
      <div className="flex-1 flex flex-col h-full w-full overflow-hidden">
        
        {/* Top Controls: Search & Profil */}
        <div className="p-4 bg-white border-b border-slate-100 flex flex-col lg:flex-row items-center justify-between gap-3 lg:gap-6 shrink-0">
          <div className="w-full md:flex-1 relative max-w-xl flex items-center gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={18} />
              </div>
              <input
                type="text"
                placeholder="Cari nama produk..."
                aria-label="Cari nama produk"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 sm:py-3 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm text-sm"
              />
            </div>
            
            {/* Tombol Hamburger Menu Mobile */}
            <button
              onClick={() => setShowMobileNav(true)}
              className="lg:hidden flex items-center justify-center p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 shrink-0 transition-colors"
              title="Menu Navigasi POS"
            >
              <Menu size={22} />
            </button>
          </div>

          {/* Controls Desktop (md ke atas) */}
          <div className="hidden lg:flex items-center gap-3 w-auto justify-end">
            <div className="flex items-center gap-2 text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 shrink-0">
              <UserCircle size={18} className="text-blue-500 shrink-0" />
              <span className="font-semibold text-xs sm:text-sm whitespace-nowrap">Sales: {currentShift.cashierName}</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button 
                onClick={() => setShowIngredientsModal(true)}
                className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs sm:text-sm rounded-xl transition-all border border-emerald-200/60 shadow-xs whitespace-nowrap active:scale-95"
              >
                <Boxes size={16} className="shrink-0 text-emerald-600" />
                <span>Stok Bahan</span>
              </button>
              <button
                onClick={() => setShowStockRequestModal(true)}
                className="flex items-center justify-center gap-2 rounded-xl border border-red-200/60 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700 shadow-xs transition-all hover:bg-red-100 active:scale-95 sm:text-sm"
              >
                <Plus size={16} className="shrink-0" />
                <span>Tambah Stok</span>
              </button>
              <button 
                onClick={() => setShowExpenseModal(true)}
                className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold text-xs sm:text-sm rounded-xl transition-all border border-amber-200/60 shadow-xs whitespace-nowrap active:scale-95"
              >
                <Wallet size={16} className="shrink-0 text-amber-600" />
                <span>Pengeluaran</span>
              </button>
              <button 
                onClick={() => setShowReportModal(true)}
                className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs sm:text-sm rounded-xl transition-all border border-blue-200/60 shadow-xs whitespace-nowrap active:scale-95"
              >
                <FileText size={16} className="shrink-0 text-blue-600" />
                <span>Laporan</span>
              </button>
              <button 
                onClick={handleLogout}
                disabled={isClosing}
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-xs sm:text-sm rounded-xl transition-all border border-red-200/60 shadow-xs whitespace-nowrap active:scale-95"
              >
                <LogOut size={16} className="shrink-0 text-red-600" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
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
          ) : loadError ? (
            <div role="alert" className="h-full flex flex-col items-center justify-center gap-3 text-red-700">
              <p>{loadError}</p><button onClick={() => setReload(value => value + 1)} className="rounded-lg bg-blue-600 px-4 py-2 text-white">Coba lagi</button>
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
              <p>{products.length ? 'Tidak ada produk yang cocok dengan pencarian.' : 'Belum ada produk.'}</p>
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
      <div className={`lg:hidden fixed bottom-6 z-30 transition-all duration-300 flex ${cartItemsCount > 0 ? 'left-4 right-4' : 'right-6'}`}>
        <button 
          onClick={() => setShowMobileCart(true)}
          className={`bg-blue-600 hover:bg-blue-700 text-white shadow-xl flex items-center justify-between transition-all duration-300 overflow-hidden active:scale-[0.98] ${
            cartItemsCount > 0 
              ? 'w-full rounded-2xl px-5 py-4' 
              : 'w-14 h-14 rounded-2xl justify-center p-0'
          } ${animateCart && cartItemsCount > 0 ? 'ring-4 ring-blue-400 scale-[1.02]' : ''} ${animateCart && cartItemsCount === 0 ? 'scale-125 ring-4 ring-blue-400 rotate-12' : ''}`}
        >
          {cartItemsCount > 0 ? (
            <>
              <div className="flex flex-col items-start">
                <span className="text-[11px] font-semibold text-blue-200 uppercase tracking-wider">{cartItemsCount} Produk di Keranjang</span>
                <span className="font-bold text-lg leading-tight">{formatPrice(cartTotal)}</span>
              </div>
              <div className="flex items-center gap-2 font-semibold bg-white/20 px-4 py-2 rounded-xl shrink-0">
                <span>Buka</span>
                <ShoppingBag size={18} />
              </div>
            </>
          ) : (
            <ShoppingBag size={24} />
          )}
        </button>
      </div>

      {/* Modal Laporan */}
      {showReportModal && (
        <ReportModal onClose={() => setShowReportModal(false)} />
      )}

      {/* Modal Pengeluaran */}
      {showExpenseModal && (
        <ExpenseModal onClose={() => setShowExpenseModal(false)} />
      )}

      {/* Modal Stok Bahan Baku */}
      {showIngredientsModal && (
        <IngredientsStockModal onClose={() => setShowIngredientsModal(false)} />
      )}

      {showStockRequestModal && (
        <IngredientStockRequestModal shiftId={currentShift.id} onClose={() => {
          setShowStockRequestModal(false);
          setReload(value => value + 1);
        }} />
      )}

      {/* Slide-over Navbar Drawer Mobile (Smooth CSS Transitions) */}
      <div 
        className={clsx(
          "fixed inset-0 z-[90] lg:hidden transition-all duration-300 ease-in-out",
          showMobileNav ? "opacity-100 visible pointer-events-auto" : "opacity-0 invisible pointer-events-none"
        )}
      >
        {/* Backdrop */}
        <div 
          className={clsx(
            "fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300 ease-in-out",
            showMobileNav ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setShowMobileNav(false)}
        />

        {/* Drawer Menu */}
        <div 
          className={clsx(
            "fixed inset-y-0 right-0 w-72 max-w-[80vw] bg-white z-[95] p-5 flex flex-col shadow-2xl transition-transform duration-300 ease-out transform-gpu",
            showMobileNav ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <UserCircle size={22} className="text-blue-600" />
              <div>
                <h3 className="font-bold text-slate-800 text-sm">{currentShift.cashierName}</h3>
                <p className="text-[11px] text-slate-400 font-medium">Petugas Sales POS</p>
              </div>
            </div>
            <button 
              onClick={() => setShowMobileNav(false)}
              className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 space-y-2.5 py-2">
            <button
              onClick={() => {
                setShowIngredientsModal(true);
                setShowMobileNav(false);
              }}
              className="clay-action-card w-full flex items-center gap-3 p-3.5 rounded-xl font-semibold text-sm transition-all active:scale-[0.98]"
            >
              <div className="p-2 bg-emerald-700 text-white rounded-lg shadow-sm">
                <Boxes size={18} />
              </div>
              <span>Stok Bahan Baku</span>
            </button>

            <button
              onClick={() => {
                setShowStockRequestModal(true);
                setShowMobileNav(false);
              }}
              className="clay-action-card flex w-full items-center gap-3 rounded-xl p-3.5 text-sm font-semibold transition-all active:scale-[0.98]"
            >
              <div className="rounded-lg bg-red-700 p-2 text-white shadow-sm"><Plus size={18} /></div>
              <span>Tambahkan Stok</span>
            </button>

            <button
              onClick={() => {
                setShowExpenseModal(true);
                setShowMobileNav(false);
              }}
              className="clay-action-card w-full flex items-center gap-3 p-3.5 rounded-xl font-semibold text-sm transition-all active:scale-[0.98]"
            >
              <div className="p-2 bg-amber-700 text-white rounded-lg shadow-sm">
                <Wallet size={18} />
              </div>
              <span>Catat Pengeluaran</span>
            </button>

            <button
              onClick={() => {
                setShowReportModal(true);
                setShowMobileNav(false);
              }}
              className="clay-action-card w-full flex items-center gap-3 p-3.5 rounded-xl font-semibold text-sm transition-all active:scale-[0.98]"
            >
              <div className="p-2 bg-blue-600 text-white rounded-lg shadow-sm">
                <FileText size={18} />
              </div>
              <span>Laporan Shift Kasir</span>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-auto">
            <button
              onClick={() => {
                setShowMobileNav(false);
                handleLogout();
              }}
              disabled={isClosing}
              className="w-full flex items-center justify-center gap-2 p-3.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-sm transition-all border border-red-100 active:scale-[0.98]"
            >
              <LogOut size={18} />
              <span>Keluar Shift</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
