'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { browserDataClient as db } from '@/lib/browser-data-client';
import { localDateEnd, localDateStart } from '@/lib/local-date';
import { approvedIngredientStockMovements } from '@/app/actions/ingredient-stock-requests';

type StockItem = { id: string; name: string; stock: number; unit: string; yield: number; kind: 'product' | 'ingredient' };
type Movement = { id: string; date: string; itemId: string; direction: 'IN' | 'OUT';
  quantity: number; source: string; reference: string };
type Relation<T> = T | T[] | null;
type Product = { id: string; name: string; stock: number; units: Relation<{ name: string }>;
  product_ingredients: { ingredient_id: string }[] };
type Ingredient = { id: string; name: string; current_stock: number; yield_quantity: number;
  yield_unit: string; unit: string };
type PurchaseItem = { id: string; product_id: string | null; ingredient_id: string | null;
  qty: number; purchases: Relation<{ id: string; created_at: string; suppliers: Relation<{ name: string }> }> };
type Usage = { id: string; product_id: string | null; ingredient_id: string | null; quantity: number;
  transaction_items: Relation<{ id: string; transaction_id: string; transactions: Relation<{ id: string; created_at: string; payment_status: string }> }> };
type TransactionItem = { id: string; product_id: string; quantity: number;
  transactions: Relation<{ id: string; created_at: string; payment_status: string }> };
type Adjustment = { id: string; product_id: string | null; ingredient_id: string | null;
  difference: number; reason: string; created_at: string };
type ApprovedStockRequest = { id: string; ingredient_id: string; quantity_stock: number; reviewed_at: string };

function one<T>(value: Relation<T>): T | null { return Array.isArray(value) ? value[0] ?? null : value; }

export default function AdminStockReport() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [itemId, setItemId] = useState('all');
  const [direction, setDirection] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    let queries;
    try {
      queries = await Promise.all([
        db.from('products').select('id,name,stock,units(name),product_ingredients(ingredient_id)'),
        db.from('ingredients').select('id,name,current_stock,yield_quantity,yield_unit,unit'),
        db.from('purchase_items').select('id,product_id,ingredient_id,qty,purchases(id,created_at,suppliers(name))'),
        db.from('sale_stock_usage').select('id,product_id,ingredient_id,quantity,transaction_items(id,transaction_id,transactions(id,created_at,payment_status))'),
        db.from('stock_adjustments').select('id,product_id,ingredient_id,difference,reason,created_at'),
        db.from('transaction_items').select('id,product_id,quantity,transactions(id,created_at,payment_status)'),
        approvedIngredientStockMovements().then(data => ({ data, error: null })),
      ]);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Gagal memuat persetujuan stok.');
      setLoading(false);
      return;
    }
    const failure = queries.find(query => query.error)?.error;
    if (failure) { setError(failure.message); setLoading(false); return; }

    const [products, ingredients, purchases, usages, adjustments, saleItems] = queries.slice(0, 6).map(query => query.data ?? []) as
      [Product[], Ingredient[], PurchaseItem[], Usage[], Adjustment[], TransactionItem[]];
    const approvedRequests = (queries[6].data ?? []) as ApprovedStockRequest[];
    const stockItems: StockItem[] = [
      ...products.filter(product => !product.product_ingredients?.length).map(product => ({
        id: product.id, name: product.name, stock: Number(product.stock),
        unit: one(product.units)?.name ?? 'unit', yield: 1, kind: 'product' as const,
      })),
      ...ingredients.map(ingredient => ({
        id: ingredient.id, name: ingredient.name, stock: Number(ingredient.current_stock),
        unit: ingredient.yield_unit || ingredient.unit, yield: Number(ingredient.yield_quantity) || 1,
        kind: 'ingredient' as const,
      })),
    ].sort((a, b) => a.name.localeCompare(b.name));
    const itemMap = new Map(stockItems.map(item => [item.id, item]));
    const rows: Movement[] = [];
    for (const purchase of purchases) {
      const target = itemMap.get(purchase.ingredient_id ?? purchase.product_id ?? '');
      const parent = one(purchase.purchases);
      if (!target || !parent) continue;
      rows.push({ id: `purchase-${purchase.id}`, date: parent.created_at, itemId: target.id,
        direction: 'IN', quantity: Number(purchase.qty) * target.yield,
        source: 'Pembelian', reference: one(parent.suppliers)?.name ?? parent.id });
    }
    const trackedSaleItems = new Set<string>();
    for (const usage of usages) {
      const target = itemMap.get(usage.ingredient_id ?? usage.product_id ?? '');
      const line = one(usage.transaction_items);
      const transaction = one(line?.transactions ?? null);
      if (line) trackedSaleItems.add(line.id);
      if (!target || !transaction || transaction.payment_status !== 'paid') continue;
      rows.push({ id: `sale-${usage.id}`, date: transaction.created_at, itemId: target.id,
        direction: 'OUT', quantity: Number(usage.quantity), source: 'Penjualan', reference: transaction.id });
    }
    // Historical BOM usage was never recorded. Show only direct-stock sales.
    for (const line of saleItems) {
      const target = itemMap.get(line.product_id);
      const transaction = one(line.transactions);
      if (!target || target.kind !== 'product' || trackedSaleItems.has(line.id) ||
        !transaction || transaction.payment_status !== 'paid') continue;
      rows.push({ id: `legacy-sale-${line.id}`, date: transaction.created_at, itemId: target.id,
        direction: 'OUT', quantity: Number(line.quantity), source: 'Penjualan lama', reference: transaction.id });
    }
    for (const adjustment of adjustments) {
      const target = itemMap.get(adjustment.ingredient_id ?? adjustment.product_id ?? '');
      if (!target || !Number(adjustment.difference)) continue;
      rows.push({ id: `adjustment-${adjustment.id}`, date: adjustment.created_at, itemId: target.id,
        direction: adjustment.difference > 0 ? 'IN' : 'OUT',
        quantity: Math.abs(Number(adjustment.difference)) * target.yield,
        source: 'Penyesuaian', reference: adjustment.reason });
    }
    for (const request of approvedRequests) {
      const target = itemMap.get(request.ingredient_id);
      if (!target || !request.reviewed_at) continue;
      rows.push({ id: `cashier-stock-${request.id}`, date: request.reviewed_at, itemId: target.id,
        direction: 'IN', quantity: Number(request.quantity_stock),
        source: 'Persetujuan stok kasir', reference: request.id });
    }
    setItems(stockItems);
    setMovements(rows.sort((a, b) => Date.parse(b.date) - Date.parse(a.date)));
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const visible = useMemo(() => movements.filter(movement => {
    const item = items.find(entry => entry.id === movement.itemId);
    return item && (itemId === 'all' || itemId === item.id) &&
      (direction === 'all' || direction === movement.direction) &&
      (!startDate || new Date(movement.date) >= localDateStart(startDate)) &&
      (!endDate || new Date(movement.date) <= localDateEnd(endDate)) &&
      (!search || `${item.name} ${movement.reference} ${movement.source}`.toLowerCase().includes(search.toLowerCase()));
  }), [movements, items, itemId, direction, startDate, endDate, search]);
  const selectedItem = items.find(item => item.id === itemId);

  return <main className="p-4 md:p-8 space-y-5">
    <header>
      <h1 className="text-2xl font-bold text-slate-800">Riwayat Pergerakan Stok</h1>
      <p className="text-sm text-slate-500">Pergerakan produk tanpa resep dan bahan baku dalam satuan fisik.</p>
    </header>
    <section className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-5" aria-label="Filter riwayat stok">
      <label className="text-sm">Cari nama, referensi, atau sumber
        <input className="mt-1 w-full rounded-lg border p-2" value={search} onChange={event => setSearch(event.target.value)} />
      </label>
      <label className="text-sm">Barang
        <select className="mt-1 w-full rounded-lg border p-2" value={itemId} onChange={event => setItemId(event.target.value)}>
          <option value="all">Semua barang</option>
          {items.map(item => <option key={item.id} value={item.id}>{item.name} ({item.kind === 'ingredient' ? 'Bahan' : 'Produk'})</option>)}
        </select>
      </label>
      <label className="text-sm">Arah
        <select className="mt-1 w-full rounded-lg border p-2" value={direction} onChange={event => setDirection(event.target.value)}>
          <option value="all">Semua</option><option value="IN">Masuk</option><option value="OUT">Keluar</option>
        </select>
      </label>
      <label className="text-sm">Dari tanggal
        <input type="date" className="mt-1 w-full rounded-lg border p-2" value={startDate} onChange={event => setStartDate(event.target.value)} />
      </label>
      <label className="text-sm">Sampai tanggal
        <input type="date" className="mt-1 w-full rounded-lg border p-2" value={endDate} onChange={event => setEndDate(event.target.value)} />
      </label>
    </section>
    {selectedItem && <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900">
      Stok fisik saat ini: <strong>{selectedItem.stock} {selectedItem.unit}</strong>
    </p>}
    {loading ? <p role="status">Memuat riwayat stok...</p> : error ?
      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4">
        <p>Gagal memuat: {error}</p><button className="mt-2 rounded bg-red-700 px-3 py-2 text-white" onClick={() => void load()}>Coba lagi</button>
      </div> : <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50"><tr>
            <th className="p-3">Waktu</th><th className="p-3">Barang</th><th className="p-3">Sumber</th>
            <th className="p-3">Referensi</th><th className="p-3 text-right">Pergerakan</th>
          </tr></thead>
          <tbody>{visible.map(movement => {
            const item = items.find(entry => entry.id === movement.itemId)!;
            return <tr key={movement.id} className="border-t">
              <td className="p-3">{new Date(movement.date).toLocaleString('id-ID')}</td>
              <td className="p-3">{item.name}</td><td className="p-3">{movement.source}</td>
              <td className="p-3 break-all">{movement.reference}</td>
              <td className={`p-3 text-right font-semibold ${movement.direction === 'IN' ? 'text-emerald-700' : 'text-red-700'}`}>
                {movement.direction === 'IN' ? '+' : '-'}{movement.quantity} {item.unit}
              </td>
            </tr>;
          })}</tbody>
        </table>
        {visible.length === 0 && <p className="p-8 text-center text-slate-500">
          {movements.length === 0 ? 'Belum ada pergerakan stok.' : 'Tidak ada hasil untuk filter ini.'}
        </p>}
      </div>}
    <p className="text-xs text-slate-500">Riwayat penjualan resep sebelum migrasi tidak memiliki catatan pemakaian bahan. Pergerakannya tidak direkonstruksi otomatis.</p>
  </main>;
}
