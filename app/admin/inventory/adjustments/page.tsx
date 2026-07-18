'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Search, Loader2, X, Save, History, ClipboardEdit, Trash2, Info, Package, TestTube2 } from 'lucide-react';
import { createStockAdjustment, deleteAdjustments } from '@/app/actions/inventory';
import clsx from 'clsx';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function StockAdjustments() {
  const router = useRouter();
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'product' | 'ingredient'>('product');
  
  // Products and Ingredients for the search in modal
  const [products, setProducts] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  
  // Form State
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk Delete State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [revertStock, setRevertStock] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const authStr = sessionStorage.getItem('admin_auth');
    if (!authStr) {
      router.push('/admin/login');
      return;
    }
    fetchAdjustments();
  }, [router]);

  const fetchAdjustments = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('stock_adjustments')
      .select('*, products(name, units(name)), ingredients(name, unit, yield_unit)')
      .order('created_at', { ascending: false });
    
    if (data) setAdjustments(data);
    setIsLoading(false);
  };

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*, units(name), categories(name)')
      .order('name');
    if (data) setProducts(data);
  };

  const fetchIngredients = async () => {
    const { data } = await supabase
      .from('ingredients')
      .select('*')
      .order('name');
    if (data) setIngredients(data);
  };

  const openModal = () => {
    setProductSearch('');
    setIngredientSearch('');
    setSelectedItem(null);
    setAdjustmentAmount('');
    setReason('');
    setNote('');
    fetchProducts();
    fetchIngredients();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const selectItem = (item: any) => {
    setSelectedItem(item);
    setAdjustmentAmount('');
    setProductSearch('');
    setIngredientSearch('');
  };

  const getOldStock = () => {
    if (!selectedItem) return 0;
    if (activeTab === 'product') return selectedItem.stock || 0;
    
    // For ingredients, the UI operates in the purchase unit.
    const yieldQty = parseFloat(selectedItem.yield_quantity || '1');
    const currentStockPcs = selectedItem.current_stock || 0;
    return parseFloat((currentStockPcs / yieldQty).toFixed(2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) {
      alert(`Pilih ${activeTab === 'product' ? 'produk' : 'bahan baku'} terlebih dahulu!`);
      return;
    }
    if (!reason) {
      alert('Pilih alasan penyesuaian!');
      return;
    }
    
    setIsSubmitting(true);

    const absAdj = Math.abs(parseFloat(adjustmentAmount));
    if (isNaN(absAdj) || absAdj === 0) {
      alert('Masukkan angka penyesuaian yang valid (tidak boleh 0)!');
      setIsSubmitting(false);
      return;
    }
    
    const adj = reason.includes('Mengurangi') ? -absAdj : absAdj;
    const oldStock = getOldStock();
    const newStock = oldStock + adj;
    
    if (newStock < 0) {
      alert('Stok hasil akhir tidak boleh negatif!');
      setIsSubmitting(false);
      return;
    }

    const res = await createStockAdjustment(selectedItem.id, activeTab, oldStock, newStock, reason, note);
      
    if (res.success) {
      alert('Penyesuaian stok berhasil dicatat!');
      fetchAdjustments(); // Refresh history
      closeModal();
    } else {
      alert('Gagal memperbarui stok: ' + res.error);
    }
    
    setIsSubmitting(false);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredHistory.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredHistory.map((a: any) => a.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const ids = Array.from(selectedIds);
    const res = await deleteAdjustments(ids, revertStock);
    if (res.success) {
      alert('Berhasil menghapus riwayat penyesuaian!');
      setSelectedIds(new Set());
      setIsDeleteModalOpen(false);
      fetchAdjustments();
    } else {
      alert('Gagal menghapus riwayat: ' + res.error);
    }
    setIsDeleting(false);
  };

  const filteredHistory = adjustments.filter(adj => {
    const itemName = adj.products?.name || adj.ingredients?.name || '';
    return itemName.toLowerCase().includes(searchQuery.toLowerCase()) || 
           adj.reason.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const searchedProducts = products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));
  const searchedIngredients = ingredients.filter(i => i.name.toLowerCase().includes(ingredientSearch.toLowerCase()));

  return (
    <div className="p-8 h-full relative flex flex-col">
      <div className="flex justify-between items-center mb-8 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Riwayat Penyesuaian Stok (Stock Opname)</h1>
          <p className="text-slate-500">Catatan jejak audit (Audit Trail) untuk semua perubahan stok manual.</p>
        </div>
        <button 
          onClick={openModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <ClipboardEdit size={20} />
          Catat Penyesuaian Baru
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col flex-1 min-h-0">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div className="relative w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Cari riwayat (nama item, alasan)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead className="sticky top-0 bg-white shadow-sm z-10">
                <tr className="text-slate-500 border-b border-slate-200">
                  <th className="p-4 pl-6 w-12">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      checked={filteredHistory.length > 0 && selectedIds.size === filteredHistory.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="font-medium p-4">Tanggal</th>
                  <th className="font-medium p-4">Nama Item</th>
                  <th className="font-medium p-4">Stok Lama</th>
                  <th className="font-medium p-4">Stok Baru</th>
                  <th className="font-medium p-4">Selisih</th>
                  <th className="font-medium p-4">Alasan</th>
                  <th className="font-medium p-4 pr-6">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.map((adj) => {
                  const isIngredient = !!adj.ingredient_id;
                  const itemName = isIngredient ? adj.ingredients?.name : adj.products?.name;
                  const unitName = isIngredient ? adj.ingredients?.unit : adj.products?.units?.name;
                  
                  return (
                    <tr key={adj.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 pl-6 w-12">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          checked={selectedIds.has(adj.id)}
                          onChange={() => toggleSelect(adj.id)}
                        />
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        {new Date(adj.created_at).toLocaleString('id-ID')}
                      </td>
                      <td className="p-4 font-semibold text-slate-800">
                        {itemName}
                        {isIngredient && (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700">
                            Bahan Baku
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-slate-500">
                        {adj.old_stock} <span className="text-xs">{unitName}</span>
                      </td>
                      <td className="p-4 font-medium text-slate-800">
                        {adj.new_stock} <span className="text-xs">{unitName}</span>
                      </td>
                      <td className="p-4">
                        {adj.difference > 0 ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-green-100 text-green-700">
                            +{adj.difference}
                          </span>
                        ) : adj.difference < 0 ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-red-100 text-red-700">
                            {adj.difference}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700">
                            0
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {adj.reason}
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-slate-500 text-xs max-w-[200px] truncate" title={adj.note || '-'}>
                        {adj.note || '-'}
                      </td>
                    </tr>
                  );
                })}
                
                {filteredHistory.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-12 text-center flex flex-col items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 text-slate-400">
                        <History size={32} />
                      </div>
                      <p className="text-slate-500 font-medium">Belum ada riwayat penyesuaian stok.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Tambah Penyesuaian */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl flex flex-col overflow-hidden max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Catat Penyesuaian Stok (Opname)</h2>
                <p className="text-xs text-slate-500">Sesuaikan fisik gudang dengan sistem.</p>
              </div>
              <button 
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 transition-colors p-2 bg-white rounded-full border border-slate-200"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Tabs */}
              <div className="flex border-b border-slate-100">
                <button
                  onClick={() => {
                    setActiveTab('product');
                    setSelectedItem(null);
                    setAdjustmentAmount('');
                  }}
                  className={clsx(
                    "flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors border-b-2",
                    activeTab === 'product' ? "border-blue-600 text-blue-600 bg-blue-50/30" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <Package size={18} />
                  Produk Jadi
                </button>
                <button
                  onClick={() => {
                    setActiveTab('ingredient');
                    setSelectedItem(null);
                    setAdjustmentAmount('');
                  }}
                  className={clsx(
                    "flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors border-b-2",
                    activeTab === 'ingredient' ? "border-purple-600 text-purple-600 bg-purple-50/30" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <TestTube2 size={18} />
                  Bahan Baku
                </button>
              </div>

              <div className="flex-1 overflow-auto p-6 flex gap-6">
                {/* Kiri: Pilih Item */}
                <div className="w-1/2 flex flex-col border-r border-slate-100 pr-6">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Pilih {activeTab === 'product' ? 'Produk' : 'Bahan Baku'}</label>
                  <div className="relative mb-4">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Search size={16} />
                    </div>
                    <input
                      type="text"
                      placeholder={`Cari nama ${activeTab === 'product' ? 'produk' : 'bahan baku'}...`}
                      value={activeTab === 'product' ? productSearch : ingredientSearch}
                      onChange={(e) => activeTab === 'product' ? setProductSearch(e.target.value) : setIngredientSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-[300px]">
                    {activeTab === 'product' && searchedProducts.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => selectItem(p)}
                        className={clsx(
                          "w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors text-sm",
                          selectedItem?.id === p.id ? "bg-blue-50 border-l-4 border-blue-500" : ""
                        )}
                      >
                        <div className="font-semibold text-slate-800">{p.name}</div>
                        <div className="text-xs text-slate-500">Stok saat ini: {p.stock || 0} {p.units?.name}</div>
                      </button>
                    ))}
                    {activeTab === 'product' && searchedProducts.length === 0 && (
                      <div className="p-4 text-center text-xs text-slate-400">Tidak ditemukan</div>
                    )}
                    
                    {activeTab === 'ingredient' && searchedIngredients.map(i => {
                      const yieldQty = parseFloat(i.yield_quantity || '1');
                      const currentPcs = i.current_stock || 0;
                      const purchaseUnitStock = currentPcs / yieldQty;
                      
                      return (
                        <button
                          key={i.id}
                          type="button"
                          onClick={() => selectItem(i)}
                          className={clsx(
                            "w-full text-left px-4 py-3 hover:bg-purple-50 transition-colors text-sm",
                            selectedItem?.id === i.id ? "bg-purple-50 border-l-4 border-purple-500" : ""
                          )}
                        >
                          <div className="font-semibold text-slate-800">{i.name}</div>
                          <div className="text-xs text-slate-500">
                            Fisik: {purchaseUnitStock.toFixed(2)} {i.unit}
                          </div>
                          {yieldQty > 1 && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Porsi kasir: {currentPcs} {i.yield_unit || i.unit}
                            </div>
                          )}
                        </button>
                      );
                    })}
                    {activeTab === 'ingredient' && searchedIngredients.length === 0 && (
                      <div className="p-4 text-center text-xs text-slate-400">Tidak ditemukan</div>
                    )}
                  </div>
                </div>

                {/* Kanan: Form Penyesuaian */}
                <div className="w-1/2 flex flex-col">
                  {selectedItem ? (
                    <form id="adjustment-form" onSubmit={handleSubmit} className="space-y-4">
                      <div className={clsx("p-4 rounded-xl border mb-2", activeTab === 'product' ? "bg-blue-50/50 border-blue-100" : "bg-purple-50/50 border-purple-100")}>
                        <div className={clsx("text-xs font-medium mb-1", activeTab === 'product' ? "text-blue-600" : "text-purple-600")}>
                          {activeTab === 'product' ? 'Produk Terpilih' : 'Bahan Baku Terpilih'}
                        </div>
                        <div className="font-bold text-slate-800">{selectedItem.name}</div>
                        {activeTab === 'ingredient' && parseFloat(selectedItem.yield_quantity || '1') > 1 && (
                          <div className="text-[10px] text-purple-600/70 mt-1 font-medium bg-purple-100 w-fit px-1.5 py-0.5 rounded">
                            Otomatis Konversi: 1 {selectedItem.unit} = {selectedItem.yield_quantity} {selectedItem.yield_unit || selectedItem.unit}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Alasan Penyesuaian</label>
                        <select
                          required
                          value={reason}
                          onChange={(e) => {
                            setReason(e.target.value);
                            setAdjustmentAmount('');
                          }}
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors"
                        >
                          <option value="">-- Pilih Alasan Terlebih Dahulu --</option>
                          <option value="Barang Rusak / Expired (Mengurangi)">Barang Rusak / Expired (Mengurangi)</option>
                          <option value="Barang Hilang / Dicuri (Mengurangi)">Barang Hilang / Dicuri (Mengurangi)</option>
                          <option value="Selisih Kurang Opname (Mengurangi)">Selisih Kurang Opname (Mengurangi)</option>
                          <option value="Selisih Lebih Opname (Menambah)">Selisih Lebih Opname (Menambah)</option>
                          <option value="Bonus / Lainnya (Menambah)">Bonus / Lainnya (Menambah)</option>
                        </select>
                      </div>

                      {reason && (
                        <>
                          <div className="grid grid-cols-3 gap-3 items-end">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">Stok Fisik Saat Ini</label>
                              <div className="h-11 px-3 bg-slate-100 rounded-xl border border-slate-200 text-slate-500 font-medium flex items-center justify-center">
                                {getOldStock()}
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-800 mb-1 text-center truncate">
                                Jumlah {reason.includes('Mengurangi') ? 'Minus' : 'Plus'}
                              </label>
                              <div className="relative">
                                <div className={clsx(
                                  "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none font-bold text-lg",
                                  reason.includes('Mengurangi') ? "text-red-500" : "text-green-500"
                                )}>
                                  {reason.includes('Mengurangi') ? '-' : '+'}
                                </div>
                                <input 
                                  type="number" 
                                  required
                                  min="0"
                                  step="0.01"
                                  value={adjustmentAmount}
                                  onChange={e => setAdjustmentAmount(e.target.value)}
                                  className={clsx(
                                    "w-full h-11 pl-7 px-3 border-2 rounded-xl focus:outline-none focus:ring-2 bg-white transition-colors text-center font-bold",
                                    reason.includes('Mengurangi') ? "border-red-300 focus:ring-red-500 text-red-600" : "border-green-300 focus:ring-green-500 text-green-600"
                                  )}
                                  placeholder="0"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1 text-right">Hasil Akhir Fisik</label>
                              <div className={clsx(
                                "h-11 px-3 rounded-xl border font-bold flex items-center justify-center",
                                getOldStock() + (reason.includes('Mengurangi') ? -(parseFloat(adjustmentAmount) || 0) : (parseFloat(adjustmentAmount) || 0)) < 0 
                                  ? "bg-red-50 text-red-600 border-red-200" 
                                  : "bg-blue-50 text-blue-600 border-blue-200"
                              )}>
                                {getOldStock() + (reason.includes('Mengurangi') ? -(parseFloat(adjustmentAmount) || 0) : (parseFloat(adjustmentAmount) || 0))}
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Catatan Tambahan (Opsional)</label>
                            <textarea 
                              value={note}
                              onChange={e => setNote(e.target.value)}
                              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors resize-none h-20 text-sm" 
                              placeholder="Detail alasan penyesuaian..." 
                            />
                          </div>
                        </>
                      )}
                    </form>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <Search className="text-slate-300 mb-3" size={32} />
                      <p className="text-slate-500 text-sm font-medium">Pilih item dari daftar di sebelah kiri untuk menyesuaikan stoknya.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 shrink-0">
              <button 
                type="button"
                onClick={closeModal}
                className="px-5 py-2.5 rounded-xl font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button 
                type="submit"
                form="adjustment-form"
                disabled={isSubmitting || !selectedItem}
                className="px-5 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Simpan Penyesuaian
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-40 animate-in slide-in-from-bottom-10">
          <div className="flex items-center gap-2">
            <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {selectedIds.size}
            </span>
            <span className="font-medium">riwayat terpilih</span>
          </div>
          <div className="w-px h-6 bg-slate-700"></div>
          <div className="flex gap-3">
            <button 
              onClick={() => setSelectedIds(new Set())}
              className="px-4 py-2 rounded-xl font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-sm"
            >
              Batal
            </button>
            <button 
              onClick={() => setIsDeleteModalOpen(true)}
              className="px-4 py-2 rounded-xl font-medium bg-red-500 hover:bg-red-600 text-white transition-colors flex items-center gap-2 text-sm"
            >
              <Trash2 size={16} />
              Hapus Terpilih
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-red-50 text-red-700">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Trash2 size={20} />
                Hapus Riwayat Penyesuaian
              </h2>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-slate-600">
                Anda yakin ingin menghapus <strong>{selectedIds.size}</strong> riwayat penyesuaian stok terpilih? Tindakan ini tidak dapat dibatalkan.
              </p>
              
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <Info className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <div>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="mt-1 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                      checked={revertStock}
                      onChange={(e) => setRevertStock(e.target.checked)}
                    />
                    <div>
                      <div className="font-semibold text-amber-900 text-sm">Kembalikan stok seperti semula?</div>
                      <p className="text-xs text-amber-700 mt-1">
                        Jika dicentang, angka stok fisik yang sebelumnya diubah oleh penyesuaian ini akan dikembalikan ke angka semula secara otomatis.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-5 py-2.5 rounded-xl font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
                disabled={isDeleting}
              >
                Batal
              </button>
              <button 
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
