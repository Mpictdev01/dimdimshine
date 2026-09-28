'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  Menu,
  X
} from 'lucide-react';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { currentSession, logoutAccount } from '@/app/actions/auth';

const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
  { 
    name: 'Produk', 
    icon: Package, 
    path: '/admin/products',
    subItems: [
      { name: 'Daftar Produk', path: '/admin/products' },
      { name: 'Kategori', path: '/admin/products/categories' },
      { name: 'Satuan', path: '/admin/products/units' },
    ]
  },
  { 
    name: 'Inventory', 
    icon: Boxes, 
    path: '/admin/inventory',
    subItems: [
      { name: 'Bahan Baku (BOM)', path: '/admin/inventory/ingredients' },
      { name: 'Pembelian (Barang Masuk)', path: '/admin/inventory/purchases' },
      { name: 'Data Supplier', path: '/admin/inventory/suppliers' },
      { name: 'Penyesuaian Stok', path: '/admin/inventory/adjustments' },
    ]
  },
  { 
    name: 'Riwayat & Cetak', 
    icon: FileText, 
    path: '/admin/reports',
    subItems: [
      { name: 'Riwayat Penjualan', path: '/admin/reports/sales' },
      { name: 'Rekap Penjualan', path: '/admin/reports/recap' },
      { name: 'Riwayat Stok', path: '/admin/reports/stock' },
      { name: 'Rekap Stok', path: '/admin/reports/stock-summary' },
    ]
  },
  { name: 'Sales & Pegawai', icon: Users, path: '/admin/employees' },
  {
    name: 'Pelanggan',
    icon: Users,
    path: '/admin/customers',
    subItems: [
      { name: 'Daftar Pelanggan', path: '/admin/customers' },
      { name: 'Area / Rute', path: '/admin/customers/areas' },
    ],
  },
  { name: 'Pengaturan', icon: Settings, path: '/admin/settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const [mobileMenu, setMobileMenu] = useState({ path: pathname, open: false });
  const isMobileOpen = mobileMenu.open && mobileMenu.path === pathname;
  const setIsMobileOpen = (open: boolean) => setMobileMenu({ path: pathname, open });
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (pathname === '/admin/login') return;

    currentSession()
      .then(active => { if (!cancelled) setIsSuperAdmin(active?.role === 'super_admin'); })
      .catch(() => { if (!cancelled) setIsSuperAdmin(false); });

    return () => { cancelled = true; };
  }, [pathname]);

  const handleLogout = async () => {
    await logoutAccount();
    setIsSuperAdmin(false);
    router.replace('/admin/login');
  };

  const toggleMenu = (name: string) => {
    if (isCollapsed) setIsCollapsed(false);
    setExpandedMenus(prev => ({ ...prev, [name]: !prev[name] }));
  };

  if (pathname === '/admin/login') return null;

  return (
    <>
      <div className="clay-header lg:hidden flex items-center justify-between bg-slate-900 text-white h-16 px-4 shrink-0 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsMobileOpen(true)} aria-label="Buka menu admin" className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <Menu size={24} />
          </button>
          <Image src="/poslogo.png" alt="" width={34} height={34} className="clay-logo h-8 w-8 object-cover" />
          <span className="font-bold text-lg">Dimdim Shine <span className="text-blue-500">Admin</span></span>
        </div>
      </div>

      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-slate-900/50 z-40 transition-opacity" 
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <div 
        className={clsx(
          "clay-sidebar bg-slate-900 text-slate-300 flex flex-col h-screen transition-all duration-300 z-50",
          "fixed inset-y-0 left-0 lg:static lg:relative lg:translate-x-0",
          isCollapsed ? "lg:w-20" : "lg:w-64",
          "w-64",
          isMobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        )}
      >
        <div className="p-6 shrink-0 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <Image src="/poslogo.png" alt="Logo DIMDIM SHINE" width={40} height={40} className="clay-logo h-10 w-10 object-cover shrink-0" priority />
            {!isCollapsed && (
              <h1 className="text-xl font-bold text-white tracking-tight">Dimdim Shine <span className="text-blue-500">Admin</span></h1>
            )}
          </div>
          <button 
            onClick={() => setIsMobileOpen(false)}
            aria-label="Tutup menu admin"
            className="lg:hidden text-slate-400 hover:text-white absolute right-4"
          >
            <X size={24} />
          </button>
        </div>

      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-label={isCollapsed ? 'Lebarkan menu admin' : 'Ciutkan menu admin'}
        className="hidden lg:flex absolute -right-3 top-20 bg-slate-800 p-1.5 rounded-full border border-slate-700 hover:bg-slate-700 text-white z-10"
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-track]:bg-transparent">
        {menuItems.filter(item => item.path !== '/admin/employees' || isSuperAdmin).map((item) => {
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
    </>
  );
}
