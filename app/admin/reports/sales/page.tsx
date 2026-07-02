'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Loader2, Search, FileText, Printer, FileDown } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminSalesReports() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Untuk Modal Cetak
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [printType, setPrintType] = useState<'surat_jalan' | 'faktur' | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        customers(name, address, phone),
        transaction_items(
          quantity, price,
          products(name, units(name))
        )
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTransactions(data);
    }
    setIsLoading(false);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
  };

  const filteredTx = transactions.filter(tx => {
    const matchSearch = tx.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (tx.customers?.name && tx.customers.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchStatus = filterStatus === 'all' || tx.payment_status === filterStatus;
    
    return matchSearch && matchStatus;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-8 h-full relative flex flex-col">
      <div className="flex justify-between items-center mb-8 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Riwayat Penjualan & Cetak</h1>
          <p className="text-slate-500">Lihat semua riwayat transaksi dari POS dan cetak Surat Jalan / Faktur.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col flex-1 min-h-0">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div className="relative w-80">
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
          
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            <option value="all">Semua Status</option>
            <option value="paid">Lunas</option>
            <option value="unpaid">Piutang (Tempo)</option>
          </select>
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
                  <th className="font-medium p-4 pl-6">Tanggal & Jam</th>
                  <th className="font-medium p-4">ID Transaksi</th>
                  <th className="font-medium p-4">Pelanggan (Toko)</th>
                  <th className="font-medium p-4">Tipe Pembayaran</th>
                  <th className="font-medium p-4 text-right">Total Nominal</th>
                  <th className="font-medium p-4 text-right pr-6 w-56">Cetak Dokumen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTx.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 pl-6 text-slate-600 font-medium whitespace-nowrap">
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
                    <td className="p-4">
                      {tx.payment_method === 'tempo' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-100 text-amber-800">Tempo (Piutang)</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-100 text-emerald-800">Lunas</span>
                      )}
                    </td>
                    <td className="p-4 text-right font-bold text-slate-800">
                      {formatPrice(tx.total || 0)}
                    </td>
                    <td className="p-4 pr-6 text-right space-x-2 whitespace-nowrap">
                      <button 
                        onClick={() => { setSelectedTx(tx); setPrintType('surat_jalan'); }}
                        className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center gap-1.5"
                      >
                        <FileText size={14} /> Surat Jalan
                      </button>
                      <button 
                        onClick={() => { setSelectedTx(tx); setPrintType('faktur'); }}
                        className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors inline-flex items-center gap-1.5"
                      >
                        <FileDown size={14} /> Faktur
                      </button>
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
      </div>

      {/* Modal Cetak (Print Preview) */}
      {selectedTx && printType && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 print:bg-white print:p-0 print:block">
          
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden print:shadow-none print:max-h-none print:rounded-none">
            
            {/* Header Controls (Sembunyi saat diprint) */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 print:hidden shrink-0">
              <h2 className="font-bold text-slate-700 flex items-center gap-2">
                <Printer size={18} /> Preview {printType === 'surat_jalan' ? 'Surat Jalan' : 'Faktur Penagihan'}
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
            <div className="flex-1 overflow-auto p-8 print:p-0 bg-slate-100 print:bg-white flex justify-center">
              <div className="bg-white p-8 border border-slate-200 shadow-sm print:border-none print:shadow-none w-full max-w-[21cm] min-h-[29.7cm] text-slate-900 print:min-h-0">
                
                {/* Kop Surat */}
                <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-6">
                  <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight">
                      {printType === 'surat_jalan' ? 'SURAT JALAN' : 'FAKTUR PENJUALAN'}
                    </h1>
                    <p className="text-sm mt-1 font-medium">CV. OKAX DISTRIBUSI NUSANTARA</p>
                    <p className="text-xs text-slate-600">Jl. Raya Pusat Perdagangan No. 88, Kota<br/>Telp: 0812-3456-7890</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="mb-1"><span className="text-slate-500">Tanggal:</span> <strong className="font-semibold">{new Date(selectedTx.created_at).toLocaleDateString('id-ID')}</strong></p>
                    <p className="mb-1"><span className="text-slate-500">No. Dok:</span> <strong className="font-semibold">{selectedTx.id.split('-')[0].toUpperCase()}</strong></p>
                    {printType === 'faktur' && selectedTx.payment_method === 'tempo' && (
                      <p className="mb-1 text-red-600"><span className="text-red-500">Jatuh Tempo:</span> <strong className="font-semibold">{new Date(selectedTx.due_date).toLocaleDateString('id-ID')}</strong></p>
                    )}
                  </div>
                </div>

                <div className="mb-8">
                  <p className="text-xs text-slate-500 font-medium uppercase mb-1">Penerima / Kepada Yth:</p>
                  <h3 className="text-lg font-bold">{selectedTx.customers?.name || (selectedTx.table_number ? `Baru: ${selectedTx.table_number}` : 'Pelanggan Umum')}</h3>
                  <p className="text-sm">{selectedTx.customers?.address || '-'}</p>
                  <p className="text-sm">Telp: {selectedTx.customers?.phone || '-'}</p>
                  {selectedTx.customers?.name && selectedTx.table_number && (
                    <p className="text-sm mt-1 font-medium">Catatan: {selectedTx.table_number}</p>
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
                    {selectedTx.transaction_items?.map((item: any, idx: number) => (
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
                        <td className="py-3 px-2 text-right text-lg">{formatPrice(selectedTx.total || 0)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>

                {/* Tanda Tangan */}
                <div className="grid grid-cols-3 gap-8 text-center text-sm mt-16 pt-8">
                  <div>
                    <p className="mb-16">Penerima / Toko</p>
                    <div className="border-b border-slate-400 w-3/4 mx-auto"></div>
                  </div>
                  <div>
                    <p className="mb-16">Sopir / Pengirim</p>
                    <div className="border-b border-slate-400 w-3/4 mx-auto"></div>
                  </div>
                  <div>
                    <p className="mb-16">Admin / Keuangan</p>
                    <div className="border-b border-slate-400 w-3/4 mx-auto"></div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
