'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Plus, Trash2, Key, Loader2, ShieldCheck, User, X, Save } from 'lucide-react';
import clsx from 'clsx';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminEmployees() {
  const router = useRouter();
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [formData, setFormData] = useState({ full_name: '', role: 'cashier', pin: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const authStr = sessionStorage.getItem('admin_auth');
    if (!authStr) {
      router.push('/admin/login');
      return;
    }
    fetchEmployees();
  }, [router]);

  const fetchEmployees = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('users').select('*').order('role');
    if (!error && data) {
      setEmployees(data);
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string, role: string) => {
    if (role === 'super_admin') {
      alert('Tidak dapat menghapus akun Super Admin.');
      return;
    }
    if (!confirm('Apakah Anda yakin ingin menghapus karyawan ini? Data riwayat shift tidak akan terhapus namun akan menjadi "Unknown User".')) return;
    
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (!error) {
      setEmployees(employees.filter(emp => emp.id !== id));
    } else {
      alert('Gagal menghapus karyawan');
    }
  };

  const openModal = (emp?: any) => {
    if (emp) {
      setEditingEmployee(emp);
      setFormData({
        full_name: emp.full_name,
        role: emp.role,
        pin: emp.pin
      });
    } else {
      setEditingEmployee(null);
      setFormData({ full_name: '', role: 'cashier', pin: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      full_name: formData.full_name,
      role: formData.role,
      pin: formData.pin
    };

    if (editingEmployee) {
      const { data, error } = await supabase
        .from('users')
        .update(payload)
        .eq('id', editingEmployee.id)
        .select()
        .single();
        
      if (!error && data) {
        setEmployees(employees.map(emp => emp.id === data.id ? data : emp));
        closeModal();
      } else {
        alert('Gagal memperbarui karyawan (Mungkin PIN sudah digunakan).');
      }
    } else {
      const { data, error } = await supabase
        .from('users')
        .insert([payload])
        .select()
        .single();
        
      if (!error && data) {
        setEmployees([...employees, data]);
        closeModal();
      } else {
        alert('Gagal menambahkan karyawan (Mungkin PIN sudah digunakan).');
      }
    }
    setIsSubmitting(false);
  };

  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'super_admin':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-purple-100 text-purple-700"><ShieldCheck size={12}/> Super Admin</span>;
      case 'manager':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-700"><ShieldCheck size={12}/> Manager</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700"><User size={12}/> Sales</span>;
    }
  };

  return (
    <div className="p-4 md:p-8 h-full relative flex flex-col overflow-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-4 md:mb-8 shrink-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">Manajemen Sales & Pegawai</h1>
          <p className="text-slate-500 text-sm">Kelola akun, role, dan PIN login sistem.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus size={20} />
          Tambah Pegawai
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white shadow-sm z-10">
                <tr className="text-slate-500 text-sm border-b border-slate-200">
                  <th className="font-medium p-4 pl-6">Nama Lengkap</th>
                  <th className="font-medium p-4">Role Akses</th>
                  <th className="font-medium p-4">PIN Code</th>
                  <th className="font-medium p-4 text-right pr-6">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 pl-6 font-semibold text-slate-800">
                      {emp.full_name}
                    </td>
                    <td className="p-4">
                      {getRoleBadge(emp.role)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-slate-400 font-mono text-sm">
                        <Key size={14} />
                        ****
                        <button 
                          onClick={() => openModal(emp)}
                          className="text-xs ml-2 text-blue-500 hover:underline font-sans"
                        >
                          Ubah/Reset
                        </button>
                      </div>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      {emp.role !== 'super_admin' && (
                        <button 
                          onClick={() => handleDelete(emp.id, emp.role)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Full Page Modal */}
      <div 
        className={clsx(
          "fixed inset-0 z-50 bg-white flex flex-col transition-all duration-300",
          isModalOpen ? "translate-y-0 opacity-100 visible" : "translate-y-full opacity-0 invisible pointer-events-none"
        )}
      >
        <div className="flex items-center justify-between px-4 md:px-8 py-4 md:py-6 border-b border-slate-100 bg-slate-50 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{editingEmployee ? 'Edit Pegawai' : 'Tambah Pegawai Baru'}</h2>
            <p className="text-slate-500 text-sm mt-1">Mengelola akses ke antarmuka POS dan Backoffice.</p>
          </div>
          <button 
            onClick={closeModal}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors shadow-sm"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/50 flex justify-center items-start">
          <form onSubmit={handleSubmit} className="w-full max-w-xl bg-white p-4 md:p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Lengkap</label>
                <input 
                  type="text" 
                  required
                  value={formData.full_name}
                  onChange={e => setFormData({...formData, full_name: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors" 
                  placeholder="Nama Sales / Manajer" 
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Role Akses</label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors appearance-none"
                    disabled={editingEmployee?.role === 'super_admin'}
                  >
                    <option value="cashier">Sales (POS Only)</option>
                    <option value="manager">Manajer (Backoffice)</option>
                    {editingEmployee?.role === 'super_admin' && <option value="super_admin">Super Admin</option>}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">PIN Login</label>
                  <input 
                    type="text" 
                    required
                    value={formData.pin}
                    onChange={e => setFormData({...formData, pin: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors" 
                    placeholder="Misal: 4321" 
                    maxLength={10}
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
              <button 
                type="button"
                onClick={closeModal}
                className="px-6 py-3 rounded-xl font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button 
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-md flex items-center gap-2"
              >
                {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                Simpan
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
