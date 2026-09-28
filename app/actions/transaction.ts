'use server';

import { db } from '@/lib/server/db';
import { requireRole } from '@/lib/server/session';

type SaleItem = { productId: string; quantity: number };

function cleanItems(items: unknown): { product_id: string; quantity: number }[] {
  if (!Array.isArray(items) || items.length < 1 || items.length > 100) throw new Error('Keranjang tidak valid');
  return items.map((item: SaleItem) => {
    if (!item || typeof item.productId !== 'string' || !/^[0-9a-f-]{36}$/.test(item.productId) ||
      !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10000) throw new Error('Jumlah produk tidak valid');
    return { product_id: item.productId, quantity: item.quantity };
  });
}

export async function quoteSale(items: SaleItem[]) {
  try {
    await requireRole(['cashier','manager','super_admin']);
    const { data, error } = await db().rpc('pos_quote', { p_items: cleanItems(items) });
    if (error) throw error;
    return { success: true as const, quote: data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal menghitung harga' };
  }
}

export async function processTransaction(payload: {
  items: SaleItem[]; payment_method: 'cash' | 'qris'; qris_confirmed?: boolean;
  quote_hash: string; idempotency_key: string;
}) {
  try {
    const actor = await requireRole(['cashier','manager','super_admin']);
    const items = cleanItems(payload.items);
    if (!['cash','qris'].includes(payload.payment_method) || !/^[0-9a-f]{64}$/.test(payload.quote_hash) ||
      !/^[0-9a-f-]{36}$/.test(payload.idempotency_key)) throw new Error('Data pembayaran tidak valid');
    const { data: shift, error: shiftError } = await db().from('shifts').select('id')
      .eq('cashier_id', actor.userId).eq('status', 'open').limit(1).maybeSingle();
    if (shiftError) throw shiftError;
    if (!shift) throw new Error('Buka shift dahulu');
    const { data, error } = await db().rpc('pos_create_sale', {
      p_user_id: actor.userId, p_shift_id: shift.id, p_items: items,
      p_payment_method: payload.payment_method, p_qris_confirmed: !!payload.qris_confirmed,
      p_quote_hash: payload.quote_hash, p_idempotency_key: payload.idempotency_key,
    });
    if (error) throw error;
    return { success: true as const, transaction: data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal menyimpan penjualan' };
  }
}

export async function deleteTransaction(txId: string, shouldRestoreStock = true) {
  try {
    const actor = await requireRole(['manager','super_admin']);
    const { error } = await db().rpc('pos_void_sale', { p_tx_id: txId, p_actor_id: actor.userId, p_restore_stock: shouldRestoreStock });
    if (error) throw error;
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal membatalkan transaksi' };
  }
}

export async function deleteTransactions(txIds: string[], shouldRestoreStock = true) {
  try {
    const actor = await requireRole(['manager','super_admin']);
    if (!Array.isArray(txIds) || txIds.length > 100) throw new Error('Daftar transaksi tidak valid');
    for (const txId of txIds) {
      const { error } = await db().rpc('pos_void_sale', { p_tx_id: txId, p_actor_id: actor.userId, p_restore_stock: shouldRestoreStock });
      if (error) throw error;
    }
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal membatalkan transaksi' };
  }
}
