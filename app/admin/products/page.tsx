'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Plus, Edit2, Trash2, Search, Loader2, X, Save } from 'lucide-react';
import clsx from 'clsx';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminProducts() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', category_id: '', price: '', stock: '0', unit_id: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const authStr = sessionStorage.getItem('admin_auth');
    if (!authStr) {
      router.push('/admin/login');
      return;
    }
    fetchProducts();
  }, [router]);

  const fetchProducts = async () => {
    setIsLoading(true);
    const [prodRes, unitRes, catRes] = await Promise.all([
      supabase.from('products').select('*, units(name), categories(name)').order('created_at', { ascending: false }),
      supabase.from('units').select('*').order('name'),
      supabase.from('categories').select('*').order('name')
    ]);
    
    if (prodRes.data) setProducts(prodRes.data);
    if (unitRes.data) setUnits(unitRes.data);
    if (catRes.data) setCategories(catRes.data);
    
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus produk ini?')) return;
    
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) {
      setProducts(products.filter(p => p.id !== id));
    } else {
      alert('Gagal menghapus produk! Pastikan produk ini belum pernah masuk riwayat Penjualan atau Pembelian. \n\nDetail: ' + error.message);
    }
  };

  const openModal = (product?: any) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        category_id: product.category_id || '',
        price: product.price.toString(),
        stock: (product.stock || 0).toString(),
        unit_id: product.unit_id || ''
      });
    } else {
      setEditingProduct(null);
      setFormData({ name: '', category_id: '', price: '', stock: '0', unit_id: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      name: formData.name,
      category_id: formData.category_id || null,
      price: parseFloat(formData.price),
      stock: parseFloat(formData.stock),
      unit_id: formData.unit_id || null
    };

    if (editingProduct) {
      const { data, error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', editingProduct.id)
        .select('*, units(name), categories(name)')
        .single();
        
      if (!error && data) {
        setProducts(products.map(p => p.id === data.id ? data : p));
        closeModal();
      } else {
        alert('Gagal memperbarui produk');
      }
    } else {
      const { data, error } = await supabase
        .from('products')
        .insert([payload])
        .select('*, units(name), categories(name)')
        .single();
        
      if (!error && data) {
        setProducts([data, ...products]);
        closeModal();
      } else {
        alert('Gagal menambahkan produk');
      }
    }
    setIsSubmitting(false);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.categories?.name && p.categories.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-8 h-full relative flex flex-col">
      <div className="flex justify-between items-center mb-8 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Library Produk</h1>
          <p className="text-slate-500">Kelola menu makanan dan minuman.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={20} />
          Tambah Produk
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
              placeholder="Cari nama atau kategori..."
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
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white shadow-sm z-10">
                <tr className="text-slate-500 text-sm border-b border-slate-200">
                  <th className="font-medium p-4 pl-6">Nama Produk</th>
                  <th className="font-medium p-4">Kategori</th>
                  <th className="font-medium p-4">Stok</th>
                  <th className="font-medium p-4">Harga</th>
                  <th className="font-medium p-4 text-right pr-6">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="font-semibold text-slate-800">
                        {product.name}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                        {product.categories?.name || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-slate-700">
                      {product.stock || 0} {product.units?.name || ''}
                    </td>
                    <td className="p-4 font-medium text-slate-700">
                      {formatPrice(product.price)}
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => openModal(product)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(product.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">
                      Tidak ada produk yang ditemukan.
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
          "absolute inset-0 z-50 bg-white flex flex-col transition-transform duration-300",
          isModalOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-slate-50">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}</h2>
            <p className="text-slate-500 text-sm mt-1">Masukkan detail produk untuk menu POS.</p>
          </div>
          <button 
            onClick={closeModal}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors shadow-sm"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 flex justify-center">
          <form onSubmit={handleSubmit} className="w-full max-w-2xl bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-fit space-y-6">
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Produk</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors" 
                  placeholder="Misal: Es Kopi Susu Aren" 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Kategori</label>
                  <select 
                    value={formData.category_id}
                    onChange={e => setFormData({...formData, category_id: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors appearance-none" 
                  >
                    <option value="">Pilih Kategori</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Harga (Rp)</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors" 
                    placeholder="25000" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Stok Fisik</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    step="0.01"
                    value={formData.stock}
                    onChange={e => setFormData({...formData, stock: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Satuan</label>
                  <select 
                    value={formData.unit_id}
                    onChange={e => setFormData({...formData, unit_id: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors appearance-none" 
                  >
                    <option value="">Pilih Satuan</option>
                    {units.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
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
