'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Banknote, TrendingUp, PackageSearch, AlertTriangle, Loader2, ArrowRight, Filter } from 'lucide-react';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminDashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  
  const [stats, setStats] = useState({
    salesTotal: 0,
    netProfitTotal: 0,
    piutangTotal: 0,
    purchasesTotal: 0,
  });

  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);

  // Master data for filters
  const [products, setProducts] = useState<any[]>([]);

  // Filter Input States
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [selectedPayment, setSelectedPayment] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState('all');

  // Active Filter States (applied when button is clicked)
  const [activeFilters, setActiveFilters] = useState({
    startDate: todayStr,
    endDate: todayStr,
    payment: 'all',
    product: 'all'
  });

  // Initial Data Fetching (Master Data)
  useEffect(() => {
    const authStr = sessionStorage.getItem('admin_auth');
    if (!authStr) {
      router.push('/admin/login');
      return;
    }
    
    const fetchMasterData = async () => {
      const [prodRes] = await Promise.all([
        supabase.from('products').select('id, name').order('name')
      ]);
      if (prodRes.data) setProducts(prodRes.data);
    };
    
    fetchMasterData();
  }, [router]);

  // Dashboard Data Fetching (Reacts to filters)
  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const start = new Date(activeFilters.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(activeFilters.endDate);
        end.setHours(23, 59, 59, 999);

        // 1. Fetch transactions (Sales, Profit, Piutang)
        let txQuery = supabase
          .from('transactions')
          .select('total, subtotal, customer_id, payment_status, transaction_items(product_id, quantity, price, cost_price)')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());
          
        if (activeFilters.payment !== 'all') {
          txQuery = txQuery.eq('payment_method', activeFilters.payment);
        }
        
        const { data: salesData } = await txQuery;

        let totalSales = 0;
        let totalNetProfit = 0;
        let totalPiutangAmount = 0;

        if (salesData) {
          let filteredSales = salesData;
          
          // JS filter for products if selected
          if (activeFilters.product !== 'all') {
            filteredSales = filteredSales.filter((tx: any) => 
              tx.transaction_items?.some((item: any) => item.product_id === activeFilters.product)
            );
          }

          for (const tx of filteredSales) {
            let txSales = 0;
            let txProfit = 0;
            let txPiutang = 0;

            if (activeFilters.product !== 'all') {
              // Jika filter produk aktif, HANYA hitung nominal untuk produk tersebut
              if (tx.transaction_items) {
                for (const item of tx.transaction_items) {
                  if (item.product_id === activeFilters.product) {
                    const itemTotal = (item.price || 0) * item.quantity;
                    // Tambahkan proporsi pajak (misal 11%) agar 'Penjualan' tetap akurat
                    // Karena tx.total mengandung pajak, kita asumsikan item.price belum pajak (kecuali disetting include tax)
                    // Untuk amannya, kita ambil harga jual kotor barang tersebut
                    txSales += itemTotal; 
                    
                    const costPrice = item.cost_price || 0;
                    txProfit += ((item.price || 0) - costPrice) * item.quantity;
                  }
                }
              }
              if (tx.payment_status === 'unpaid') {
                txPiutang += txSales;
              }
            } else {
              // Jika semua produk, ambil total dari transaksi
              txSales = tx.total || 0;
              if (tx.payment_status === 'unpaid') {
                txPiutang = tx.total || 0;
              }
              if (tx.transaction_items) {
                for (const item of tx.transaction_items) {
                  const sellPrice = item.price || 0;
                  const costPrice = item.cost_price || 0;
                  txProfit += (sellPrice - costPrice) * item.quantity;
                }
              }
            }

            totalSales += txSales;
            totalNetProfit += txProfit;
            totalPiutangAmount += txPiutang;
          }
        }

        // 2. Pembelian (Berdasarkan filter tanggal)
        let purchaseQuery = supabase
          .from('purchases')
          .select('total_amount, purchase_items(product_id)')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());
          
        const { data: purchaseData } = await purchaseQuery;
        
        let totalPurchases = 0;
        if (purchaseData) {
          let filteredPurchases = purchaseData;
          if (activeFilters.product !== 'all') {
            filteredPurchases = filteredPurchases.filter((p: any) => 
              p.purchase_items?.some((item: any) => item.product_id === activeFilters.product)
            );
          }
          totalPurchases = filteredPurchases.reduce((sum, p) => sum + p.total_amount, 0);
        }

        // 3. Produk Stok Menipis (Independent dari filter tanggal)
        const [prodRes, ingRes] = await Promise.all([
          supabase.from('products').select('*, units(name), categories(name), product_ingredients(ingredient_id, quantity)'),
          supabase.from('ingredients').select('id, current_stock')
        ]);
        
        let lowStock: any[] = [];
        
        if (prodRes.data && ingRes.data) {
          const ingredientsMap = new Map(ingRes.data.map(i => [i.id, i.current_stock || 0]));
          
          const mappedProducts = prodRes.data.map(p => {
            let maxStock = p.stock || 0;
            
            if (p.product_ingredients && p.product_ingredients.length > 0) {
              const possibleQuantities = p.product_ingredients.map((pi: any) => {
                const availableIngStock = ingredientsMap.get(pi.ingredient_id) || 0;
                return Math.floor(availableIngStock / pi.quantity);
              });
              maxStock = Math.min(...possibleQuantities);
            }
            
            return { ...p, stock: maxStock };
          });
          
          lowStock = mappedProducts
            .filter(p => p.stock < 20)
            .sort((a, b) => a.stock - b.stock)
            .slice(0, 10);
        }

        setStats({ 
          salesTotal: totalSales, 
          netProfitTotal: totalNetProfit, 
          piutangTotal: totalPiutangAmount, 
          purchasesTotal: totalPurchases 
        });
        
        if (lowStock) setLowStockProducts(lowStock);

      } catch (err) {
        console.error('Gagal mengambil data dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [activeFilters]);

  const handleApplyFilter = () => {
    setActiveFilters({
      startDate,
      endDate,
      payment: selectedPayment,
      product: selectedProduct
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto bg-slate-50">
      <div className="mb-6 flex flex-col lg:flex-row lg:justify-between lg:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Dashboard Utama</h1>
          <p className="text-slate-500 text-sm mt-1">Pantau performa bisnis Anda secara real-time.</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-8 flex flex-col lg:flex-row gap-4 items-end">
        <div className="flex items-center gap-2 text-slate-600 bg-slate-100 p-2.5 rounded-xl font-medium shrink-0">
          <Filter size={18} className="text-blue-600" />
          <span className="text-sm pr-2">Filter Data:</span>
        </div>
        
        <div className="w-full lg:w-auto">
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Tanggal Mulai</label>
          <input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full lg:w-auto px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors bg-slate-50 hover:bg-white text-sm font-medium"
          />
        </div>
        
        <div className="w-full lg:w-auto">
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Tanggal Akhir</label>
          <input 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full lg:w-auto px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors bg-slate-50 hover:bg-white text-sm font-medium"
          />
        </div>
        
        <div className="w-full lg:w-1/4">
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Metode Pembayaran</label>
          <select 
            value={selectedPayment} 
            onChange={(e) => setSelectedPayment(e.target.value)}
            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors bg-slate-50 hover:bg-white text-sm font-medium text-slate-700"
          >
            <option value="all">Semua Metode</option>
            <option value="cash">Tunai</option>
            <option value="qris">QRIS</option>
          </select>
        </div>
        
        <div className="w-full lg:w-1/4">
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Produk Spesifik</label>
          <select 
            value={selectedProduct} 
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors bg-slate-50 hover:bg-white text-sm font-medium text-slate-700"
          >
            <option value="all">Semua Produk</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="w-full lg:w-auto">
          <button 
            onClick={handleApplyFilter}
            className="w-full lg:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm transition-colors"
          >
            Terapkan
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-blue-600" size={40} />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group">
              <div className="absolute -right-6 -top-6 text-blue-50 opacity-50 group-hover:scale-110 transition-transform">
                <TrendingUp size={120} />
              </div>
              <div className="flex items-center gap-3 text-slate-600 mb-2 relative z-10">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <TrendingUp size={20} />
                </div>
                <span className="font-semibold text-sm uppercase tracking-wide">Penjualan (Periode Ini)</span>
              </div>
              <div title={formatPrice(stats.salesTotal)} className="text-3xl lg:text-xl xl:text-2xl 2xl:text-3xl font-black text-slate-800 relative z-10 break-words">
                {formatPrice(stats.salesTotal)}
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group">
              <div className="absolute -right-6 -top-6 text-emerald-50 opacity-50 group-hover:scale-110 transition-transform">
                <TrendingUp size={120} />
              </div>
              <div className="flex items-center gap-3 text-slate-600 mb-2 relative z-10">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <TrendingUp size={20} />
                </div>
                <span className="font-semibold text-sm uppercase tracking-wide">Laba Bersih (Periode Ini)</span>
              </div>
              <div title={formatPrice(stats.netProfitTotal)} className="text-3xl lg:text-xl xl:text-2xl 2xl:text-3xl font-black text-slate-800 relative z-10 break-words">
                {formatPrice(stats.netProfitTotal)}
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group">
              <div className="absolute -right-6 -top-6 text-amber-50 opacity-50 group-hover:scale-110 transition-transform">
                <Banknote size={120} />
              </div>
              <div className="flex items-center gap-3 text-slate-600 mb-2 relative z-10">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                  <Banknote size={20} />
                </div>
                <span className="font-semibold text-sm uppercase tracking-wide">Piutang (Periode Ini)</span>
              </div>
              <div title={formatPrice(stats.piutangTotal)} className="text-3xl lg:text-xl xl:text-2xl 2xl:text-3xl font-black text-slate-800 relative z-10 break-words">
                {formatPrice(stats.piutangTotal)}
              </div>
              <Link href="/admin/receivables" className="relative z-10 mt-3 text-sm text-amber-700 font-medium inline-flex items-center gap-1 hover:gap-2 transition-all w-max">
                Lihat Detail Piutang <ArrowRight size={14} />
              </Link>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group">
              <div className="absolute -right-6 -top-6 text-indigo-50 opacity-50 group-hover:scale-110 transition-transform">
                <PackageSearch size={120} />
              </div>
              <div className="flex items-center gap-3 text-slate-600 mb-2 relative z-10">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                  <PackageSearch size={20} />
                </div>
                <span className="font-semibold text-sm uppercase tracking-wide">Pembelian (Periode Ini)</span>
              </div>
              <div title={formatPrice(stats.purchasesTotal)} className="text-3xl lg:text-xl xl:text-2xl 2xl:text-3xl font-black text-slate-800 relative z-10 break-words">
                {formatPrice(stats.purchasesTotal)}
              </div>
              <Link href="/admin/inventory/purchases" className="relative z-10 mt-3 text-sm text-indigo-700 font-medium inline-flex items-center gap-1 hover:gap-2 transition-all w-max">
                Catat Barang Masuk <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Tabel Peringatan Stok */}
          <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
            <div className="p-5 border-b border-red-100 bg-red-50/50 flex items-center gap-3">
              <div className="p-2 bg-red-100 text-red-600 rounded-full">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-red-900">Peringatan Stok Menipis</h2>
                <p className="text-sm text-red-700">Produk-produk berikut memiliki sisa stok kurang dari 20. Segera lakukan restock ke pabrik!</p>
              </div>
            </div>
            
            <div className="p-0 overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-slate-500 text-sm">
                    <th className="font-medium p-4 pl-6">Nama Produk</th>
                    <th className="font-medium p-4">Kategori</th>
                    <th className="font-medium p-4 text-right">Harga Jual</th>
                    <th className="font-medium p-4 text-center pr-6">Sisa Stok Fisik</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lowStockProducts.map((prod) => (
                    <tr key={prod.id} className="hover:bg-red-50/30 transition-colors">
                      <td className="p-4 pl-6 font-semibold text-slate-800">
                        {prod.name}
                      </td>
                      <td className="p-4 text-slate-600 text-sm">
                        {prod.categories?.name || 'Uncategorized'}
                      </td>
                      <td className="p-4 text-right text-slate-600 font-medium">
                        {formatPrice(prod.price)}
                      </td>
                      <td className="p-4 pr-6 text-center">
                        <span className="inline-flex items-center justify-center min-w-[3rem] px-2 py-1 rounded-md text-sm font-bold bg-red-100 text-red-700 border border-red-200 shadow-sm">
                          {prod.stock || 0}
                        </span>
                        <span className="text-xs text-slate-500 ml-1 font-medium">{prod.units?.name}</span>
                      </td>
                    </tr>
                  ))}
                  {lowStockProducts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-10 text-center text-slate-500">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full mb-4 shadow-inner">
                          <PackageSearch size={32} />
                        </div>
                        <p className="font-semibold text-emerald-700 text-lg">Semua stok produk Anda dalam kondisi aman!</p>
                        <p className="text-sm text-emerald-600/70 mt-1">Tidak ada produk dengan stok di bawah 20 unit.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
