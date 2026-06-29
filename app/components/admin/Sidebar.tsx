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
  LogOut,
  ChevronDown
} from 'lucide-react';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';

const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
  { 
    name: 'Produk', 
    icon: Package, 
    path: '/admin/products',
    subItems: [
      { name: 'Item Library', path: '/admin/products/item-library' },
      { name: 'Modifiers', path: '/admin/products/modifiers' },
      { name: 'Categories', path: '/admin/products/categories' },
      { name: 'Bundle Package', path: '/admin/products/bundle-package' },
      { name: 'Promo', path: '/admin/products/promo' },
      { name: 'Discounts', path: '/admin/products/discounts' },
      { name: 'Taxes', path: '/admin/products/taxes' },
      { name: 'Gratuity', path: '/admin/products/gratuity' },
      { name: 'Sales Type', path: '/admin/products/sales-type' },
      { name: 'Brands', path: '/admin/products/brands' },
    ]
  },
  { name: 'Inventaris', icon: Boxes, path: '/admin/inventory' },
  { name: 'Laporan', icon: FileText, path: '/admin/reports' },
  { name: 'Karyawan', icon: Users, path: '/admin/employees' },
  { name: 'Pengaturan', icon: Settings, path: '/admin/settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    'Produk': true // default expanded for better UX if they are on a product page, but we can just set it true
  });

  const handleLogout = () => {
    sessionStorage.removeItem('admin_auth');
    router.push('/admin/login');
  };

  const toggleMenu = (name: string) => {
    if (isCollapsed) setIsCollapsed(false);
    setExpandedMenus(prev => ({ ...prev, [name]: !prev[name] }));
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

      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-track]:bg-transparent">
        {menuItems.map((item) => {
          const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);
          const hasSubItems = !!item.subItems;
          const isExpanded = expandedMenus[item.name];

          return (
            <div key={item.name} className="flex flex-col mb-1">
              {hasSubItems ? (
                <button
                  onClick={() => toggleMenu(item.name)}
                  className={clsx(
                    "flex items-center justify-between px-3 py-3 rounded-lg transition-colors group relative w-full",
                    isActive 
                      ? "bg-blue-600/10 text-blue-400" 
                      : "hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon size={20} className={isActive ? "text-blue-500" : "text-slate-400 group-hover:text-slate-300"} />
                    {!isCollapsed && <span className="font-medium">{item.name}</span>}
                  </div>
                  {!isCollapsed && (
                    <div className={clsx(
                      "transition-transform duration-300",
                      isActive ? "text-blue-500" : "text-slate-400 group-hover:text-slate-300",
                      isExpanded ? "rotate-90" : ""
                    )}>
                      <ChevronRight size={16} />
                    </div>
                  )}
                  
                  {isCollapsed && (
                    <div className="absolute left-14 bg-slate-800 text-white px-2 py-1 rounded text-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                      {item.name}
                    </div>
                  )}
                </button>
              ) : (
                <Link
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
                  
                  {isCollapsed && (
                    <div className="absolute left-14 bg-slate-800 text-white px-2 py-1 rounded text-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                      {item.name}
                    </div>
                  )}
                </Link>
              )}

              {hasSubItems && !isCollapsed && (
                <div 
                  className={clsx(
                    "grid transition-all duration-300 ease-in-out",
                    isExpanded ? "grid-rows-[1fr] opacity-100 mt-1" : "grid-rows-[0fr] opacity-0"
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="ml-9 flex flex-col gap-1">
                      {item.subItems?.map(subItem => {
                        const isSubActive = pathname === subItem.path || pathname.startsWith(`${subItem.path}/`);
                        return (
                          <Link
                            key={subItem.name}
                            href={subItem.path}
                            className={clsx(
                              "px-3 py-2 rounded-lg transition-colors text-sm block",
                              isSubActive
                                ? "text-blue-400 font-medium bg-blue-600/10"
                                : "text-slate-400 hover:text-white hover:bg-slate-800"
                            )}
                          >
                            {subItem.name}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
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
