'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Loader2, Search, ArrowDownRight, ArrowUpRight, Filter } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface StockMovement {
  id: string;
  date: string;
  type: 'IN' | 'OUT';
  document_id: string;
  product_id: string;
  product_name: string;
  qty: number;
  unit_name: string;
  price: number;
  reference_name: string; // Supplier name or Customer name
  balance?: number; // Running balance
}

export default function AdminStockReport() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProduct, setFilterProduct] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);

    // 1. Ambil Data Produk untuk Filter dan Stok Saat Ini
    const { data: prodData } = await supabase.from('products').select('id, name, stock, units(name)').order('name');
    const currentStocks: Record<string, number> = {};
    if (prodData) {
      setProducts(prodData);
      prodData.forEach(p => {
        currentStocks[p.id] = p.stock || 0;
      });
    }

    // 2. Ambil Riwayat Pembelian (Barang Masuk)
    const { data: purchaseData, error: err1 } = await supabase
      .from('purchase_items')
      .select(`
        id, qty, buy_price,
        products(id, name, units(name)),
        purchases(id, created_at, suppliers(name))
      `);

    // 3. Ambil Riwayat Penjualan (Barang Keluar)
    const { data: salesData, error: err2 } = await supabase
      .from('transaction_items')
      .select(`
        id, quantity, price,
        products(id, name, units(name)),
        transactions(id, created_at, customers(name))
      `);

    let combined: StockMovement[] = [];

    if (purchaseData) {
      purchaseData.forEach((item: any) => {
        if (!item.purchases || !item.products) return;
        combined.push({
          id: `in-${item.id}`,
          date: item.purchases.created_at,
          type: 'IN',
          document_id: item.purchases.id,
          product_id: item.products.id,
          product_name: item.products.name,
          qty: item.qty,
          unit_name: item.products.units?.name || '',
          price: item.buy_price,
          reference_name: item.purchases.suppliers?.name || 'Supplier Umum'
        });
      });
    }

    if (salesData) {
      salesData.forEach((item: any) => {
        if (!item.transactions || !item.products) return;
        combined.push({
          id: `out-${item.id}`,
          date: item.transactions.created_at,
          type: 'OUT',
          document_id: item.transactions.id,
          product_id: item.products.id,
          product_name: item.products.name,
          qty: item.quantity,
          unit_name: item.products.units?.name || '',
          price: item.price,
          reference_name: item.transactions.customers?.name || 'Pelanggan Umum'
        });
      });
    }

    // 4. Ambil Riwayat Penyesuaian (Stock Opname)
    const { data: adjData } = await supabase
      .from('stock_adjustments')
      .select(`
        id, difference, reason, created_at,
        products(id, name, units(name))
      `);

    if (adjData) {
      adjData.forEach((item: any) => {
        if (!item.products || !item.difference) return;
        
        combined.push({
          id: `adj-${item.id}`,
          date: item.created_at,
          type: item.difference > 0 ? 'IN' : 'OUT',
          document_id: `ADJ-${item.id.substring(0, 5)}`,
          product_id: item.products.id,
          product_name: item.products.name,
          qty: Math.abs(item.difference),
          unit_name: item.products.units?.name || '',
          price: 0,
          reference_name: `Opname: ${item.reason}`
        });
      });
    }

    // Urutkan dari yang terbaru (Descending)
    combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Hitung Sisa Stok mundur dari stok saat ini
    combined.forEach(m => {
      m.balance = currentStocks[m.product_id] || 0;
      if (m.type === 'IN') {
        currentStocks[m.product_id] -= m.qty;
      } else {
        currentStocks[m.product_id] += m.qty;
      }
    });

    setMovements(combined);
    setIsLoading(false);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(dateString));
  };

  const filteredMovements = movements.filter(m => {
    const matchSearch = m.product_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        m.document_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchProduct = filterProduct === 'all' || m.product_name === filterProduct;
    const matchType = filterType === 'all' || m.type === filterType;
    
    let matchDate = true;
    if (startDate) {
      matchDate = matchDate && new Date(m.date) >= new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matchDate = matchDate && new Date(m.date) <= end;
    }
    
    return matchSearch && matchProduct && matchType && matchDate;
  });

  return (
    <div className="p-4 md:p-8 h-full relative flex flex-col">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-4 md:mb-8 shrink-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">Riwayat Pergerakan Stok</h1>
          <p className="text-slate-500 text-sm">Buku besar riwayat pergerakan keluar dan masuk barang (Inventory Ledger).</p>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 shrink-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Pencarian</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={16} />
            </div>
            <input
              type="text"
              placeholder="ID / Nama Produk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tanggal Mulai</label>
          <input 
            type="date" 
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tanggal Akhir</label>
          <input 
            type="date" 
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tipe Pergerakan</label>
          <select 
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors appearance-none bg-white"
          >
            <option value="all">Semua Tipe</option>
            <option value="IN">Stok Masuk (Pembelian/Opname+)</option>
            <option value="OUT">Stok Keluar (Penjualan/Opname-)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Produk / Barang</label>
          <select 
            value={filterProduct}
            onChange={e => setFilterProduct(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors appearance-none bg-white"
          >
            <option value="all">Semua Produk</option>
            {products.map(p => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col flex-1 min-h-0">
        {/* Tabel */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white shadow-sm z-10">
                <tr className="text-slate-500 text-sm border-b border-slate-200">
                  <th className="font-medium p-4 pl-6">Waktu & Referensi</th>
                  <th className="font-medium p-4">Keterangan</th>
                  <th className="font-medium p-4">Nama Produk</th>
                  <th className="font-medium p-4 text-center">Pergerakan Stok</th>
                  <th className="font-medium p-4 text-center">Sisa Stok</th>
                  <th className="font-medium p-4 text-right pr-6">Pihak Terkait</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMovements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="font-semibold text-slate-800">
                        {formatDate(m.date)}
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-1" title={m.document_id}>
                        {m.type === 'IN' ? 'PO' : 'INV'}-{m.document_id.split('-')[0].toUpperCase()}
                      </div>
                    </td>
                    <td className="p-4">
                      {m.type === 'IN' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <ArrowDownRight size={14} /> BARANG MASUK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                          <ArrowUpRight size={14} /> BARANG KELUAR
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-semibold text-slate-700">
                      {m.product_name}
                    </td>
                    <td className="p-4 text-center">
                      <div className={m.type === 'IN' ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>
                        {m.type === 'IN' ? '+' : '-'}{m.qty} <span className="text-xs font-normal text-slate-500">{m.unit_name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center bg-slate-50/30">
                      <div className="font-bold text-slate-800">
                        {m.balance} <span className="text-xs font-normal text-slate-500">{m.unit_name}</span>
                      </div>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="font-medium text-slate-800">{m.reference_name}</div>
                      <div className="text-xs text-slate-500">
                        {m.reference_name.startsWith('Opname:') ? 'Internal Gudang' : m.type === 'IN' ? 'Supplier' : 'Toko Pelanggan'}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredMovements.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-500">
                      Tidak ada pergerakan stok yang ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        {filterProduct !== 'all' && filteredMovements.length > 0 && (
          <div className="p-4 bg-slate-800 border-t border-slate-700 flex flex-col md:flex-row justify-between items-center shrink-0 text-white rounded-b-2xl shadow-inner">
            <div className="flex items-center">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Ringkasan Pergerakan</div>
                <div className="text-lg font-bold text-white truncate max-w-[200px]">{filterProduct}</div>
              </div>
            </div>
            <div className="flex gap-6 items-center mt-4 md:mt-0">
              <div className="text-right">
                 <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Masuk</div>
                 <div className="text-lg font-bold text-emerald-400">+{filteredMovements.filter(m => m.type === 'IN').reduce((sum, m) => sum + m.qty, 0)}</div>
              </div>
              <div className="text-right">
                 <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Keluar</div>
                 <div className="text-lg font-bold text-red-400">-{filteredMovements.filter(m => m.type === 'OUT').reduce((sum, m) => sum + m.qty, 0)}</div>
              </div>
              <div className="w-px h-8 bg-slate-700 mx-1"></div>
              <div className="text-right">
                 <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Sisa Stok Aktual (Sistem)</div>
                 <div className="text-xl font-black text-blue-400">
                   {products.find(p => p.name === filterProduct)?.stock || 0}
                   <span className="text-sm font-medium text-blue-300 ml-1">
                     {products.find(p => p.name === filterProduct)?.units?.name || 'Unit'}
                   </span>
                 </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
