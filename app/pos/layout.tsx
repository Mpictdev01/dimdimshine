import { ReactNode } from 'react';
import Image from 'next/image';

export default function PosLayout({ children }: { children: ReactNode }) {
  return (
    <div className="clay-shell flex flex-col h-screen w-full bg-slate-50 overflow-hidden font-sans">
      <header className="clay-header h-16 bg-white border-b shadow-sm flex items-center justify-between px-4 sm:px-6 shrink-0">
        <div className="flex items-center gap-4">
          <Image src="/poslogo.png" alt="Logo DIMDIM SHINE" width={42} height={42} className="clay-logo h-10 w-10 object-cover" priority />
          <h1 className="text-sm sm:text-xl font-black text-slate-800 tracking-tight">DIMDIM SHINE <span className="text-blue-500">POS</span></h1>
          <div className="hidden sm:block h-6 w-px bg-slate-200"></div>
          <span className="hidden sm:inline text-sm text-slate-500 font-medium">Terminal Utama</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Di sini bisa ditambahkan indikator online/offline */}
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
            <span className="hidden sm:inline text-sm text-slate-600 font-medium">Online</span>
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}
