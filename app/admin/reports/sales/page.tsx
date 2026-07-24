'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Loader2, Search, FileText, Printer, FileDown, Trash2 } from 'lucide-react';
import { deleteTransaction } from '@/app/actions/transaction';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminSalesReports() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Filter Tanggal
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Multi-Checklist
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Paginasi
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const ITEMS_PER_PAGE = 25;

  // Untuk Modal Cetak
  const [selectedTx, setSelectedTx] = useState<any | any[]>(null);
  const [printType, setPrintType] = useState<'surat_jalan' | 'faktur' | null>(null);

  // Untuk Modal Hapus
  const [txToDelete, setTxToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [shouldRestoreStock, setShouldRestoreStock] = useState(true);

  useEffect(() => {
    fetchTransactions();
    setSelectedIds([]); // Reset seleksi tiap kali pindah halaman/filter
  }, [currentPage, filterStatus, startDate, endDate]); 

  const fetchTransactions = async () => {
    setIsLoading(true);
    
    // Hitung range pagination
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase
      .from('transactions')
      .select(`
        *,
        customers(name, address, phone),
        transaction_items(
          quantity, price,
          products(name, units(name))
        )
      `, { count: 'exact' });

    // Filter status di server side (jika bukan 'all')
    if (filterStatus !== 'all') {
      query = query.eq('payment_method', filterStatus);
    }

    // Filter tanggal
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      query = query.gte('created_at', start.toISOString());
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query = query.lte('created_at', end.toISOString());
    }
    
    // Eksekusi query dengan range
    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (!error && data) {
      setTransactions(data);
      if (count !== null) {
        setTotalItems(count);
        setTotalPages(Math.ceil(count / ITEMS_PER_PAGE));
      }
    }
    setIsLoading(false);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
  };

  // Search text dilakukan di client, atau bisa dipindah ke server jika butuh
  const filteredTx = transactions.filter(tx => {
    const matchSearch = tx.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (tx.customers?.name && tx.customers.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchSearch;
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDeleteConfirm = async () => {
    if (!txToDelete) return;
    setIsDeleting(true);
    const res = await deleteTransaction(txToDelete.id, shouldRestoreStock);
    setIsDeleting(false);
    
    if (res.success) {
      setTxToDelete(null);
      fetchTransactions(); // Refresh data
    } else {
      alert(res.error || 'Gagal menghapus transaksi.');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleting(true);
    let successCount = 0;
    
    for (const id of selectedIds) {
      const res = await deleteTransaction(id, shouldRestoreStock);
      if (res.success) successCount++;
    }
    
    setIsBulkDeleting(false);
    setShowBulkDeleteConfirm(false);
    setSelectedIds([]);
    
    alert(`Berhasil menghapus ${successCount} transaksi secara permanen.`);
    fetchTransactions();
  };

  const handleBulkPrint = (type: 'surat_jalan' | 'faktur') => {
    const txsToPrint = filteredTx.filter(tx => selectedIds.includes(tx.id));
    if (txsToPrint.length === 0) return;
    setSelectedTx(txsToPrint);
    setPrintType(type);
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
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="p-4 md:p-8 h-full relative flex flex-col">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-4 md:mb-8 shrink-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">Riwayat Penjualan & Cetak</h1>
          <p className="text-slate-500 text-sm">Lihat semua riwayat transaksi dari POS dan cetak Surat Jalan / Faktur.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col flex-1 min-h-0">
        <div className="p-4 border-b border-slate-100 flex flex-col gap-4 bg-slate-50 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={18} />
              </div>
              <input
                type="text"
                placeholder="Cari ID Transaksi atau Nama Toko..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500 font-medium">Periode:</span>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                />
                <span className="text-slate-400">-</span>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                />
              </div>

              <select 
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1); // Reset ke halaman 1 jika filter berubah
                }}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                <option value="all">Semua Metode</option>
                <option value="cash">Tunai</option>
                <option value="qris">QRIS</option>
              </select>
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {selectedIds.length > 0 && (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 p-3 rounded-xl animate-in fade-in slide-in-from-top-2 duration-200">
              <span className="text-blue-800 font-semibold px-2">{selectedIds.length} Transaksi Terpilih</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleBulkPrint('surat_jalan')}
                  className="px-4 py-1.5 bg-white border border-blue-200 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2"
                >
                  <FileText size={16} /> Cetak Multi Surat Jalan
                </button>
                <button 
                  onClick={() => handleBulkPrint('faktur')}
                  className="px-4 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2"
                >
                  <FileDown size={16} /> Cetak Multi Faktur
                </button>
                <button 
                  onClick={() => setShowBulkDeleteConfirm(true)}
                  className="px-4 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2 ml-4"
                >
                  <Trash2 size={16} /> Hapus Terpilih
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white shadow-sm z-10">
                <tr className="text-slate-500 text-sm border-b border-slate-200">
                  <th className="font-medium p-4 pl-6 w-12">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                      checked={filteredTx.length > 0 && selectedIds.length === filteredTx.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="font-medium p-4">Tanggal & Jam</th>
                  <th className="font-medium p-4">ID Transaksi</th>
                  <th className="font-medium p-4">Pelanggan (Toko)</th>
                  <th className="font-medium p-4 text-center">Metode</th>
                  <th className="font-medium p-4 text-right">Total Nominal</th>
                  <th className="font-medium p-4 text-right pr-6">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTx.map((tx) => (
                  <tr key={tx.id} className={`hover:bg-slate-50/50 transition-colors ${selectedIds.includes(tx.id) ? 'bg-blue-50/30' : ''}`}>
                    <td className="p-4 pl-6">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                        checked={selectedIds.includes(tx.id)}
                        onChange={() => handleSelectOne(tx.id)}
                      />
                    </td>
                    <td className="p-4 text-slate-600 font-medium whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit'})}
                    </td>
                    <td className="p-4 text-slate-500 text-sm">
                      {tx.id.split('-')[0].toUpperCase()}
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-800">
                        {tx.customers?.name || (tx.table_number ? `Baru: ${tx.table_number}` : 'Pelanggan Umum')}
                      </div>
                      {tx.customers?.name && tx.table_number && (
                        <div className="text-xs text-slate-500 mt-1">Catatan: {tx.table_number}</div>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {tx.payment_method === 'qris' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800">QRIS</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-100 text-emerald-800">Tunai</span>
                      )}
                    </td>
                    <td className="p-4 text-right font-bold text-slate-800">
                      {formatPrice(tx.total || 0)}
                    </td>
                    <td className="p-4 pr-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => { setSelectedTx(tx); setPrintType('surat_jalan'); }}
                          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors tooltip-trigger"
                          title="Cetak Surat Jalan"
                        >
                          <FileText size={18} />
                        </button>
                        <button 
                          onClick={() => { setSelectedTx(tx); setPrintType('faktur'); }}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors tooltip-trigger"
                          title="Cetak Faktur"
                        >
                          <FileDown size={18} />
                        </button>
                        <button 
                          onClick={() => setTxToDelete(tx)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors tooltip-trigger"
                          title="Hapus Transaksi (Void)"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredTx.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      Tidak ada riwayat penjualan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Controls */}
        {!isLoading && totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
            <span className="text-sm text-slate-500">
              Menampilkan <span className="font-medium text-slate-800">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> hingga <span className="font-medium text-slate-800">{Math.min(currentPage * ITEMS_PER_PAGE, totalItems)}</span> dari <span className="font-medium text-slate-800">{totalItems}</span> transaksi
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm font-medium border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
              >
                Sebelumnya
              </button>
              <div className="text-sm font-medium text-slate-700 px-2">
                Hal {currentPage} / {totalPages}
              </div>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm font-medium border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Konfirmasi Hapus */}
      {txToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <Trash2 className="text-red-600" size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Hapus Transaksi?</h3>
              <p className="text-slate-500 text-sm mb-4">
                Anda yakin ingin menghapus transaksi <strong>{txToDelete.id.split('-')[0].toUpperCase()}</strong>?<br/><br/>
                <span className="text-red-600 font-semibold">Peringatan:</span> Data yang dihapus <strong>TIDAK BISA DIKEMBALIKAN</strong>.
              </p>

              <label className="flex items-start gap-3 w-full text-left bg-slate-50 p-3 rounded-lg border border-slate-200 mb-6 cursor-pointer hover:bg-slate-100 transition-colors">
                <input 
                  type="checkbox" 
                  className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  checked={shouldRestoreStock}
                  onChange={(e) => setShouldRestoreStock(e.target.checked)}
                  disabled={isDeleting}
                />
                <span className="text-sm text-slate-700">
                  <strong>Kembalikan Stok Barang</strong><br/>
                  Centang opsi ini jika Anda ingin stok barang pada transaksi ini dikembalikan (ditambahkan) ke dalam gudang secara otomatis.
                </span>
              </label>
              
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setTxToDelete(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
                  disabled={isDeleting}
                >
                  Batal
                </button>
                <button 
                  onClick={handleDeleteConfirm}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <><Loader2 size={18} className="animate-spin" /> Menghapus...</>
                  ) : (
                    'Ya, Hapus Permanen'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cetak (Print Preview) */}
      {selectedTx && printType && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 print:bg-white print:p-0 print:block">
          
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden print:shadow-none print:max-h-none print:rounded-none">
            
            {/* Header Controls (Sembunyi saat diprint) */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 print:hidden shrink-0">
              <h2 className="font-bold text-slate-700 flex items-center gap-2">
                <Printer size={18} /> Preview {printType === 'surat_jalan' ? 'Surat Jalan' : 'Faktur Penagihan'} {Array.isArray(selectedTx) ? `(${selectedTx.length} Dokumen)` : ''}
              </h2>
              <div className="flex gap-2">
                <button onClick={handlePrint} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors shadow-sm">
                  Cetak Sekarang
                </button>
                <button onClick={() => setSelectedTx(null)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg text-sm transition-colors">
                  Tutup
                </button>
              </div>
            </div>

            {/* Kertas Cetak */}
            <div className="flex-1 overflow-auto p-8 print:p-0 bg-slate-100 print:bg-white flex flex-col items-center">
              {(Array.isArray(selectedTx) ? selectedTx : [selectedTx]).map((tx, index, array) => (
                <div key={tx.id} className={`bg-white p-8 border border-slate-200 shadow-sm print:border-none print:shadow-none w-full max-w-[21cm] min-h-[29.7cm] text-slate-900 print:min-h-0 mb-8 print:mb-0 ${index !== array.length - 1 ? 'print:break-after-page' : ''}`}>
                  
                  {/* Kop Surat */}
                  <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-6">
                    <div>
                      <h1 className="text-3xl font-black uppercase tracking-tight">
                        {printType === 'surat_jalan' ? 'SURAT JALAN' : 'FAKTUR PENJUALAN'}
                      </h1>
                      <p className="text-sm mt-1 font-medium">CV. DIMDIM SHINE DISTRIBUSI NUSANTARA</p>
                      <p className="text-xs text-slate-600">Jl. Raya Pusat Perdagangan No. 88, Kota<br/>Telp: 0812-3456-7890</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="mb-1"><span className="text-slate-500">Tanggal:</span> <strong className="font-semibold">{new Date(tx.created_at).toLocaleDateString('id-ID')}</strong></p>
                      <p className="mb-1"><span className="text-slate-500">No. Dok:</span> <strong className="font-semibold">{tx.id.split('-')[0].toUpperCase()}</strong></p>
                      <p className="mb-1"><span className="text-slate-500">Pembayaran:</span> <strong className="font-semibold">{tx.payment_method === 'qris' ? 'QRIS' : 'TUNAI'}</strong></p>
                    </div>
                  </div>

                  <div className="mb-8">
                    <p className="text-xs text-slate-500 font-medium uppercase mb-1">Penerima / Kepada Yth:</p>
                    <h3 className="text-lg font-bold">{tx.customers?.name || (tx.table_number ? `Baru: ${tx.table_number}` : 'Pelanggan Umum')}</h3>
                    <p className="text-sm">{tx.customers?.address || '-'}</p>
                    <p className="text-sm">Telp: {tx.customers?.phone || '-'}</p>
                    {tx.customers?.name && tx.table_number && (
                      <p className="text-sm mt-1 font-medium">Catatan: {tx.table_number}</p>
                    )}
                  </div>

                  {/* Tabel Barang */}
                  <table className="w-full text-left text-sm mb-8 border-collapse">
                    <thead>
                      <tr className="border-y-2 border-slate-800">
                        <th className="py-2 px-2 font-bold">No</th>
                        <th className="py-2 px-2 font-bold">Nama Barang</th>
                        <th className="py-2 px-2 font-bold text-center">Qty</th>
                        {printType === 'faktur' && (
                          <>
                            <th className="py-2 px-2 font-bold text-right">Harga Satuan</th>
                            <th className="py-2 px-2 font-bold text-right">Subtotal</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {tx.transaction_items?.map((item: any, idx: number) => (
                        <tr key={idx}>
                          <td className="py-2 px-2">{idx + 1}</td>
                          <td className="py-2 px-2 font-semibold">{item.products?.name}</td>
                          <td className="py-2 px-2 text-center font-bold">
                            {item.quantity} <span className="text-xs font-normal text-slate-500">{item.products?.units?.name}</span>
                          </td>
                          {printType === 'faktur' && (
                            <>
                              <td className="py-2 px-2 text-right">{formatPrice(item.price)}</td>
                              <td className="py-2 px-2 text-right font-semibold">{formatPrice(item.price * item.quantity)}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                    {printType === 'faktur' && (
                      <tfoot className="border-t-2 border-slate-800 font-bold">
                        <tr>
                          <td colSpan={4} className="py-3 px-2 text-right uppercase">Total Tagihan</td>
                          <td className="py-3 px-2 text-right text-lg">{formatPrice(tx.total || 0)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>

                  {/* Tanda Tangan */}
                  <div className="grid grid-cols-3 gap-8 text-center text-sm mt-16 pt-8">
                    <div>
                      <p className="mb-16">Penerima / Toko</p>
                      <div className="border-b border-slate-400 w-3/4 mx-auto"></div>
                      <p className="mt-2 font-semibold">{tx.customers?.name || '__________________'}</p>
                    </div>
                    <div>
                      <p className="mb-16">Sopir / Pengirim</p>
                      <div className="border-b border-slate-400 w-3/4 mx-auto"></div>
                    </div>
                    <div>
                      <p className="mb-16">Hormat Kami,</p>
                      <div className="border-b border-slate-400 w-3/4 mx-auto"></div>
                      <p className="mt-2 font-semibold">CV. DIMDIM SHINE</p>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Bulk Delete */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <Trash2 className="text-red-600" size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Hapus {selectedIds.length} Transaksi?</h3>
              <p className="text-slate-500 text-sm mb-4">
                Anda yakin ingin menghapus <strong>{selectedIds.length} transaksi</strong> sekaligus secara massal?<br/><br/>
                <span className="text-red-600 font-semibold">Peringatan:</span> Data yang dihapus <strong>TIDAK BISA DIKEMBALIKAN</strong>.
              </p>

              <label className="flex items-start gap-3 w-full text-left bg-slate-50 p-3 rounded-lg border border-slate-200 mb-6 cursor-pointer hover:bg-slate-100 transition-colors">
                <input 
                  type="checkbox" 
                  className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  checked={shouldRestoreStock}
                  onChange={(e) => setShouldRestoreStock(e.target.checked)}
                  disabled={isBulkDeleting}
                />
                <span className="text-sm text-slate-700">
                  <strong>Kembalikan Stok Barang</strong><br/>
                  Centang opsi ini jika Anda ingin stok barang pada {selectedIds.length} transaksi ini dikembalikan ke dalam gudang secara otomatis.
                </span>
              </label>
              
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
                  disabled={isBulkDeleting}
                >
                  Batal
                </button>
                <button 
                  onClick={handleBulkDelete}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                  disabled={isBulkDeleting}
                >
                  {isBulkDeleting ? (
                    <><Loader2 size={18} className="animate-spin" /> Menghapus...</>
                  ) : (
                    'Ya, Hapus Permanen'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
