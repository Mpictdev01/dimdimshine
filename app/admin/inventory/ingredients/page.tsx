'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Plus, Edit2, Trash2, Search, Loader2, X, Save } from 'lucide-react';
import clsx from 'clsx';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminIngredients() {
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<any>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    unit: '', 
    min_stock_alert: '10',
    yield_quantity: '1',
    yield_unit: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchIngredients();
  }, []);

  const fetchIngredients = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('ingredients').select('*').order('name');
    if (data) setIngredients(data);
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus bahan baku ini?')) return;
    
    const { error } = await supabase.from('ingredients').delete().eq('id', id);
    if (!error) {
      setIngredients(ingredients.filter(p => p.id !== id));
    } else {
      alert('Gagal menghapus bahan baku! Pastikan bahan ini tidak dipakai di produk manapun.\n\nDetail: ' + error.message);
    }
  };

  const openModal = (ingredient?: any) => {
    if (ingredient) {
      setEditingIngredient(ingredient);
      setFormData({
        name: ingredient.name,
        unit: ingredient.unit || '',
        min_stock_alert: ingredient.min_stock_alert?.toString() || '0',
        yield_quantity: ingredient.yield_quantity?.toString() || '1',
        yield_unit: ingredient.yield_unit || ingredient.unit || ''
      });
    } else {
      setEditingIngredient(null);
      setFormData({ name: '', unit: '', min_stock_alert: '10', yield_quantity: '1', yield_unit: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingIngredient(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const basePayload = {
      name: formData.name,
      unit: formData.unit,
      min_stock_alert: parseFloat(formData.min_stock_alert) || 0,
      yield_quantity: parseFloat(formData.yield_quantity) || 1,
      yield_unit: formData.yield_unit || formData.unit
    };

    if (editingIngredient) {
      const { data, error } = await supabase
        .from('ingredients')
        .update(basePayload)
        .eq('id', editingIngredient.id)
        .select()
        .single();
        
      if (!error && data) {
        setIngredients(ingredients.map(p => p.id === data.id ? data : p));
        closeModal();
      } else {
        alert('Gagal memperbarui bahan baku: ' + (error?.message || 'Unknown error'));
      }
    } else {
      const { data, error } = await supabase
        .from('ingredients')
        .insert([{...basePayload, current_stock: 0}])
        .select()
        .single();
        
      if (!error && data) {
        setIngredients([data, ...ingredients]);
        closeModal();
      } else {
        alert('Gagal menambahkan bahan baku: ' + (error?.message || 'Pastikan Anda sudah menjalankan SQL Update No 5 & 6!'));
      }
    }
    setIsSubmitting(false);
  };

  const [stockFilter, setStockFilter] = useState('all');

  const filteredIngredients = ingredients
    .filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const isLow = (p.current_stock || 0) <= (p.min_stock_alert * (p.yield_quantity || 1));
      const matchStockFilter = stockFilter !== 'low' || isLow;
      return matchSearch && matchStockFilter;
    })
    .sort((a, b) => {
      if (stockFilter === 'asc') {
        return (a.current_stock || 0) - (b.current_stock || 0);
      }
      if (stockFilter === 'desc') {
        return (b.current_stock || 0) - (a.current_stock || 0);
      }
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="p-4 md:p-8 h-full relative flex flex-col overflow-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-4 md:mb-8 shrink-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">Master Bahan Baku</h1>
          <p className="text-slate-500 text-sm">Kelola daftar bahan baku yang digunakan dalam menu.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus size={20} />
          Tambah Bahan Baku
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col flex-1 min-h-0">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 justify-between items-center bg-slate-50 shrink-0">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto flex-1">
            <div className="relative w-full sm:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={18} />
              </div>
              <input
                type="text"
                placeholder="Cari bahan baku..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
            </div>

            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="w-full sm:w-56 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              <option value="all">Semua Stok (A-Z)</option>
              <option value="asc">Stok Terendah → Tertinggi</option>
              <option value="desc">Stok Tertinggi → Terendah</option>
              <option value="low">⚠️ Stok Menipis</option>
            </select>
          </div>
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
                  <th className="font-medium p-4 pl-6">Nama Bahan Baku</th>
                  <th className="font-medium p-4">Stok Saat Ini</th>
                  <th className="font-medium p-4">Satuan Beli</th>
                  <th className="font-medium p-4">Hasil Konversi (Porsi)</th>
                  <th className="font-medium p-4">Batas Peringatan Stok</th>
                  <th className="font-medium p-4 text-right pr-6">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredIngredients.map((ing) => (
                  <tr key={ing.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="font-semibold text-slate-800">
                        {ing.name}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={clsx(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                          ing.current_stock <= (ing.min_stock_alert * (ing.yield_quantity || 1)) // min stock is in yield unit
                            ? "bg-red-100 text-red-800 border border-red-200" 
                            : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        )}>
                          {ing.current_stock || 0} {ing.yield_unit || ing.unit}
                        </span>
                        {ing.yield_quantity > 1 && (
                          <span className="text-[11px] text-slate-500 font-medium">
                            ≈ {((ing.current_stock || 0) / ing.yield_quantity).toFixed(2).replace(/\.?0+$/, '')} {ing.unit}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-medium text-slate-700">
                      {ing.unit}
                    </td>
                    <td className="p-4 font-medium text-slate-700">
                      <span className="text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100">
                        1 {ing.unit} = {ing.yield_quantity} {ing.yield_unit || ing.unit}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-slate-700">
                      {ing.min_stock_alert} {ing.yield_unit || ing.unit}
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => openModal(ing)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(ing.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                
                {filteredIngredients.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      Tidak ada bahan baku yang ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Full Page Modal (Overlay) */}
      <div 
        className={clsx(
          "fixed inset-0 z-50 bg-white flex flex-col transition-all duration-300",
          isModalOpen ? "translate-y-0 opacity-100 visible" : "translate-y-full opacity-0 invisible pointer-events-none"
        )}
      >
        <div className="flex items-center justify-between px-4 md:px-8 py-4 md:py-6 border-b border-slate-100 bg-slate-50">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{editingIngredient ? 'Edit Bahan Baku' : 'Tambah Bahan Baku Baru'}</h2>
            <p className="text-slate-500 text-sm mt-1">Masukkan detail bahan baku untuk resep BOM.</p>
          </div>
          <button 
            onClick={closeModal}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors shadow-sm"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/50 flex justify-center">
          <form onSubmit={handleSubmit} className="w-full max-w-2xl bg-white p-4 md:p-8 rounded-3xl shadow-sm border border-slate-100 h-fit space-y-6">
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Bahan Baku</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors" 
                  placeholder="Misal: Tepung Takoyaki, Susu, dll" 
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Satuan Pembelian</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors"
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    placeholder="Misal: Adonan, Dus, Pcs"
                  />
                  <p className="text-xs text-slate-500 mt-1">Satuan saat barang datang.</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Batas Peringatan Stok (Min)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors"
                    value={formData.min_stock_alert}
                    onChange={(e) => setFormData({...formData, min_stock_alert: e.target.value})}
                    placeholder="10"
                  />
                  <p className="text-xs text-slate-500 mt-1">Sistem akan memberi alert jika stok kurang dari ini.</p>
                </div>
              </div>

              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <h3 className="font-semibold text-blue-900 mb-3 text-sm flex items-center gap-2">Konversi Satuan (Opsional)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">1 {formData.unit || 'Satuan'} Menjadi Berapa Porsi?</label>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      required
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-colors"
                      value={formData.yield_quantity}
                      onChange={(e) => setFormData({...formData, yield_quantity: e.target.value})}
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Satuan Porsi</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-colors"
                      value={formData.yield_unit}
                      onChange={(e) => setFormData({...formData, yield_unit: e.target.value})}
                      placeholder="Sama dengan Satuan Pembelian"
                    />
                  </div>
                </div>
                <p className="text-xs text-blue-600/80 mt-2">Contoh: Beli 1 <b>Adonan</b>, menghasilkan 30 <b>Pcs</b>. Resep produk menggunakan <b>Pcs</b>.</p>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
              <button 
                type="button"
                onClick={closeModal}
                className="px-6 py-3 rounded-xl font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button 
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-md flex items-center gap-2"
              >
                {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                Simpan
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
