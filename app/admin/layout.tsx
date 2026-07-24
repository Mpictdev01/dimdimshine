import { ReactNode } from 'react';
import Sidebar from '@/app/components/admin/Sidebar';

export const metadata = {
  title: 'DIMDIM SHINE Backoffice',
  description: 'Dashboard Admin POS Cloud',
  manifest: '/manifest-admin.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'DIMDIM SHINE Backoffice',
  },
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
