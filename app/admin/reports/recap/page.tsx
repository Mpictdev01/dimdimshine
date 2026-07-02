'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Loader2, Search, Download, Filter, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function RecapReportPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filteredTx, setFilteredTx] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Master data for filters
  const [users, setUsers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Filter States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSales, setSelectedSales] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState('all');

  useEffect(() => {
    fetchMasterData();
    fetchTransactions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [transactions, startDate, endDate, selectedSales, selectedCustomer, selectedProduct]);

  const fetchMasterData = async () => {
    const [usersRes, custRes, prodRes] = await Promise.all([
      supabase.from('users').select('id, full_name, role'),
      supabase.from('customers').select('id, name'),
      supabase.from('products').select('id, name')
    ]);

    if (usersRes.data) setUsers(usersRes.data);
    if (custRes.data) setCustomers(custRes.data);
    if (prodRes.data) setProducts(prodRes.data);
  };

  const fetchTransactions = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        customers(name),
        transaction_items(
          product_id, quantity, price,
          products(name, units(name))
        )
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTransactions(data);
    }
    setIsLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter(tx => new Date(tx.created_at) >= start);
    }
    
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(tx => new Date(tx.created_at) <= end);
    }

    if (selectedSales !== 'all') {
      filtered = filtered.filter(tx => tx.cashier_id === selectedSales);
    }

    if (selectedCustomer !== 'all') {
      if (selectedCustomer === 'umum') {
        filtered = filtered.filter(tx => !tx.customer_id);
      } else {
        filtered = filtered.filter(tx => tx.customer_id === selectedCustomer);
      }
    }

    if (selectedProduct !== 'all') {
      filtered = filtered.filter(tx => 
        tx.transaction_items?.some((item: any) => item.product_id === selectedProduct)
      );
    }

    setFilteredTx(filtered);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
  };

  const getSalesName = (cashierId: string) => {
    const user = users.find(u => u.id === cashierId);
    return user ? user.full_name : 'Unknown';
  };

  const exportToExcel = () => {
    if (filteredTx.length === 0) {
      alert("Tidak ada data untuk di-export.");
      return;
    }

    const dataToExport = filteredTx.map(tx => {
      const itemsDetail = tx.transaction_items?.map((item: any) => 
        `${item.products?.name} (${item.quantity} ${item.products?.units?.name || 'pcs'})`
      ).join(', ');

      return {
        'ID Transaksi': tx.id.split('-')[0].toUpperCase(),
        'Tanggal': new Date(tx.created_at).toLocaleString('id-ID'),
        'Pelanggan': tx.customers?.name || 'Pelanggan Umum',
        'Sales': getSalesName(tx.cashier_id),
        'Detail Barang': itemsDetail,
        'Subtotal': tx.subtotal,
        'Pajak': tx.tax || 0,
        'Total Nominal': tx.total,
        'Status Pembayaran': tx.payment_method === 'tempo' ? 'Piutang/Tempo' : 'Lunas'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    
    // Auto-size columns slightly
    const wscols = [
      {wch: 15}, {wch: 20}, {wch: 25}, {wch: 20}, {wch: 50}, {wch: 15}, {wch: 10}, {wch: 15}, {wch: 15}
    ];
    worksheet['!cols'] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Penjualan");
    
    XLSX.writeFile(workbook, `Rekap_Penjualan_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div className="p-8 h-full relative flex flex-col">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Rekap Penjualan</h1>
          <p className="text-slate-500">Laporan komprehensif penjualan dengan filter detail.</p>
        </div>
        <button 
          onClick={exportToExcel}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <FileSpreadsheet size={20} />
          Export Excel
        </button>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 shrink-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tanggal Mulai</label>
          <input 
            type="date" 
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tanggal Akhir</label>
          <input 
            type="date" 
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Sales / Pegawai</label>
          <select 
            value={selectedSales}
            onChange={e => setSelectedSales(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
          >
            <option value="all">Semua Sales</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Pelanggan</label>
          <select 
            value={selectedCustomer}
            onChange={e => setSelectedCustomer(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
          >
            <option value="all">Semua Pelanggan</option>
            <option value="umum">Pelanggan Umum</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Produk / Barang</label>
          <select 
            value={selectedProduct}
            onChange={e => setSelectedProduct(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
          >
            <option value="all">Semua Barang</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white shadow-sm z-10">
                <tr className="text-slate-500 text-sm border-b border-slate-200">
                  <th className="font-medium p-4 pl-6">Tgl & Jam</th>
                  <th className="font-medium p-4">ID Transaksi</th>
                  <th className="font-medium p-4">Pelanggan</th>
                  <th className="font-medium p-4">Sales</th>
                  <th className="font-medium p-4 w-1/3">Detail Barang</th>
                  <th className="font-medium p-4 text-right pr-6">Total Nominal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredTx.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 pl-6 text-slate-600 font-medium whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute:'2-digit'})}
                    </td>
                    <td className="p-4 text-slate-500 font-mono text-xs">
                      {tx.id.split('-')[0].toUpperCase()}
                    </td>
                    <td className="p-4 font-semibold text-slate-800">
                      {tx.customers?.name || 'Pelanggan Umum'}
                      {tx.payment_method === 'tempo' && (
                        <span className="block mt-1 text-[10px] font-medium bg-amber-100 text-amber-800 px-2 py-0.5 rounded w-max">Tempo</span>
                      )}
                    </td>
                    <td className="p-4 text-slate-700">
                      {getSalesName(tx.cashier_id)}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1.5">
                        {tx.transaction_items?.map((item: any, idx: number) => (
                          <span key={idx} className="inline-flex items-center px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs border border-slate-200 shadow-sm">
                            {item.products?.name} <span className="ml-1 font-semibold">x{item.quantity}</span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 pr-6 text-right font-bold text-slate-800 whitespace-nowrap">
                      {formatPrice(tx.total || 0)}
                    </td>
                  </tr>
                ))}
                {filteredTx.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      Tidak ada data yang sesuai dengan filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Footer Summary */}
        {!isLoading && filteredTx.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
            <span className="text-sm font-medium text-slate-600">Total Transaksi: <strong className="text-slate-900">{filteredTx.length}</strong></span>
            <span className="text-lg font-bold text-slate-900">
              Total Omzet: {formatPrice(filteredTx.reduce((sum, tx) => sum + (tx.total || 0), 0))}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
