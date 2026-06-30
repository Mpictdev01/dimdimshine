'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Search, Loader2, X, Save, ArrowRightLeft } from 'lucide-react';
import clsx from 'clsx';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function StockAdjustments() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [actualStock, setActualStock] = useState('');
  const [reason, setReason] = useState('');
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
    const { data } = await supabase
      .from('products')
      .select('*, units(name), categories(name)')
      .order('name');
    
    if (data) setProducts(data);
    setIsLoading(false);
  };

  const openModal = (product: any) => {
    setSelectedProduct(product);
    setActualStock((product.stock || 0).toString());
    setReason('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    
    setIsSubmitting(true);

    const newStock = parseFloat(actualStock);

    const { data, error } = await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', selectedProduct.id)
      .select('*, units(name), categories(name)')
      .single();
      
    if (!error && data) {
      setProducts(products.map(p => p.id === data.id ? data : p));
      closeModal();
    } else {
      alert('Gagal memperbarui stok produk: ' + error?.message);
    }
    
    setIsSubmitting(false);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.categories?.name && p.categories.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-8 h-full relative flex flex-col">
      <div className="flex justify-between items-center mb-8 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Penyesuaian Stok</h1>
          <p className="text-slate-500">Sesuaikan stok fisik dengan sistem (Stock Opname).</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col flex-1 min-h-0">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div className="relative w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Cari produk..."
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
                  <th className="font-medium p-4">Stok Sistem</th>
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
                    <td className="p-4 pr-6 text-right">
                      <button 
                        onClick={() => openModal(product)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        <ArrowRightLeft size={16} />
                        Sesuaikan
                      </button>
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">Sesuaikan Stok</h2>
              <button 
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Produk</label>
                <div className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-800 font-medium">
                  {selectedProduct?.name}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Stok Sistem</label>
                  <div className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-500 font-medium line-through">
                    {selectedProduct?.stock || 0} {selectedProduct?.units?.name || ''}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Stok Aktual</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      required
                      min="0"
                      step="0.01"
                      value={actualStock}
                      onChange={e => setActualStock(e.target.value)}
                      className="w-full px-4 py-3 border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-colors" 
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 text-sm">
                      {selectedProduct?.units?.name || ''}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Keterangan (Opsional)</label>
                <textarea 
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors resize-none h-24" 
                  placeholder="Misal: Barang rusak, hilang, dsb." 
                />
                <p className="text-xs text-slate-500 mt-1.5">*Keterangan tidak tersimpan ke database di versi saat ini, hanya untuk catatan Anda saat menginput.</p>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 rounded-xl font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Simpan Penyesuaian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
