'use client';

import { useState, useEffect } from 'react';
import { usePosStore } from '@/lib/store/usePosStore';
import { X, Search, User, Loader2, Plus } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function CustomerModal({ onClose }: { onClose: () => void }) {
  const { activeCustomer, setActiveCustomer } = usePosStore();
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCustomers = async () => {
      const { data } = await supabase.from('customers').select('*').order('name');
      if (data) setCustomers(data);
      setIsLoading(false);
    };
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.phone && c.phone.includes(searchQuery))
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <User size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Pilih Pelanggan</h2>
              <p className="text-sm text-slate-500">Pilih toko atau pelanggan untuk transaksi ini</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Cari nama toko atau nomor telepon..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
          {isLoading ? (
            <div className="flex justify-center items-center h-32 text-slate-400">
              <Loader2 className="animate-spin" size={32} />
            </div>
          ) : filteredCustomers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Opsi Hardcode Pelanggan Baru */}
              <button
                onClick={() => {
                  setActiveCustomer({ id: 'new-customer', name: 'Pelanggan Baru' });
                  onClose();
                }}
                className={`p-4 rounded-xl border-2 text-left transition-all flex items-start gap-4 ${
                  activeCustomer?.id === 'new-customer' 
                    ? 'border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-500/10' 
                    : 'border-dashed border-slate-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/30'
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${
                  activeCustomer?.id === 'new-customer' ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-600'
                }`}>
                  <Plus size={24} />
                </div>
                <div>
                  <h3 className={`font-bold ${activeCustomer?.id === 'new-customer' ? 'text-emerald-900' : 'text-slate-800'}`}>
                    Pelanggan Baru
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Tulis nama lengkapnya di catatan keranjang</p>
                </div>
              </button>

              {/* Daftar Pelanggan dari Database */}
              {filteredCustomers.map(customer => {
                const isActive = activeCustomer?.id === customer.id;
                return (
                  <button
                    key={customer.id}
                    onClick={() => {
                      setActiveCustomer({ id: customer.id, name: customer.name });
                      onClose();
                    }}
                    className={`p-4 rounded-xl border-2 text-left transition-all flex items-start gap-4 ${
                      isActive 
                        ? 'border-blue-500 bg-blue-50 shadow-md shadow-blue-500/10' 
                        : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${
                      isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className={`font-bold ${isActive ? 'text-blue-900' : 'text-slate-800'}`}>
                        {customer.name}
                      </h3>
                      {customer.phone && <p className="text-sm text-slate-500 mt-0.5">{customer.phone}</p>}
                      {customer.address && <p className="text-xs text-slate-400 mt-1 line-clamp-1">{customer.address}</p>}
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <User size={48} className="mx-auto mb-4 opacity-20" />
              <p>Pelanggan tidak ditemukan.</p>
              <button
                onClick={() => {
                  setActiveCustomer({ id: 'new-customer', name: 'Pelanggan Baru' });
                  onClose();
                }}
                className="mt-4 px-6 py-2 bg-emerald-100 text-emerald-700 font-medium rounded-lg hover:bg-emerald-200 transition-colors"
              >
                + Pilih sebagai Pelanggan Baru
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
