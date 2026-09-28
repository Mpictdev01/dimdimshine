'use server';

import { db } from '@/lib/server/db';
import { requireRole } from '@/lib/server/session';

type MasterTable = 'categories' | 'units' | 'suppliers' | 'customers' | 'customer_areas';
type MasterInput = { name: string; phone?: string | null; address?: string | null; area_id?: string | null };
const limits: Record<MasterTable, number> = {
  categories: 100, units: 50, suppliers: 255, customers: 255, customer_areas: 100,
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function clean(table: MasterTable, input: MasterInput) {
  if (!Object.hasOwn(limits, table) || !input || typeof input !== 'object') throw new Error('Jenis data tidak valid');
  if (typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > limits[table])
    throw new Error('Nama wajib diisi dan tidak boleh terlalu panjang');
  const value: Record<string, string | null> = { name: input.name.trim() };
  if (table === 'suppliers' || table === 'customers') {
    if (input.phone != null && (typeof input.phone !== 'string' || input.phone.length > 50))
      throw new Error('Nomor telepon tidak valid');
    if (input.address != null && (typeof input.address !== 'string' || input.address.length > 5000))
      throw new Error('Alamat tidak valid');
    value.phone = input.phone?.trim() || null;
    value.address = input.address?.trim() || null;
  }
  if (table === 'customers') {
    if (input.area_id && (typeof input.area_id !== 'string' || !uuid.test(input.area_id)))
      throw new Error('Area tidak valid');
    value.area_id = input.area_id || null;
  }
  return value;
}

export async function saveMaster(table: MasterTable, id: string | null, input: MasterInput) {
  try {
    await requireRole(['manager', 'super_admin']);
    const value = clean(table, input);
    if (id !== null && !uuid.test(id)) throw new Error('ID tidak valid');
    if (table === 'customers' && value.area_id) {
      const { data: area, error: areaError } = await db().from('customer_areas').select('id')
        .eq('id', value.area_id).maybeSingle();
      if (areaError) throw areaError;
      if (!area) throw new Error('Area pelanggan tidak ditemukan');
    }
    const query = id
      ? db().from(table).update({ ...value, updated_at: new Date().toISOString() }).eq('id', id)
      : db().from(table).insert(value);
    const { data, error } = await query.select('id').single();
    if (error) throw error;
    return { success: true as const, id: data.id as string };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal menyimpan data' };
  }
}

export async function deleteMaster(table: MasterTable, id: string) {
  try {
    await requireRole(['manager', 'super_admin']);
    if (!Object.hasOwn(limits, table) || !uuid.test(id)) throw new Error('Data tidak valid');
    const references: Partial<Record<MasterTable, { table: string; column: string }>> = {
      categories: { table: 'products', column: 'category_id' },
      units: { table: 'products', column: 'unit_id' },
      suppliers: { table: 'purchases', column: 'supplier_id' },
      customers: { table: 'transactions', column: 'customer_id' },
      customer_areas: { table: 'customers', column: 'area_id' },
    };
    const reference = references[table];
    if (reference) {
      const { count, error } = await db().from(reference.table).select('id', { count: 'exact', head: true }).eq(reference.column, id);
      if (error) throw error;
      if (count) throw new Error('Data masih digunakan dalam riwayat atau master lain. Ubah referensinya dahulu.');
    }
    const { error } = await db().from(table).delete().eq('id', id).select('id').single();
    if (error) throw error;
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal menghapus data' };
  }
}

export async function updateStoreSettings(id: string, input: {
  store_name: string; address: string; tax_rate: number; service_charge: number; wa_report_template: string;
}) {
  try {
    await requireRole(['manager', 'super_admin']);
    if (!uuid.test(id)) throw new Error('Pengaturan toko belum tersedia');
    if (!input || typeof input.store_name !== 'string' || !input.store_name.trim() || input.store_name.length > 255 ||
      typeof input.address !== 'string' || input.address.length > 5000 ||
      typeof input.wa_report_template !== 'string' || input.wa_report_template.length > 10000 ||
      !Number.isFinite(input.tax_rate) || input.tax_rate < 0 || input.tax_rate > 100 ||
      !Number.isFinite(input.service_charge) || input.service_charge < 0 || input.service_charge > 100)
      throw new Error('Nilai pengaturan tidak valid');
    const { error } = await db().from('store_settings').update({
      store_name: input.store_name.trim(), address: input.address.trim(),
      tax_rate: input.tax_rate, service_charge: input.service_charge,
      wa_report_template: input.wa_report_template, updated_at: new Date().toISOString(),
    }).eq('id', id).select('id').single();
    if (error) throw error;
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal menyimpan pengaturan' };
  }
}
