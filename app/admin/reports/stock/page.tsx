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
  product_name: string;
  qty: number;
  unit_name: string;
  price: number;
  reference_name: string; // Supplier name or Customer name
}

export default function AdminStockReport() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProduct, setFilterProduct] = useState('all');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);

    // 1. Ambil Data Produk untuk Filter
    const { data: prodData } = await supabase.from('products').select('id, name').order('name');
    if (prodData) setProducts(prodData);

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
          product_name: item.products.name,
          qty: item.quantity,
          unit_name: item.products.units?.name || '',
          price: item.price,
          reference_name: item.transactions.customers?.name || 'Pelanggan Umum'
        });
      });
    }

    // Urutkan dari yang terbaru (Descending)
    combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
    const matchProduct = filterProduct === 'all' || m.product_name === filterProduct; // Simplified matching by name for now
    const matchType = filterType === 'all' || m.type === filterType;
    
    return matchSearch && matchProduct && matchType;
  });

  return (
    <div className="p-8 h-full relative flex flex-col">
      <div className="flex justify-between items-center mb-8 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Laporan Kartu Stok</h1>
          <p className="text-slate-500">Buku besar riwayat pergerakan keluar dan masuk barang (Inventory Ledger).</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col flex-1 min-h-0">
        {/* Filters */}
        <div className="p-4 border-b border-slate-100 flex gap-4 items-center bg-slate-50 shrink-0 flex-wrap">
          <div className="relative w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Cari ID Dokumen atau Produk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <select 
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              <option value="all">Semua Tipe (Keluar/Masuk)</option>
              <option value="IN">Stok Masuk (Pembelian)</option>
              <option value="OUT">Stok Keluar (Penjualan)</option>
            </select>
          </div>

          <select 
            value={filterProduct}
            onChange={e => setFilterProduct(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors max-w-[200px]"
          >
            <option value="all">Semua Produk</option>
            {products.map(p => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>
        </div>

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
                    <td className="p-4 pr-6 text-right">
                      <div className="font-medium text-slate-800">{m.reference_name}</div>
                      <div className="text-xs text-slate-500">{m.type === 'IN' ? 'Supplier' : 'Toko Pelanggan'}</div>
                    </td>
                  </tr>
                ))}
                {filteredMovements.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-500">
                      Tidak ada pergerakan stok yang ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
