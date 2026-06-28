'use client';

import { usePosStore } from '@/lib/store/usePosStore';
import { Users, X } from 'lucide-react';
import clsx from 'clsx';

interface TableMapProps {
  onClose: () => void;
}

export default function TableMap({ onClose }: TableMapProps) {
  const { activeTable, setActiveTable } = usePosStore();

  // Mock table data (ini bisa datang dari database nantinya)
  const tables = Array.from({ length: 12 }, (_, i) => ({
    id: `Meja ${i + 1}`,
    name: `Meja ${i + 1}`,
    status: i % 4 === 0 ? 'occupied' : 'empty' // Mock status
  }));

  const handleSelect = (tableName: string, status: string) => {
    if (status === 'occupied') {
      alert('Meja ini sedang digunakan. Anda bisa menambahkan pesanan ke meja ini (fitur Merge/Add to Bill) jika diizinkan.');
      // Untuk demo, kita tetap izinkan pilih
    }
    setActiveTable(tableName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Pilih Meja (Dine In)</h2>
            <p className="text-sm text-slate-500">Pilih meja untuk pelanggan</p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto bg-slate-50/50">
          <div className="flex gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-white border-2 border-emerald-500"></div>
              <span className="text-sm text-slate-600">Kosong</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500 border-2 border-red-600"></div>
              <span className="text-sm text-slate-600">Terisi</span>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
            {tables.map((table) => {
              const isSelected = activeTable === table.name;
              const isEmpty = table.status === 'empty';
              
              return (
                <button
                  key={table.id}
                  onClick={() => handleSelect(table.name, table.status)}
                  className={clsx(
                    "relative p-4 rounded-2xl flex flex-col items-center justify-center gap-2 h-32 transition-all active:scale-95 border-2",
                    isSelected ? "ring-4 ring-blue-500/30" : "",
                    isEmpty 
                      ? "bg-white border-emerald-500 text-emerald-700 hover:bg-emerald-50" 
                      : "bg-red-500 border-red-600 text-white hover:bg-red-600",
                    isSelected && isEmpty ? "bg-emerald-100" : ""
                  )}
                >
                  <Users size={32} className={isEmpty ? "text-emerald-500" : "text-white/90"} />
                  <span className="font-bold text-lg">{table.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
