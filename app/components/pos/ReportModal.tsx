'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { X, Loader2, Send, TrendingUp, Banknote, QrCode, Package } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ReportModalProps {
  onClose: () => void;
}

export default function ReportModal({ onClose }: ReportModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  
  const [reportData, setReportData] = useState({
    totalOmzet: 0,
    totalCash: 0,
    totalQris: 0
  });
  
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [waTemplate, setWaTemplate] = useState('');

  useEffect(() => {
    const fetchReportData = async () => {
      setIsLoading(true);
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Fetch transactions for today
        const { data: txData, error: txError } = await supabase
          .from('transactions')
          .select('total, payment_method')
          .gte('created_at', today.toISOString());
          
        let omzet = 0;
        let cash = 0;
        let qris = 0;
        
        if (txData && !txError) {
          txData.forEach(tx => {
            omzet += (tx.total || 0);
            if (tx.payment_method === 'cash') cash += (tx.total || 0);
            if (tx.payment_method === 'qris') qris += (tx.total || 0);
          });
        }
        
        setReportData({ totalOmzet: omzet, totalCash: cash, totalQris: qris });
        
        // Fetch Ingredients Stock
        const { data: ingData, error: ingError } = await supabase
          .from('ingredients')
          .select('id, name, current_stock, unit')
          .order('name');
          
        if (ingData && !ingError) {
          setIngredients(ingData);
        }
        
        // Fetch Store Settings
        const { data: settingsData } = await supabase
          .from('store_settings')
          .select('wa_report_template')
          .limit(1)
          .single();
          
        if (settingsData && settingsData.wa_report_template) {
          setWaTemplate(settingsData.wa_report_template);
        } else {
          // Default template if empty
          setWaTemplate(`Laporan Harian POS\n\nTotal Omzet: [OMZET]\nTunai: [TUNAI]\nQRIS: [QRIS]\n\nSisa Stok Bahan:\n[STOK]\n\nTerima kasih.`);
        }
        
      } catch (err) {
        console.error("Gagal mengambil data laporan:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchReportData();
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const generateWaMessage = () => {
    let message = waTemplate;
    
    message = message.replace(/\[OMZET\]/g, formatPrice(reportData.totalOmzet));
    message = message.replace(/\[TUNAI\]/g, formatPrice(reportData.totalCash));
    message = message.replace(/\[QRIS\]/g, formatPrice(reportData.totalQris));
    
    let stokText = ingredients.map(ing => `- ${ing.name}: ${ing.current_stock || 0} ${ing.unit}`).join('\n');
    if (!stokText) stokText = '- Data stok kosong -';
    
    message = message.replace(/\[STOK\]/g, stokText);
    
    return encodeURIComponent(message);
  };

  const handleSendWa = () => {
    const text = generateWaMessage();
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white border-b border-slate-100 p-4 flex items-center justify-between shrink-0 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <TrendingUp className="text-blue-600" />
          Laporan Harian Kasir
        </h2>
        <button 
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
            <p>Menyiapkan data laporan...</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6 md:space-y-8 pb-24">
            
            {/* Omzet Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 text-slate-600 mb-3">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                    <TrendingUp size={20} />
                  </div>
                  <span className="font-semibold text-sm uppercase tracking-wide">Total Omzet Hari Ini</span>
                </div>
                <div className="text-3xl font-black text-slate-800">
                  {formatPrice(reportData.totalOmzet)}
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 text-slate-600 mb-3">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                    <Banknote size={20} />
                  </div>
                  <span className="font-semibold text-sm uppercase tracking-wide">Pembayaran Tunai</span>
                </div>
                <div className="text-3xl font-black text-slate-800">
                  {formatPrice(reportData.totalCash)}
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 text-slate-600 mb-3">
                  <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                    <QrCode size={20} />
                  </div>
                  <span className="font-semibold text-sm uppercase tracking-wide">Pembayaran QRIS</span>
                </div>
                <div className="text-3xl font-black text-slate-800">
                  {formatPrice(reportData.totalQris)}
                </div>
              </div>
            </div>

            {/* Sisa Stok */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
                <Package className="text-blue-600" size={20} />
                <h3 className="font-bold text-slate-800">Sisa Stok Bahan Baku</h3>
              </div>
              <div className="p-0">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50">
                    <tr className="text-slate-500 text-sm border-b border-slate-100">
                      <th className="p-4 pl-6 font-medium">Bahan Baku</th>
                      <th className="p-4 pr-6 font-medium text-right">Sisa Stok (Asli)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ingredients.map(ing => (
                      <tr key={ing.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 pl-6 font-semibold text-slate-700">{ing.name}</td>
                        <td className="p-4 pr-6 text-right">
                          <span className="inline-flex items-center px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-sm border border-emerald-200">
                            {ing.current_stock || 0} {ing.unit}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {ingredients.length === 0 && (
                      <tr>
                        <td colSpan={2} className="p-6 text-center text-slate-400">Belum ada data bahan baku.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Floating Bottom Action */}
      {!isLoading && (
        <div className="p-4 md:p-6 bg-white border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] flex justify-center shrink-0 z-50 relative">
          <button 
            onClick={handleSendWa}
            className="w-full max-w-3xl py-4 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white rounded-2xl font-bold text-lg shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-3 transition-all"
          >
            <Send size={24} />
            Kirim Laporan ke WA
          </button>
        </div>
      )}
    </div>
  );
}
