import { ReactNode } from 'react';

export default function PosLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 overflow-hidden font-sans">
      <header className="h-16 bg-white border-b shadow-sm flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Okax POS</h1>
          <div className="h-6 w-px bg-slate-200"></div>
          <span className="text-sm text-slate-500 font-medium">Terminal Utama</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Di sini bisa ditambahkan indikator online/offline */}
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
            <span className="text-sm text-slate-600 font-medium">Online</span>
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}
