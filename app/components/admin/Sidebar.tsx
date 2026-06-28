'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Package, 
  Boxes, 
  FileText, 
  Users, 
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';

const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
  { name: 'Produk', icon: Package, path: '/admin/products' },
  { name: 'Inventaris', icon: Boxes, path: '/admin/inventory' },
  { name: 'Laporan', icon: FileText, path: '/admin/reports' },
  { name: 'Karyawan', icon: Users, path: '/admin/employees' },
  { name: 'Pengaturan', icon: Settings, path: '/admin/settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = () => {
    sessionStorage.removeItem('admin_auth');
    router.push('/admin/login');
  };

  return (
    <div 
      className={clsx(
        "bg-slate-900 text-slate-300 flex flex-col h-screen transition-all duration-300 relative",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      <div className="h-16 flex items-center justify-center border-b border-slate-800 shrink-0">
        {!isCollapsed ? (
          <h1 className="text-xl font-bold text-white tracking-tight">Okax <span className="text-blue-500">Admin</span></h1>
        ) : (
          <span className="text-xl font-bold text-white">O<span className="text-blue-500">A</span></span>
        )}
      </div>

      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 bg-slate-800 p-1.5 rounded-full border border-slate-700 hover:bg-slate-700 text-white z-10"
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto overflow-x-hidden">
        {menuItems.map((item) => {
          const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);
          return (
            <Link
              key={item.name}
              href={item.path}
              className={clsx(
                "flex items-center gap-3 px-3 py-3 rounded-lg transition-colors group relative",
                isActive 
                  ? "bg-blue-600/10 text-blue-400" 
                  : "hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon size={20} className={isActive ? "text-blue-500" : "text-slate-400 group-hover:text-slate-300"} />
              {!isCollapsed && <span className="font-medium">{item.name}</span>}
              
              {/* Tooltip for collapsed mode */}
              {isCollapsed && (
                <div className="absolute left-14 bg-slate-800 text-white px-2 py-1 rounded text-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-800">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 hover:text-white transition-colors text-slate-400"
        >
          <LogOut size={20} />
          {!isCollapsed && <span className="font-medium">Keluar</span>}
        </button>
      </div>
    </div>
  );
}
