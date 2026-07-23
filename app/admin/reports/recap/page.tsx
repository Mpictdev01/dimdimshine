'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Loader2, Search, Download, Filter, FileSpreadsheet, Trash2, X, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { deleteTransactions } from '@/app/actions/transaction';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function RecapReportPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filteredTx, setFilteredTx] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [users, setUsers] = useState<any[]>([]);

  const [products, setProducts] = useState<any[]>([]);

  // Deletion States
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [revertStock, setRevertStock] = useState(true);

  // Filter States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSales, setSelectedSales] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState('all');

  useEffect(() => {
    fetchMasterData();
    fetchTransactions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [transactions, startDate, endDate, selectedSales, selectedPayment, selectedProduct]);

  const fetchMasterData = async () => {
    const [usersRes, prodRes] = await Promise.all([
      supabase.from('users').select('id, full_name, role'),
      supabase.from('products').select('id, name')
    ]);

    if (usersRes.data) setUsers(usersRes.data);
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

    if (selectedPayment !== 'all') {
      filtered = filtered.filter(tx => tx.payment_method === selectedPayment);
    }

    if (selectedProduct !== 'all') {
      filtered = filtered.filter(tx => 
        tx.transaction_items?.some((item: any) => item.product_id === selectedProduct)
      );
    }

    setFilteredTx(filtered);
    setSelectedIds([]); // Reset selection when filter changes
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
        'Metode Pembayaran': tx.payment_method === 'qris' ? 'QRIS' : 'Tunai'
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

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredTx.map(tx => tx.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsDeleting(true);

    const res = await deleteTransactions(selectedIds, revertStock);
    if (res.success) {
      setSelectedIds([]);
      setShowDeleteModal(false);
      await fetchTransactions(); // Refresh data
    } else {
      alert(`Error: ${res.error}`);
    }

    setIsDeleting(false);
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
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Metode Pembayaran</label>
          <select 
            value={selectedPayment}
            onChange={e => setSelectedPayment(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
          >
            <option value="all">Semua Metode</option>
            <option value="cash">Tunai</option>
            <option value="qris">QRIS</option>
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
                  <th className="font-medium p-4 pl-6 w-10">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={filteredTx.length > 0 && selectedIds.length === filteredTx.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="font-medium p-4">Tgl & Jam</th>
                  <th className="font-medium p-4">ID Transaksi</th>
                  <th className="font-medium p-4">Pelanggan</th>
                  <th className="font-medium p-4">Sales</th>
                  <th className="font-medium p-4 w-1/3">Detail Barang</th>
                  <th className="font-medium p-4 text-right pr-6">Total Nominal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredTx.map((tx) => (
                  <tr key={tx.id} className={`hover:bg-slate-50/50 transition-colors ${selectedIds.includes(tx.id) ? 'bg-blue-50/30' : ''}`}>
                    <td className="p-4 pl-6">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedIds.includes(tx.id)}
                        onChange={() => handleSelectOne(tx.id)}
                      />
                    </td>
                    <td className="p-4 text-slate-600 font-medium whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute:'2-digit'})}
                    </td>
                    <td className="p-4 text-slate-500 font-mono text-xs">
                      {tx.id.split('-')[0].toUpperCase()}
                    </td>
                    <td className="p-4 font-semibold text-slate-800">
                      {tx.customers?.name || 'Pelanggan Umum'}
                      {tx.payment_method === 'qris' ? (
                        <span className="block mt-1 text-[10px] font-medium bg-blue-100 text-blue-800 px-2 py-0.5 rounded w-max">QRIS</span>
                      ) : (
                        <span className="block mt-1 text-[10px] font-medium bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded w-max">Tunai</span>
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
                    <td colSpan={7} className="p-8 text-center text-slate-500">
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
          <div className="p-4 bg-slate-800 border-t border-slate-700 flex flex-col md:flex-row justify-between items-center shrink-0 text-white rounded-b-2xl shadow-inner">
            <div className="flex gap-6 mb-4 md:mb-0 items-center">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Transaksi</div>
                <div className="text-lg font-bold text-white">{filteredTx.length} Nota</div>
              </div>
              <div className="w-px h-8 bg-slate-700"></div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Barang Terjual</div>
                <div className="text-lg font-bold text-blue-400">
                  {filteredTx.reduce((sum, tx) => sum + (tx.transaction_items?.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0) || 0), 0)} Item
                </div>
              </div>
            </div>
            <div className="flex gap-6 justify-end">
              <div className="text-right border-r border-slate-700 pr-6">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Tunai</div>
                <div className="text-lg font-bold text-emerald-400">
                  {formatPrice(filteredTx.filter(tx => tx.payment_method !== 'qris').reduce((sum, tx) => sum + (tx.total || 0), 0))}
                </div>
              </div>
              <div className="text-right border-r border-slate-700 pr-6">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">QRIS</div>
                <div className="text-lg font-bold text-blue-400">
                  {formatPrice(filteredTx.filter(tx => tx.payment_method === 'qris').reduce((sum, tx) => sum + (tx.total || 0), 0))}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Omzet Bersih</div>
                <div className="text-xl font-black text-white">
                  {formatPrice(filteredTx.reduce((sum, tx) => sum + (tx.total || 0), 0))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Bar for Deletion */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-50 animate-in slide-in-from-bottom-10">
          <div className="flex items-center gap-3 border-r border-slate-700 pr-6">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-xs font-bold">
              {selectedIds.length}
            </span>
            <span className="font-medium">Transaksi Terpilih</span>
          </div>
          <button 
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 px-3 py-1.5 rounded-lg transition-colors font-medium text-sm"
          >
            <Trash2 size={16} /> Hapus Terpilih
          </button>
          <button 
            onClick={() => setSelectedIds([])}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors ml-2"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
                <AlertTriangle size={24} />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Hapus {selectedIds.length} Transaksi?</h2>
              <p className="text-slate-500 text-sm mb-6">
                Tindakan ini akan menghapus nota transaksi beserta seluruh riwayat penjualan di dalamnya.
              </p>

              <label className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                <input 
                  type="checkbox" 
                  checked={revertStock}
                  onChange={e => setRevertStock(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="font-semibold text-slate-700 text-sm">Kembalikan stok produk?</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Stok barang yang ada di dalam nota tersebut akan ditambahkan kembali secara otomatis ke gudang/master produk. (Direkomendasikan)
                  </div>
                </div>
              </label>
            </div>
            
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors text-sm"
                disabled={isDeleting}
              >
                Batal
              </button>
              <button 
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50 text-sm shadow-sm"
              >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Ya, Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
