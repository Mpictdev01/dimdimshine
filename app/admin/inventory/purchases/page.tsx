'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Plus, Loader2, X, Save, Search, Trash2, ShoppingCart } from 'lucide-react';
import { createPurchase } from '@/app/actions/purchase';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminPurchases() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [note, setNote] = useState('');
  const [cartItems, setCartItems] = useState<{product_id: string, name: string, qty: number, buy_price: number}[]>([]);
  
  // Product Selection State
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const [purRes, supRes, prodRes] = await Promise.all([
      supabase.from('purchases').select('*, suppliers(name)').order('created_at', { ascending: false }),
      supabase.from('suppliers').select('*').order('name'),
      supabase.from('products').select('*, units(name)').order('name')
    ]);
    
    if (purRes.data) setPurchases(purRes.data);
    if (supRes.data) setSuppliers(supRes.data);
    if (prodRes.data) setProducts(prodRes.data);
    
    setIsLoading(false);
  };

  const openModal = () => {
    setSelectedSupplier('');
    setNote('');
    setCartItems([]);
    setSearchQuery('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const addItemToCart = (product: any) => {
    const existing = cartItems.find(item => item.product_id === product.id);
    if (existing) {
      setCartItems(cartItems.map(item => 
        item.product_id === product.id ? { ...item, qty: item.qty + 1 } : item
      ));
    } else {
      setCartItems([...cartItems, {
        product_id: product.id,
        name: product.name,
        qty: 1,
        buy_price: 0
      }]);
    }
    setSearchQuery('');
  };

  const updateCartItem = (id: string, field: 'qty' | 'buy_price', value: number) => {
    setCartItems(cartItems.map(item => 
      item.product_id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeCartItem = (id: string) => {
    setCartItems(cartItems.filter(item => item.product_id !== id));
  };

  const totalAmount = cartItems.reduce((sum, item) => sum + (item.qty * item.buy_price), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) {
      alert('Pilih supplier terlebih dahulu!');
      return;
    }
    if (cartItems.length === 0) {
      alert('Tambahkan setidaknya 1 produk!');
      return;
    }
    // Cek harga beli 0
    if (cartItems.some(i => i.buy_price <= 0)) {
      if(!confirm('Ada barang dengan Harga Beli Rp 0. Lanjutkan?')) return;
    }

    setIsSubmitting(true);

    const res = await createPurchase(
      selectedSupplier,
      cartItems.map(i => ({ product_id: i.product_id, qty: Number(i.qty), buy_price: Number(i.buy_price) })),
      note,
      totalAmount
    );

    if (res.success) {
      alert('Berhasil mencatat pembelian barang masuk. Stok telah ditambahkan otomatis!');
      closeModal();
      fetchData(); // Refresh history
    } else {
      alert('Gagal mencatat pembelian: ' + res.error);
    }
    setIsSubmitting(false);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="p-8 h-full relative flex flex-col">
      <div className="flex justify-between items-center mb-8 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pembelian (Barang Masuk)</h1>
          <p className="text-slate-500">Catat pembelian dari supplier/pabrik untuk menambah stok secara otomatis.</p>
        </div>
        <button 
          onClick={openModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <ShoppingCart size={20} />
          Catat Pembelian Baru
        </button>
      </div>

      {/* Tabel Riwayat Pembelian */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col flex-1 min-h-0">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <h3 className="font-semibold text-slate-700">Riwayat Pembelian Terakhir</h3>
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
                  <th className="font-medium p-4 pl-6 w-48">Tanggal</th>
                  <th className="font-medium p-4">Supplier</th>
                  <th className="font-medium p-4">Catatan</th>
                  <th className="font-medium p-4 text-right pr-6">Total Belanja</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchases.map((pur) => (
                  <tr key={pur.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 pl-6 text-slate-600 font-medium">
                      {new Date(pur.created_at).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit'})}
                    </td>
                    <td className="p-4 font-semibold text-slate-800">
                      {pur.suppliers?.name || 'Tidak Diketahui'}
                    </td>
                    <td className="p-4 text-slate-600">
                      {pur.note || '-'}
                    </td>
                    <td className="p-4 pr-6 text-right font-bold text-slate-800">
                      {formatPrice(pur.total_amount)}
                    </td>
                  </tr>
                ))}
                {purchases.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">
                      Belum ada riwayat pembelian.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Form Pembelian */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Pencatatan Barang Masuk</h2>
                <p className="text-sm text-slate-500">Stok produk akan bertambah secara otomatis</p>
              </div>
              <button onClick={closeModal} className="p-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Pilih Supplier</label>
                  <select 
                    required
                    value={selectedSupplier}
                    onChange={e => setSelectedSupplier(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-colors" 
                  >
                    <option value="">-- Pilih Supplier --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">No. Faktur / Catatan Tambahan (Opsional)</label>
                  <input 
                    type="text" 
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-colors" 
                    placeholder="Misal: INV-20230101-A" 
                  />
                </div>
              </div>

              {/* Pencarian Produk */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-3">Pilih Produk (Yang Dibeli)</label>
                <div className="relative mb-4">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search size={18} />
                  </div>
                  <input
                    type="text"
                    placeholder="Cari nama produk untuk ditambahkan..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-colors"
                  />
                </div>

                {searchQuery && (
                  <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-lg divide-y divide-slate-100 mb-4">
                    {filteredProducts.map(prod => (
                      <div 
                        key={prod.id} 
                        onClick={() => addItemToCart(prod)}
                        className="p-3 hover:bg-blue-50 cursor-pointer flex justify-between items-center group transition-colors"
                      >
                        <span className="font-medium text-slate-800">{prod.name}</span>
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded group-hover:bg-blue-100 group-hover:text-blue-700">
                          + Tambah
                        </span>
                      </div>
                    ))}
                    {filteredProducts.length === 0 && (
                      <div className="p-3 text-sm text-slate-500 text-center">Produk tidak ditemukan</div>
                    )}
                  </div>
                )}
              </div>

              {/* Rincian Cart Pembelian */}
              {cartItems.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-4">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr className="text-slate-600 text-sm">
                        <th className="font-semibold p-3 pl-4">Produk</th>
                        <th className="font-semibold p-3 w-32">Kuantitas (Masuk)</th>
                        <th className="font-semibold p-3 w-40">Harga Beli Satuan (Rp)</th>
                        <th className="font-semibold p-3 w-40 text-right">Subtotal</th>
                        <th className="font-semibold p-3 w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {cartItems.map(item => (
                        <tr key={item.product_id} className="hover:bg-slate-50/50">
                          <td className="p-3 pl-4 font-medium text-slate-800">{item.name}</td>
                          <td className="p-3">
                            <input 
                              type="number" 
                              min="0" step="0.01"
                              value={item.qty}
                              onChange={e => updateCartItem(item.product_id, 'qty', Number(e.target.value))}
                              className="w-full px-2 py-1 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className="p-3">
                            <input 
                              type="number" 
                              min="0"
                              value={item.buy_price}
                              onChange={e => updateCartItem(item.product_id, 'buy_price', Number(e.target.value))}
                              className="w-full px-2 py-1 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className="p-3 text-right font-medium text-slate-700">
                            {formatPrice(item.qty * item.buy_price)}
                          </td>
                          <td className="p-3 text-right">
                            <button 
                              onClick={() => removeCartItem(item.product_id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer Total & Submit */}
            <div className="border-t border-slate-200 bg-white p-6 shrink-0 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Total Tagihan Pembelian</p>
                <p className="text-2xl font-bold text-slate-800">{formatPrice(totalAmount)}</p>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={closeModal} className="px-6 py-3 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors">
                  Batal
                </button>
                <button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting || cartItems.length === 0} 
                  className="px-8 py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-sm"
                >
                  {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} 
                  Simpan & Tambah Stok
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
