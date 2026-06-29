'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Plus, Trash2, Loader2, X, Save, Edit2 } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminSuppliers() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', contact: '', address: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('suppliers').select('*').order('name');
    if (!error && data) {
      setSuppliers(data);
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus supplier ini?')) return;
    
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (!error) {
      setSuppliers(suppliers.filter(s => s.id !== id));
    } else {
      alert('Gagal menghapus supplier. Error: ' + error.message);
    }
  };

  const openModal = (supplier?: any) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({ name: supplier.name, contact: supplier.contact || '', address: supplier.address || '' });
    } else {
      setEditingSupplier(null);
      setFormData({ name: '', contact: '', address: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSupplier(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = { 
      name: formData.name,
      contact: formData.contact,
      address: formData.address
    };

    if (editingSupplier) {
      const { data, error } = await supabase
        .from('suppliers')
        .update(payload)
        .eq('id', editingSupplier.id)
        .select()
        .single();
        
      if (!error && data) {
        setSuppliers(suppliers.map(s => s.id === data.id ? data : s));
        closeModal();
      } else {
        alert('Gagal memperbarui supplier: ' + error?.message);
      }
    } else {
      const { data, error } = await supabase
        .from('suppliers')
        .insert([payload])
        .select()
        .single();
        
      if (!error && data) {
        setSuppliers([...suppliers, data]);
        closeModal();
      } else {
        alert('Gagal menambahkan supplier: ' + error?.message);
      }
    }
    setIsSubmitting(false);
  };

  return (
    <div className="p-8 h-full relative flex flex-col">
      <div className="flex justify-between items-center mb-8 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Data Supplier / Pabrik</h1>
          <p className="text-slate-500">Kelola daftar pihak tempat Anda menyetok barang jualan.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={20} />
          Tambah Supplier
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
                  <th className="font-medium p-4 pl-6">Nama Supplier</th>
                  <th className="font-medium p-4">Kontak (No. HP)</th>
                  <th className="font-medium p-4">Alamat Lengkap</th>
                  <th className="font-medium p-4 text-right pr-6 w-32">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suppliers.map((sup) => (
                  <tr key={sup.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 pl-6 font-semibold text-slate-800">
                      {sup.name}
                    </td>
                    <td className="p-4 text-slate-600">
                      {sup.contact || '-'}
                    </td>
                    <td className="p-4 text-slate-600">
                      {sup.address || '-'}
                    </td>
                    <td className="p-4 pr-6 text-right space-x-2">
                      <button 
                        onClick={() => openModal(sup)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-block"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(sup.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-block"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {suppliers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">
                      Belum ada data supplier. Silakan tambahkan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800">
                {editingSupplier ? 'Edit Supplier' : 'Tambah Supplier Baru'}
              </h2>
              <button onClick={closeModal} className="p-2 rounded-full hover:bg-slate-200 text-slate-500">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Supplier/Pabrik</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors" 
                  placeholder="Misal: PT. Indofood Sukses Makmur" 
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Kontak (No. HP/Telepon)</label>
                <input 
                  type="text" 
                  value={formData.contact}
                  onChange={e => setFormData({...formData, contact: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors" 
                  placeholder="0812xxxxxx" 
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Alamat</label>
                <textarea 
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors h-24 resize-none" 
                  placeholder="Jalan, Kota, dll" 
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={closeModal} className="px-5 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors">Batal</button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-2">
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
