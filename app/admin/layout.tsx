import { ReactNode } from 'react';
import Sidebar from '@/app/components/admin/Sidebar';

export const metadata = {
  title: 'Okax Backoffice',
  description: 'Dashboard Admin POS Cloud',
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col lg:flex-row h-screen w-full bg-slate-50 overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
