'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Save, Store, Receipt, Calculator, Loader2 } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminSettings() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    store_name: '',
    address: '',
    tax_rate: '0',
    service_charge: '0'
  });

  useEffect(() => {
    const authStr = sessionStorage.getItem('admin_auth');
    if (!authStr) {
      router.push('/admin/login');
      return;
    }
    fetchSettings();
  }, [router]);

  const fetchSettings = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('store_settings').select('*').limit(1).single();
    if (!error && data) {
      setSettingsId(data.id);
      setFormData({
        store_name: data.store_name,
        address: data.address,
        tax_rate: data.tax_rate.toString(),
        service_charge: data.service_charge.toString()
      });
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      store_name: formData.store_name,
      address: formData.address,
      tax_rate: parseFloat(formData.tax_rate),
      service_charge: parseFloat(formData.service_charge),
      updated_at: new Date().toISOString()
    };

    if (settingsId) {
      const { error } = await supabase
        .from('store_settings')
        .update(payload)
        .eq('id', settingsId);
      
      if (error) alert('Gagal menyimpan pengaturan.');
      else alert('Pengaturan berhasil disimpan!');
    } else {
      const { data, error } = await supabase
        .from('store_settings')
        .insert([payload])
        .select()
        .single();
        
      if (error) alert('Gagal menyimpan pengaturan.');
      else {
        setSettingsId(data.id);
        alert('Pengaturan berhasil disimpan!');
      }
    }
    
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-8 max-w-4xl h-full flex flex-col">
      <div className="mb-8 shrink-0">
        <h1 className="text-2xl font-bold text-slate-800">Pengaturan Sistem</h1>
        <p className="text-slate-500">Konfigurasi profil bisnis, pajak, dan cetakan struk.</p>
      </div>

      <div className="space-y-6 flex-1 overflow-y-auto pr-2 pb-8">
        {/* Profil Bisnis */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
            <Store className="text-blue-600" size={20} />
            <h2 className="font-bold text-slate-800">Profil Bisnis</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nama Toko</label>
              <input 
                type="text" 
                required
                value={formData.store_name}
                onChange={e => setFormData({...formData, store_name: e.target.value})}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Alamat Outlet</label>
              <textarea 
                required
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
              ></textarea>
            </div>
          </div>
        </div>

        {/* Pajak & Biaya */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
            <Calculator className="text-blue-600" size={20} />
            <h2 className="font-bold text-slate-800">Pajak & Biaya Layanan</h2>
          </div>
          <div className="p-6 grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">PPN (%)</label>
              <input 
                type="number" 
                min="0"
                step="0.01"
                required
                value={formData.tax_rate}
                onChange={e => setFormData({...formData, tax_rate: e.target.value})}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Service Charge (%)</label>
              <input 
                type="number" 
                min="0"
                step="0.01"
                required
                value={formData.service_charge}
                onChange={e => setFormData({...formData, service_charge: e.target.value})}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <button 
            type="button"
            onClick={() => fetchSettings()}
            className="px-6 py-3 rounded-xl font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Batal
          </button>
          <button 
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-md flex items-center gap-2"
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Simpan Perubahan
          </button>
        </div>
      </div>
    </form>
  );
}
