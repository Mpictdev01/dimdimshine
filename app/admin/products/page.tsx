'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Plus, Edit2, Trash2, Search, Loader2, X, Save, Copy } from 'lucide-react';
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
  const [allIngredients, setAllIngredients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formData, setFormData] = useState<{name: string, category_id: string, price: string, unit_id: string, ingredients: {ingredient_id: string, quantity: number}[]}>({ name: '', category_id: '', price: '', unit_id: '', ingredients: [] });
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
    const [prodRes, unitRes, catRes, ingRes] = await Promise.all([
      supabase.from('products').select('*, units(name), categories(name), product_ingredients(ingredient_id, quantity)').order('created_at', { ascending: false }),
      supabase.from('units').select('*').order('name'),
      supabase.from('categories').select('*').order('name'),
      supabase.from('ingredients').select('id, name, unit, yield_unit, current_stock').order('name')
    ]);
    
    if (prodRes.data && ingRes.data) {
      const ingredientsMap = new Map(ingRes.data.map(i => [i.id, i.current_stock || 0]));
      
      const mappedProducts = prodRes.data.map(p => {
        let maxStock = p.stock || 0;
        
        if (p.product_ingredients && p.product_ingredients.length > 0) {
          const possibleQuantities = p.product_ingredients.map((pi: any) => {
            const availableIngStock = ingredientsMap.get(pi.ingredient_id) || 0;
            return Math.floor(availableIngStock / pi.quantity);
          });
          maxStock = Math.min(...possibleQuantities);
        }
        
        return { ...p, stock: maxStock }; // Override stock for UI
      });
      setProducts(mappedProducts);
    } else if (prodRes.data) {
      setProducts(prodRes.data);
    }
    if (unitRes.data) setUnits(unitRes.data);
    if (catRes.data) setCategories(catRes.data);
    if (ingRes.data) setAllIngredients(ingRes.data);
    
    setIsLoading(false);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredProducts.map(p => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(itemId => itemId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus produk ini?')) return;
    
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) {
      setProducts(products.filter(p => p.id !== id));
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      alert('Gagal menghapus produk! Pastikan produk ini belum pernah masuk riwayat Penjualan atau Pembelian. \n\nDetail: ' + error.message);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.length} produk terpilih?`)) return;
    
    const { error } = await supabase.from('products').delete().in('id', selectedIds);
    if (!error) {
      setProducts(products.filter(p => !selectedIds.includes(p.id)));
      setSelectedIds([]);
    } else {
      alert('Gagal menghapus beberapa produk. Pastikan produk tersebut belum ada riwayat transaksinya. \n\nDetail: ' + error.message);
    }
  };

  const openModal = (product?: any) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        category_id: product.category_id || '',
        price: product.price.toString(),
        unit_id: product.unit_id || '',
        ingredients: product.product_ingredients || []
      });
    } else {
      setEditingProduct(null);
      setFormData({ name: '', category_id: '', price: '', unit_id: '', ingredients: [] });
    }
    setIsModalOpen(true);
  };

  const handleDuplicateProduct = (product: any) => {
    setEditingProduct(null);
    setFormData({
      name: `${product.name} (Salinan)`,
      category_id: product.category_id || '',
      price: product.price ? product.price.toString() : '0',
      unit_id: product.unit_id || '',
      ingredients: (product.product_ingredients || []).map((pi: any) => ({
        ingredient_id: pi.ingredient_id,
        quantity: pi.quantity
      }))
    });
    setIsModalOpen(true);
  };

  const handleCopyRecipeFromProduct = (sourceProductId: string) => {
    if (!sourceProductId) return;
    const sourceProd = products.find(p => p.id === sourceProductId);
    if (!sourceProd || !sourceProd.product_ingredients || sourceProd.product_ingredients.length === 0) {
      alert('Produk ini belum memiliki resep (BOM)');
      return;
    }

    const copiedIngredients = sourceProd.product_ingredients.map((pi: any) => ({
      ingredient_id: pi.ingredient_id,
      quantity: pi.quantity
    }));

    setFormData(prev => ({
      ...prev,
      ingredients: copiedIngredients
    }));
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const basePayload = {
      name: formData.name,
      category_id: formData.category_id || null,
      price: parseFloat(formData.price),
      unit_id: formData.unit_id || null
    };

    if (editingProduct) {
      const { data, error } = await supabase
        .from('products')
        .update(basePayload)
        .eq('id', editingProduct.id)
        .select('*, units(name), categories(name)')
        .single();
        
      if (!error && data) {
        // Update ingredients
        await supabase.from('product_ingredients').delete().eq('product_id', editingProduct.id);
        if (formData.ingredients.length > 0) {
          const ingPayload = formData.ingredients.map(ing => ({
            product_id: editingProduct.id,
            ingredient_id: ing.ingredient_id,
            quantity: ing.quantity
          }));
          await supabase.from('product_ingredients').insert(ingPayload);
        }
        
        // Refetch to get complete updated data
        fetchProducts();
        closeModal();
      } else {
        alert('Gagal memperbarui produk');
      }
    } else {
      const insertPayload = {
        ...basePayload,
        stock: 0,
        cost_price: 0
      };
      
      const { data, error } = await supabase
        .from('products')
        .insert([insertPayload])
        .select('*, units(name), categories(name)')
        .single();
        
      if (!error && data) {
        if (formData.ingredients.length > 0) {
          const ingPayload = formData.ingredients.map(ing => ({
            product_id: data.id,
            ingredient_id: ing.ingredient_id,
            quantity: ing.quantity
          }));
          await supabase.from('product_ingredients').insert(ingPayload);
        }
        fetchProducts();
        closeModal();
      } else {
        alert('Gagal menambahkan produk');
      }
    }
    setIsSubmitting(false);
  };

  const addIngredientRow = () => {
    setFormData({
      ...formData,
      ingredients: [...formData.ingredients, { ingredient_id: '', quantity: 1 }]
    });
  };

  const updateIngredientRow = (index: number, field: string, value: any) => {
    const newIngredients = [...formData.ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const removeIngredientRow = (index: number) => {
    const newIngredients = [...formData.ingredients];
    newIngredients.splice(index, 1);
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const [selectedCategory, setSelectedCategory] = useState('all');

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
  };

  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (p.categories?.name && p.categories.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchCategory = selectedCategory === 'all' || 
      (selectedCategory === 'uncategorized' ? !p.category_id : p.category_id === selectedCategory);
    return matchSearch && matchCategory;
  });

  return (
    <div className="p-4 md:p-8 h-full relative flex flex-col overflow-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-4 md:mb-8 shrink-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">Library Produk</h1>
          <p className="text-slate-500 text-sm">Kelola menu makanan dan minuman.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus size={20} />
          Tambah Produk
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
                placeholder="Cari nama produk..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full sm:w-56 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              <option value="all">Semua Kategori</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
              <option value="uncategorized">Tanpa Kategori</option>
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
                  <th className="font-medium p-4 pl-6 w-12">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      onChange={handleSelectAll}
                      checked={filteredProducts.length > 0 && selectedIds.length === filteredProducts.length}
                    />
                  </th>
                  <th className="font-medium p-4">Nama Produk</th>
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
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                        checked={selectedIds.includes(product.id)}
                        onChange={() => handleSelect(product.id)}
                      />
                    </td>
                    <td className="p-4">
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
                          onClick={() => handleDuplicateProduct(product)}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Duplikat produk ini beserta resepnya"
                        >
                          <Copy size={18} />
                        </button>
                        <button 
                          onClick={() => openModal(product)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit produk"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(product.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus produk"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      Tidak ada produk yang ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Floating Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-50 animate-in slide-in-from-bottom-10">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/20 text-blue-400 w-8 h-8 rounded-full flex items-center justify-center font-bold">
              {selectedIds.length}
            </div>
            <span className="font-medium">Produk Terpilih</span>
          </div>
          <div className="w-px h-8 bg-slate-700"></div>
          <button 
            onClick={handleBulkDelete}
            className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-colors shadow-sm"
          >
            <Trash2 size={18} />
            Hapus Terpilih
          </button>
        </div>
      )}

      {/* Full Page Modal (Overlay) */}
      <div 
        className={clsx(
          "fixed inset-0 z-50 bg-white flex flex-col transition-all duration-300",
          isModalOpen ? "translate-y-0 opacity-100 visible" : "translate-y-full opacity-0 invisible pointer-events-none"
        )}
      >
        <div className="flex items-center justify-between px-4 md:px-8 py-4 md:py-6 border-b border-slate-100 bg-slate-50">
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
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/50 flex justify-center">
          <form onSubmit={handleSubmit} className="w-full max-w-2xl bg-white p-4 md:p-8 rounded-3xl shadow-sm border border-slate-100 h-fit space-y-6">
            
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
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Harga Jual (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    placeholder="25000"
                  />
                </div>
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

              <div className="pt-4 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700">Resep / Bahan Baku (Opsional)</h3>
                    <p className="text-xs text-slate-500 mt-1">Jika produk ini memiliki resep (BOM), tentukan bahan baku yang dibutuhkan per 1 porsi.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {products.some(p => p.product_ingredients && p.product_ingredients.length > 0) && (
                      <select
                        value=""
                        onChange={(e) => {
                          handleCopyRecipeFromProduct(e.target.value);
                          e.target.value = '';
                        }}
                        className="text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none transition-colors cursor-pointer"
                        title="Salin resep dari produk yang sudah ada"
                      >
                        <option value="">📋 Salin Resep Dari...</option>
                        {products
                          .filter(p => p.product_ingredients && p.product_ingredients.length > 0 && p.id !== editingProduct?.id)
                          .map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.product_ingredients.length} bahan)
                            </option>
                          ))}
                      </select>
                    )}
                    <button
                      type="button"
                      onClick={addIngredientRow}
                      className="text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Plus size={14} />
                      Tambah Bahan
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {formData.ingredients.map((ing, idx) => {
                    const selectedIng = allIngredients.find(i => i.id === ing.ingredient_id);
                    return (
                      <div key={idx} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex-1">
                          <select
                            required
                            value={ing.ingredient_id}
                            onChange={(e) => updateIngredientRow(idx, 'ingredient_id', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Pilih Bahan Baku</option>
                            {allIngredients.map(a => (
                              <option key={a.id} value={a.id}>{a.name} ({a.yield_unit || a.unit})</option>
                            ))}
                          </select>
                        </div>
                        <div className="w-32 flex items-center gap-2">
                          <input
                            type="number"
                            required
                            min="0.01"
                            step="0.01"
                            value={ing.quantity || ''}
                            onChange={(e) => updateIngredientRow(idx, 'quantity', parseFloat(e.target.value))}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Qty"
                          />
                          <span className="text-xs text-slate-500 whitespace-nowrap font-medium">{selectedIng?.yield_unit || selectedIng?.unit || '-'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeIngredientRow(idx)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                  {formData.ingredients.length === 0 && (
                    <div className="text-center py-6 bg-slate-50/50 rounded-xl border border-slate-100 border-dashed">
                      <p className="text-sm text-slate-500">Produk ini belum memiliki resep (BOM).<br/>Stok akan dihitung berdasarkan stok fisik produk jadi.</p>
                    </div>
                  )}
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
