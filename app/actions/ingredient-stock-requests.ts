'use server';

import { db } from '@/lib/server/db';
import { requireRole } from '@/lib/server/session';

export type IngredientStockRequest = {
  id: string;
  ingredient_id: string;
  requested_by: string;
  shift_id: string;
  quantity_purchase: number;
  unit_snapshot: string;
  yield_quantity_snapshot: number;
  yield_unit_snapshot: string;
  quantity_stock: number;
  note: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reviewed_at: string | null;
  review_note: string | null;
  stock_before: number | null;
  stock_after: number | null;
  ingredient: { name: string } | null;
  requester?: { full_name: string } | null;
  reviewer?: { full_name: string } | null;
};

const requestColumns = `id,ingredient_id,requested_by,shift_id,
  quantity_purchase,unit_snapshot,yield_quantity_snapshot,yield_unit_snapshot,
  quantity_stock,note,status,requested_at,reviewed_at,review_note,stock_before,stock_after,
  ingredient:ingredients!ingredient_stock_requests_ingredient_id_fkey(name),
  requester:users!ingredient_stock_requests_requested_by_fkey(full_name),
  reviewer:users!ingredient_stock_requests_reviewed_by_fkey(full_name)`;

function errorMessage(error: unknown, fallback: string) {
  let message = '';
  if (error instanceof Error && error.message) message = error.message;
  if (error && typeof error === 'object' && 'message' in error &&
      typeof error.message === 'string' && error.message) message = error.message;
  if (/ingredient_stock_requests|pos_request_ingredient_stock|pos_review_ingredient_stock_request/i.test(message) &&
      /does not exist|could not find|schema cache/i.test(message)) {
    return 'Fitur persetujuan stok belum aktif di database. Migrasi 202609290002 perlu diterapkan.';
  }
  return message || fallback;
}

export async function requestIngredientStock(input: {
  shiftId: string;
  ingredientId: string;
  quantity: number;
  note: string;
  requestKey: string;
}) {
  try {
    const actor = await requireRole(['cashier']);
    if (!/^[0-9a-f-]{36}$/i.test(input.shiftId) ||
        !/^[0-9a-f-]{36}$/i.test(input.ingredientId) ||
        !/^[0-9a-f-]{36}$/i.test(input.requestKey) ||
        !Number.isFinite(input.quantity) || input.quantity <= 0 ||
        input.quantity > 100000 || Math.round(input.quantity * 100) / 100 !== input.quantity ||
        typeof input.note !== 'string' || input.note.trim().length < 3 ||
        input.note.trim().length > 500) throw new Error('Isi bahan, jumlah, dan catatan yang valid.');
    const { data, error } = await db().rpc('pos_request_ingredient_stock', {
      p_actor_id: actor.userId,
      p_shift_id: input.shiftId,
      p_ingredient_id: input.ingredientId,
      p_quantity_purchase: input.quantity,
      p_note: input.note.trim(),
      p_request_key: input.requestKey,
    });
    if (error) throw error;
    return { success: true as const, request: data as IngredientStockRequest };
  } catch (error) {
    return { success: false as const, error: errorMessage(error, 'Gagal mengajukan stok bahan.') };
  }
}

export async function myIngredientStockRequests() {
  const actor = await requireRole(['cashier']);
  const { data, error } = await db().from('ingredient_stock_requests')
    .select(requestColumns).eq('requested_by', actor.userId)
    .order('requested_at', { ascending: false }).limit(30);
  if (error) throw new Error(errorMessage(error, 'Gagal memuat permintaan stok.'));
  return (data ?? []) as unknown as IngredientStockRequest[];
}

export async function pendingIngredientStockRequests(page = 0) {
  await requireRole(['super_admin']);
  if (!Number.isInteger(page) || page < 0 || page > 10000) throw new Error('Halaman tidak valid');
  const pageSize = 30;
  const { data, count, error } = await db().from('ingredient_stock_requests')
    .select(requestColumns, { count: 'exact' }).eq('status', 'pending')
    .order('requested_at', { ascending: true })
    .range(page * pageSize, (page + 1) * pageSize - 1);
  if (error) throw new Error(errorMessage(error, 'Gagal memuat antrean persetujuan.'));
  return { requests: (data ?? []) as unknown as IngredientStockRequest[], total: count ?? 0, pageSize };
}

export async function reviewedIngredientStockRequests(page = 0) {
  await requireRole(['super_admin']);
  if (!Number.isInteger(page) || page < 0 || page > 10000) throw new Error('Halaman tidak valid');
  const pageSize = 30;
  const { data, count, error } = await db().from('ingredient_stock_requests')
    .select(requestColumns, { count: 'exact' }).neq('status', 'pending')
    .order('reviewed_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);
  if (error) throw new Error(errorMessage(error, 'Gagal memuat riwayat persetujuan.'));
  return { requests: (data ?? []) as unknown as IngredientStockRequest[], total: count ?? 0, pageSize };
}

export async function reviewIngredientStockRequest(input: {
  requestId: string;
  decision: 'approved' | 'rejected';
  note: string;
}) {
  try {
    const actor = await requireRole(['super_admin']);
    const note = input.note?.trim() ?? '';
    if (!/^[0-9a-f-]{36}$/i.test(input.requestId) ||
        !['approved', 'rejected'].includes(input.decision) ||
        note.length > 500 || (input.decision === 'rejected' && note.length < 3)) {
      throw new Error('Keputusan atau catatan tidak valid.');
    }
    const { data, error } = await db().rpc('pos_review_ingredient_stock_request', {
      p_request_id: input.requestId,
      p_actor_id: actor.userId,
      p_decision: input.decision,
      p_review_note: note || null,
    });
    if (error) throw error;
    return { success: true as const, request: data as IngredientStockRequest };
  } catch (error) {
    return { success: false as const, error: errorMessage(error, 'Gagal memutuskan permintaan stok.') };
  }
}

export async function approvedIngredientStockMovements() {
  await requireRole(['manager', 'super_admin']);
  const rows: { id: string; ingredient_id: string; quantity_stock: number; reviewed_at: string }[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db().from('ingredient_stock_requests')
      .select('id,ingredient_id,quantity_stock,reviewed_at')
      .eq('status', 'approved').order('reviewed_at', { ascending: false })
      .range(offset, offset + 499);
    // Keep the existing stock report available while the new migration is
    // being applied. Other database errors must remain visible.
    if (error?.code === 'PGRST205' || error?.code === '42P01') return [];
    if (error) throw new Error(errorMessage(error, 'Gagal memuat pergerakan stok kasir.'));
    rows.push(...(data ?? []));
    if (!data || data.length < 500) return rows;
  }
}
