'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Plus, Edit2, Trash2, AlertTriangle, Loader2, X, Save } from 'lucide-react';
import clsx from 'clsx';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminInventory() {
  const router = useRouter();
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', unit: '', current_stock: '', min_stock_alert: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const authStr = sessionStorage.getItem('admin_auth');
    if (!authStr) {
      router.push('/admin/login');
      return;
    }
    fetchIngredients();
  }, [router]);

  const fetchIngredients = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('ingredients').select('*').order('name');
    if (!error && data) {
      setIngredients(data);
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus bahan baku ini? Peringatan: Resep (BOM) yang menggunakan bahan ini mungkin akan ikut terpengaruh.')) return;
    
    const { error } = await supabase.from('ingredients').delete().eq('id', id);
    if (!error) {
      setIngredients(ingredients.filter(ing => ing.id !== id));
    } else {
      alert('Gagal menghapus bahan baku');
    }
  };

  const openModal = (ing?: any) => {
    if (ing) {
      setEditingIngredient(ing);
      setFormData({
        name: ing.name,
        unit: ing.unit,
        current_stock: ing.current_stock.toString(),
        min_stock_alert: ing.min_stock_alert.toString()
      });
    } else {
      setEditingIngredient(null);
      setFormData({ name: '', unit: '', current_stock: '0', min_stock_alert: '0' });
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

    const payload = {
      name: formData.name,
      unit: formData.unit,
      current_stock: parseFloat(formData.current_stock),
      min_stock_alert: parseFloat(formData.min_stock_alert)
    };

    if (editingIngredient) {
      const { data, error } = await supabase
        .from('ingredients')
        .update(payload)
        .eq('id', editingIngredient.id)
        .select()
        .single();
        
      if (!error && data) {
        setIngredients(ingredients.map(ing => ing.id === data.id ? data : ing));
        closeModal();
      } else {
        alert('Gagal memperbarui bahan baku');
      }
    } else {
      const { data, error } = await supabase
        .from('ingredients')
        .insert([payload])
        .select()
        .single();
        
      if (!error && data) {
        setIngredients([...ingredients, data]);
        closeModal();
      } else {
        alert('Gagal menambahkan bahan baku');
      }
    }
    setIsSubmitting(false);
  };

  return (
    <div className="p-4 md:p-8 h-full relative flex flex-col overflow-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-4 md:mb-8 shrink-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">Inventaris Bahan Baku</h1>
          <p className="text-slate-500 text-sm">Pantau ketersediaan stok bahan (Ingredients) untuk Bill of Materials.</p>
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
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white shadow-sm z-10">
                <tr className="text-slate-500 text-sm border-b border-slate-200">
                  <th className="font-medium p-4 pl-6">Nama Bahan</th>
                  <th className="font-medium p-4">Stok Saat Ini</th>
                  <th className="font-medium p-4">Batas Peringatan (Min)</th>
                  <th className="font-medium p-4 text-center">Status</th>
                  <th className="font-medium p-4 text-right pr-6">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ingredients.map((ing) => {
                  const isLowStock = ing.current_stock <= ing.min_stock_alert;
                  
                  return (
                    <tr key={ing.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 pl-6 font-semibold text-slate-800">{ing.name}</td>
                      <td className="p-4 font-medium text-slate-700">
                        {ing.current_stock} <span className="text-slate-400 text-sm">{ing.unit}</span>
                      </td>
                      <td className="p-4 text-slate-500">
                        {ing.min_stock_alert} <span className="text-sm">{ing.unit}</span>
                      </td>
                      <td className="p-4 text-center">
                        {isLowStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-red-100 text-red-700">
                            <AlertTriangle size={12} /> Menipis
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-700">
                            Aman
                          </span>
                        )}
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
                  );
                })}
                
                {ingredients.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      Belum ada data bahan baku.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Full Page Modal */}
      <div 
        className={clsx(
          "fixed inset-0 z-50 bg-white flex flex-col transition-all duration-300",
          isModalOpen ? "translate-y-0 opacity-100 visible" : "translate-y-full opacity-0 invisible pointer-events-none"
        )}
      >
        <div className="flex items-center justify-between px-4 md:px-8 py-4 md:py-6 border-b border-slate-100 bg-slate-50 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{editingIngredient ? 'Edit Bahan Baku' : 'Tambah Bahan Baku Baru'}</h2>
            <p className="text-slate-500 text-sm mt-1">Data ini digunakan dalam manajemen inventaris dan Bill of Materials (BOM).</p>
          </div>
          <button 
            onClick={closeModal}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors shadow-sm"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/50 flex justify-center items-start">
          <form onSubmit={handleSubmit} className="w-full max-w-2xl bg-white p-4 md:p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Bahan Baku</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors" 
                    placeholder="Misal: Biji Kopi Arabica" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Satuan/Unit</label>
                  <input 
                    type="text" 
                    required
                    value={formData.unit}
                    onChange={e => setFormData({...formData, unit: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors" 
                    placeholder="gram, ml, pcs" 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Stok Awal / Saat Ini</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    step="0.01"
                    value={formData.current_stock}
                    onChange={e => setFormData({...formData, current_stock: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors" 
                    placeholder="0" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Batas Peringatan (Min Stock)</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    step="0.01"
                    value={formData.min_stock_alert}
                    onChange={e => setFormData({...formData, min_stock_alert: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors" 
                    placeholder="0" 
                  />
                </div>
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
