'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Plus, Loader2, X, Save, Search, Trash2, ShoppingCart, CheckSquare, Square, Check, ArrowRight, PackageCheck } from 'lucide-react';
import { createPurchase } from '@/app/actions/purchase';
import clsx from 'clsx';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface CartItem {
  id: string;
  name: string;
  qty: number;
  buy_price: number;
  type: 'product' | 'ingredient';
  current_stock: number;
  unit: string;
  yield_quantity: number;
  yield_unit?: string;
}

export default function AdminPurchases() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [note, setNote] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  
  // Product/Ingredient Multi-Selection State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'product' | 'ingredient'>('ingredient');
  const [selectedItemKeys, setSelectedItemKeys] = useState<string[]>([]);
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const [purRes, supRes, prodRes, ingRes] = await Promise.all([
      supabase.from('purchases').select('*, suppliers(name)').order('created_at', { ascending: false }),
      supabase.from('suppliers').select('*').order('name'),
      supabase.from('products').select('*, units(name)').order('name'),
      supabase.from('ingredients').select('*').order('name')
    ]);
    
    if (purRes.data) setPurchases(purRes.data);
    if (supRes.data) setSuppliers(supRes.data);
    if (prodRes.data) setProducts(prodRes.data);
    if (ingRes.data) setIngredients(ingRes.data);
    
    setIsLoading(false);
  };

  const openModal = () => {
    setSelectedSupplier('');
    setNote('');
    setCartItems([]);
    setSelectedItemKeys([]);
    setSearchQuery('');
    setSearchType('ingredient');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const getItemKey = (id: string, type: 'product' | 'ingredient') => `${type}-${id}`;

  const isCartItem = (id: string, type: 'product' | 'ingredient') => {
    return cartItems.some(c => c.id === id && c.type === type);
  };

  const toggleItemSelection = (id: string, type: 'product' | 'ingredient') => {
    if (isCartItem(id, type)) return; // Already in cart
    const key = getItemKey(id, type);
    if (selectedItemKeys.includes(key)) {
      setSelectedItemKeys(selectedItemKeys.filter(k => k !== key));
    } else {
      setSelectedItemKeys([...selectedItemKeys, key]);
    }
  };

  const filteredItems = (searchType === 'product' ? products : ingredients).filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectAll = () => {
    const availableKeys = filteredItems
      .filter(item => !isCartItem(item.id, searchType))
      .map(item => getItemKey(item.id, searchType));

    const allSelected = availableKeys.every(k => selectedItemKeys.includes(k));

    if (allSelected) {
      setSelectedItemKeys(selectedItemKeys.filter(k => !availableKeys.includes(k)));
    } else {
      const merged = Array.from(new Set([...selectedItemKeys, ...availableKeys]));
      setSelectedItemKeys(merged);
    }
  };

  const addSelectedItemsToCart = () => {
    const newCart = [...cartItems];

    if (searchType === 'ingredient') {
      ingredients.forEach(ing => {
        const key = getItemKey(ing.id, 'ingredient');
        if (selectedItemKeys.includes(key) && !isCartItem(ing.id, 'ingredient')) {
          const yieldQty = parseFloat(ing.yield_quantity || '1');
          const defaultBuyPrice = ing.cost_price ? Number(ing.cost_price) * yieldQty : 0;
          newCart.push({
            id: ing.id,
            name: ing.name,
            qty: 1,
            buy_price: defaultBuyPrice,
            type: 'ingredient',
            current_stock: Number(ing.current_stock || 0),
            unit: ing.unit || 'unit',
            yield_quantity: yieldQty,
            yield_unit: ing.yield_unit || ing.unit
          });
        }
      });
    } else {
      products.forEach(prod => {
        const key = getItemKey(prod.id, 'product');
        if (selectedItemKeys.includes(key) && !isCartItem(prod.id, 'product')) {
          newCart.push({
            id: prod.id,
            name: prod.name,
            qty: 1,
            buy_price: Number(prod.cost_price || 0),
            type: 'product',
            current_stock: Number(prod.stock || 0),
            unit: prod.units?.name || 'pcs',
            yield_quantity: 1
          });
        }
      });
    }

    setCartItems(newCart);
    setSelectedItemKeys(selectedItemKeys.filter(k => !k.startsWith(`${searchType}-`)));
    setTimeout(() => {
      document.getElementById('cart-details-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const updateCartItem = (id: string, type: 'product' | 'ingredient', field: 'qty' | 'buy_price', value: number) => {
    setCartItems(cartItems.map(c => 
      (c.id === id && c.type === type) ? { ...c, [field]: value } : c
    ));
  };

  const removeCartItem = (id: string, type: 'product' | 'ingredient') => {
    setCartItems(cartItems.filter(c => !(c.id === id && c.type === type)));
  };

  const totalAmount = cartItems.reduce((sum, item) => sum + (item.qty * item.buy_price), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) {
      alert('Pilih supplier terlebih dahulu!');
      return;
    }
    if (cartItems.length === 0) {
      alert('Tambahkan setidaknya 1 produk/bahan baku!');
      return;
    }
    if (cartItems.some(i => i.buy_price <= 0)) {
      if(!confirm('Ada barang dengan Harga Beli Rp 0. Lanjutkan?')) return;
    }

    setIsSubmitting(true);

    const payload = cartItems.map(i => ({
      product_id: i.type === 'product' ? i.id : undefined,
      ingredient_id: i.type === 'ingredient' ? i.id : undefined,
      qty: Number(i.qty),
      buy_price: Number(i.buy_price),
      type: i.type
    }));

    const res = await createPurchase(
      selectedSupplier,
      payload,
      note,
      totalAmount
    );

    if (res.success) {
      alert('Berhasil mencatat pembelian barang masuk. Stok telah ditambahkan otomatis!');
      closeModal();
      fetchData();
    } else {
      alert('Gagal mencatat pembelian: ' + res.error);
    }
    setIsSubmitting(false);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
  };

  const selectedCountForCurrentTab = filteredItems.filter(i => selectedItemKeys.includes(getItemKey(i.id, searchType))).length;

  return (
    <div className="p-4 md:p-8 h-full relative flex flex-col">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-4 md:mb-8 shrink-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">Pembelian (Barang Masuk)</h1>
          <p className="text-slate-500 text-sm">Catat pembelian dari supplier/pabrik untuk menambah stok secara otomatis.</p>
        </div>
        <button 
          onClick={openModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm self-start sm:self-auto"
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
          <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[92vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Pencatatan Barang Masuk (Multi-Select)</h2>
                <p className="text-sm text-slate-500">Pilih banyak bahan baku/produk sekaligus & pantau sisa stok otomatis</p>
              </div>
              <button onClick={closeModal} className="p-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Pilih Supplier</label>
                  <select 
                    required
                    value={selectedSupplier}
                    onChange={e => setSelectedSupplier(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-colors text-slate-800" 
                  >
                    <option value="">-- Pilih Supplier --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">No. Faktur / Catatan (Opsional)</label>
                  <input 
                    type="text" 
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-colors text-slate-800" 
                    placeholder="Misal: INV-2026-0701 / Faktur Kios" 
                  />
                </div>
              </div>

              {/* Multi-Select Item Selection Box */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => { setSearchType('ingredient'); setSelectedItemKeys([]); }}
                      className={clsx("font-semibold pb-2 border-b-2 transition-colors flex items-center gap-2", searchType === 'ingredient' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700")}
                    >
                      Beli Bahan Baku
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSearchType('product'); setSelectedItemKeys([]); }}
                      className={clsx("font-semibold pb-2 border-b-2 transition-colors flex items-center gap-2", searchType === 'product' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700")}
                    >
                      Beli Produk Jadi
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <CheckSquare size={14} />
                      Pilih Semua ({filteredItems.filter(i => !isCartItem(i.id, searchType)).length})
                    </button>
                  </div>
                </div>

                <div className="relative mb-3">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search size={18} />
                  </div>
                  <input
                    type="text"
                    placeholder={`Cari nama ${searchType === 'ingredient' ? 'bahan baku' : 'produk'} untuk dicentang sekaligus...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 text-slate-800 transition-colors"
                  />
                </div>

                {/* Grid Checklist Item */}
                <div className="max-h-56 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-100 bg-slate-50/50 p-1">
                  {filteredItems.map(item => {
                    const alreadyInCart = isCartItem(item.id, searchType);
                    const isChecked = selectedItemKeys.includes(getItemKey(item.id, searchType)) || alreadyInCart;
                    const stockVal = searchType === 'ingredient' ? (item.current_stock || 0) : (item.stock || 0);
                    const unitName = searchType === 'ingredient' ? (item.unit || 'unit') : (item.units?.name || 'pcs');

                    return (
                      <div 
                        key={item.id} 
                        onClick={() => toggleItemSelection(item.id, searchType)}
                        className={clsx(
                          "p-3 rounded-lg flex items-center justify-between transition-colors cursor-pointer select-none",
                          alreadyInCart ? "bg-emerald-50/70 opacity-75 cursor-default" : isChecked ? "bg-blue-50 border border-blue-200" : "hover:bg-white"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-blue-600">
                            {alreadyInCart ? (
                              <CheckSquare size={20} className="text-emerald-600" />
                            ) : isChecked ? (
                              <CheckSquare size={20} className="text-blue-600" />
                            ) : (
                              <Square size={20} className="text-slate-300" />
                            )}
                          </div>
                          <div>
                            <span className={clsx("font-semibold text-sm", alreadyInCart ? "text-emerald-900" : "text-slate-800")}>
                              {item.name}
                            </span>
                            {alreadyInCart && (
                              <span className="ml-2 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                Sudah di keranjang
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Stok Saat Ini Indicator */}
                        <div className="text-right">
                          <span className="text-xs text-slate-500 block">Stok Saat Ini:</span>
                          <span className={clsx("text-xs font-bold px-2 py-0.5 rounded-md inline-block mt-0.5", stockVal <= 5 ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-700")}>
                            {stockVal} {unitName}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {filteredItems.length === 0 && (
                    <div className="p-4 text-sm text-slate-500 text-center">Data tidak ditemukan</div>
                  )}
                </div>

                {/* Tombol Tambahkan Item Terpilih Batch */}
                <div className="mt-3 flex justify-between items-center bg-blue-50/70 p-3 rounded-xl border border-blue-100">
                  <div className="text-sm font-medium text-blue-900 flex items-center gap-2">
                    <PackageCheck size={18} className="text-blue-600" />
                    <span>{selectedCountForCurrentTab} item dicentang</span>
                  </div>
                  <button
                    type="button"
                    disabled={selectedCountForCurrentTab === 0}
                    onClick={addSelectedItemsToCart}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 font-bold text-sm text-white rounded-lg transition-colors shadow-sm flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Tambahkan ({selectedCountForCurrentTab}) Item ke Rincian
                  </button>
                </div>
              </div>

              {/* Rincian Cart Pembelian & Kalkulasi Hasil Akhir Stok */}
              {cartItems.length > 0 ? (
                <div id="cart-details-section" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-4 animate-in fade-in-50 duration-200">
                  <div className="p-3 bg-blue-50/80 border-b border-blue-100 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-blue-900 flex items-center gap-2">
                        <ShoppingCart size={16} className="text-blue-600" />
                        Rincian Barang Masuk ({cartItems.length} Item)
                      </h4>
                      <p className="text-xs text-blue-700 mt-0.5">
                        💡 <strong>Ubah Qty & Harga Beli</strong> pada kolom di bawah ini. Stok database <u>belum bertambah</u> sebelum tombol Simpan diklik.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCartItems([])}
                      className="text-xs text-red-600 hover:underline font-semibold self-start sm:self-auto shrink-0"
                    >
                      Kosongkan Semua
                    </button>
                  </div>
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr className="text-slate-600 text-xs uppercase font-bold">
                        <th className="p-3 pl-4">Item (Tipe)</th>
                        <th className="p-3 w-28 text-center">Stok Awal</th>
                        <th className="p-3 w-32">Tambah Qty</th>
                        <th className="p-3 w-36 text-center">Hasil Akhir Stok</th>
                        <th className="p-3 w-36">Harga Beli (Rp)</th>
                        <th className="p-3 w-36 text-right">Subtotal</th>
                        <th className="p-3 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cartItems.map(item => {
                        const yieldQty = item.yield_quantity || 1;
                        const addedConverted = item.qty * yieldQty;
                        const finalStock = (item.current_stock || 0) + addedConverted;
                        const displayUnit = (item.type === 'ingredient' && item.yield_unit) ? item.yield_unit : item.unit;

                        return (
                          <tr key={`${item.type}-${item.id}`} className="hover:bg-slate-50/60 transition-colors">
                            <td className="p-3 pl-4">
                              <div className="font-bold text-slate-800 text-sm">{item.name}</div>
                              <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                <span className={clsx("px-1.5 py-0.5 rounded text-[10px] font-semibold", item.type === 'ingredient' ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800")}>
                                  {item.type === 'ingredient' ? 'Bahan Baku' : 'Produk Jadi'}
                                </span>
                                {item.type === 'ingredient' && yieldQty > 1 && (
                                  <span className="text-[11px] text-slate-400">(1 beli = {yieldQty} {displayUnit})</span>
                                )}
                              </div>
                            </td>
                            
                            {/* Stok Awal */}
                            <td className="p-3 text-center">
                              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-md inline-block">
                                {item.current_stock} {displayUnit}
                              </span>
                            </td>

                            {/* Tambah Qty */}
                            <td className="p-3">
                              <input 
                                type="number" 
                                min="0.01" step="any"
                                value={item.qty}
                                onChange={e => updateCartItem(item.id, item.type, 'qty', Math.max(0, Number(e.target.value)))}
                                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                              />
                            </td>

                            {/* Hasil Akhir Stok */}
                            <td className="p-3 text-center">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <ArrowRight size={12} className="text-emerald-500 shrink-0" />
                                {finalStock} {displayUnit}
                              </span>
                            </td>

                            {/* Harga Beli */}
                            <td className="p-3">
                              <input 
                                type="number" 
                                min="0"
                                value={item.buy_price}
                                onChange={e => updateCartItem(item.id, item.type, 'buy_price', Math.max(0, Number(e.target.value)))}
                                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                              />
                            </td>

                            {/* Subtotal */}
                            <td className="p-3 text-right font-bold text-slate-800 text-sm">
                              {formatPrice(item.qty * item.buy_price)}
                            </td>

                            <td className="p-3 text-right">
                              <button 
                                onClick={() => removeCartItem(item.id, item.type)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Hapus item"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 bg-slate-100/60 rounded-xl border border-dashed border-slate-300 text-center text-slate-500 text-sm">
                  Belum ada item di rincian. Centang item di atas lalu klik <strong>"Tambahkan Item ke Rincian"</strong>.
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 bg-white p-4 md:p-6 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Total Tagihan Pembelian</p>
                <p className="text-2xl font-bold text-emerald-600">{formatPrice(totalAmount)}</p>
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
