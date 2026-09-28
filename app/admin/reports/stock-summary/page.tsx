'use client';

import { useEffect, useState } from 'react';
import { browserDataClient } from '@/lib/browser-data-client';
import { Loader2, Search, Download, FileSpreadsheet, PackageSearch } from 'lucide-react';
import * as XLSX from 'xlsx';
import { localDateInput } from '@/lib/local-date';

const supabase = browserDataClient;

export default function StockSummaryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterData();
  }, [searchQuery, selectedCategory, products]);

  const fetchData = async () => {
    setIsLoading(true); setLoadError('');
    try {
      const [catRes, productRes, ingredientRes] = await Promise.all([
        supabase.from('categories').select('id,name').order('name'),
        supabase.from('products').select('*, categories(id,name), units(id,name), product_ingredients(ingredient_id,quantity)').order('name'),
        supabase.from('ingredients').select('id,name,current_stock,cost_price,unit,yield_unit,yield_quantity').order('name'),
      ]);
      if (catRes.error || productRes.error || ingredientRes.error) throw catRes.error ?? productRes.error ?? ingredientRes.error;
      setCategories([{ id: 'raw', name: 'Bahan Baku' }, ...(catRes.data ?? [])]);
      const ingredientMap = new Map((ingredientRes.data ?? []).map(item => [item.id, item]));
      const productRows = (productRes.data ?? []).map(product => {
        const bom = product.product_ingredients ?? [];
        const available = bom.length ? Math.max(0, Math.min(...bom.map((part: any) => {
          const ingredient = ingredientMap.get(part.ingredient_id);
          return ingredient && Number(part.quantity) > 0 ? Math.floor(Number(ingredient.current_stock) / Number(part.quantity)) : 0;
        }))) : Number(product.stock ?? 0);
        return { ...product, stock: available, _assetValue: bom.length ? 0 : Number(product.stock ?? 0) * Number(product.cost_price ?? 0),
          _isBom: bom.length > 0 };
      });
      const ingredientRows = (ingredientRes.data ?? []).map(item => ({ id: item.id, name: item.name,
        stock: Number(item.current_stock ?? 0), cost_price: Number(item.cost_price ?? 0),
        categories: { id: 'raw', name: 'Bahan Baku' }, units: { name: item.yield_unit || item.unit || '' },
        _assetValue: Number(item.current_stock ?? 0) * Number(item.cost_price ?? 0), _isIngredient: true }));
      setProducts([...productRows, ...ingredientRows]);
    } catch (err) {
      setLoadError('Rekap stok gagal dimuat.');
    } finally {
      setIsLoading(false);
    }
  };

  const filterData = () => {
    let filtered = [...products];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(q)
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.categories?.id === selectedCategory);
    }

    setFilteredProducts(filtered);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
  };

  const exportToExcel = () => {
    const dataToExport = filteredProducts.map((p, index) => ({
      'No': index + 1,
      'Nama Produk': p.name,
      'Kategori': p.categories?.name || '-',
      'Satuan': p.units?.name || '-',
      'HPP (Modal)': p.cost_price,
      'Stok Aktual': p.stock,
      'Total Nilai Aset': p._assetValue || 0
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap_Stok");
    XLSX.writeFile(wb, `Rekap_Stok_Gudang_${localDateInput()}.xlsx`);
  };

  const totalAssetValue = filteredProducts.reduce((sum, p) => sum + Number(p._assetValue || 0), 0);

  return (
    <div className="p-4 md:p-8 h-full relative flex flex-col">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-4 md:mb-6 shrink-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">Rekap Stok & Nilai Aset</h1>
          <p className="text-slate-500 text-sm">Laporan status jumlah barang fisik di gudang saat ini (Inventory Valuation).</p>
        </div>
        <button 
          onClick={exportToExcel}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm self-start sm:self-auto"
        >
          <FileSpreadsheet size={20} />
          Export Excel
        </button>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 shrink-0 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Pencarian</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={16} />
            </div>
            <input
              type="text"
              placeholder="Cari nama produk atau bahan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            />
          </div>
        </div>

        <div className="w-64">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Kategori Produk</label>
          <select 
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors appearance-none bg-white"
          >
            <option value="all">Semua Kategori</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
          ) : loadError ? (
            <div role="alert" className="p-12 text-center text-red-700">{loadError} <button onClick={fetchData} className="ml-2 rounded-lg bg-blue-600 px-3 py-2 text-white">Coba lagi</button></div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 shadow-sm z-10">
                <tr className="text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
                  <th className="font-semibold p-4 pl-6">Produk / Bahan</th>
                  <th className="font-semibold p-4">Kategori</th>
                  <th className="font-semibold p-4 text-right">Harga Modal (HPP)</th>
                  <th className="font-semibold p-4 text-center">Sisa Stok</th>
                  <th className="font-semibold p-4 text-right pr-6">Total Aset</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="font-bold text-slate-800">{p.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{p._isBom ? 'Stok dapat dibuat dari resep' : 'Stok fisik'}</div>
                    </td>
                    <td className="p-4 text-slate-600">
                      <span className="inline-flex px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
                        {p.categories?.name || 'Tanpa Kategori'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 text-right font-medium">
                      {formatPrice(p.cost_price || 0)}
                    </td>
                    <td className="p-4 text-center">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-sm ${p.stock <= 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {p.stock || 0} <span className="text-xs font-medium opacity-80">{p.units?.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right pr-6 text-blue-600 font-bold">
                      {formatPrice(p._assetValue || 0)}
                    </td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <PackageSearch size={48} className="mb-4 opacity-50" />
                        <p>Tidak ada produk ditemukan.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Footer Summary */}
        {!isLoading && filteredProducts.length > 0 && (
          <div className="p-4 bg-slate-800 border-t border-slate-700 flex flex-col md:flex-row justify-between items-center shrink-0 text-white rounded-b-2xl shadow-inner">
            <div className="flex gap-6 mb-4 md:mb-0 items-center">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Jenis Barang</div>
                <div className="text-lg font-bold text-white">{filteredProducts.length} Baris</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Estimasi Nilai Aset Gudang</div>
              <div className="text-xl font-black text-emerald-400">
                {formatPrice(totalAssetValue)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
