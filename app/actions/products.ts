'use server';

import { db } from '@/lib/server/db';
import { requireRole } from '@/lib/server/session';

export async function saveProduct(input: {
  id?: string | null; name: string; categoryId?: string | null; unitId?: string | null;
  price: number; ingredients: { ingredient_id: string; quantity: number }[];
}) {
  try {
    await requireRole(['manager','super_admin']);
    if (!input.name?.trim() || !Number.isFinite(input.price) || input.price < 0 || !Array.isArray(input.ingredients))
      throw new Error('Produk tidak valid');
    if (input.ingredients.some(part => !part.ingredient_id || !Number.isFinite(part.quantity) || part.quantity <= 0))
      throw new Error('Resep tidak valid');
    const { data, error } = await db().rpc('pos_save_product', {
      p_id: input.id ?? null, p_name: input.name, p_category_id: input.categoryId ?? null,
      p_unit_id: input.unitId ?? null, p_price: input.price, p_parts: input.ingredients,
    });
    if (error) throw error;
    return { success: true as const, product: data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal menyimpan produk' };
  }
}

export async function deleteProducts(ids: string[]) {
  try {
    await requireRole(['manager','super_admin']);
    const { error } = await db().rpc('pos_delete_products', { p_ids: ids });
    if (error) throw error;
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Gagal menghapus produk' };
  }
}
