'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Boxes, Loader2, Plus, RefreshCw, X } from 'lucide-react';
import { browserDataClient } from '@/lib/browser-data-client';
import {
  myIngredientStockRequests, requestIngredientStock,
  type IngredientStockRequest,
} from '@/app/actions/ingredient-stock-requests';

type Ingredient = {
  id: string;
  name: string;
  unit: string | null;
  yield_unit: string | null;
  yield_quantity: number;
  current_stock: number;
  min_stock_alert: number | null;
};

const statusText = { pending: 'Menunggu persetujuan', approved: 'Disetujui', rejected: 'Ditolak' };
const stockFormatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });
const purchaseFormatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 4 });

function stockLevel(ingredient: Ingredient) {
  const stock = Number(ingredient.current_stock ?? 0);
  if (stock <= 0) return 0;
  const minimum = Number(ingredient.min_stock_alert ?? 0) * Number(ingredient.yield_quantity || 1);
  return stock <= minimum ? 1 : 2;
}

function stockOptionLabel(ingredient: Ingredient) {
  const status = stockLevel(ingredient) === 0 ? '[HABIS] ' : stockLevel(ingredient) === 1 ? '[MENIPIS] ' : '';
  const unit = ingredient.yield_unit || ingredient.unit || 'unit';
  return `${status}${ingredient.name} — stok ${stockFormatter.format(Number(ingredient.current_stock ?? 0))} ${unit}`;
}

export default function IngredientStockRequestModal({ shiftId, onClose }: {
  shiftId: string;
  onClose: () => void;
}) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [requests, setRequests] = useState<IngredientStockRequest[]>([]);
  const [ingredientId, setIngredientId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const requestKey = useRef<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ingredientResult, ownRequests] = await Promise.all([
        browserDataClient.from('ingredients')
          .select('id,name,unit,yield_unit,yield_quantity,current_stock,min_stock_alert').order('name'),
        myIngredientStockRequests(),
      ]);
      if (ingredientResult.error) throw ingredientResult.error;
      setIngredients((ingredientResult.data ?? []) as Ingredient[]);
      setRequests(ownRequests);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Gagal memuat bahan dan permintaan stok.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const selectedIngredient = useMemo(
    () => ingredients.find(ingredient => ingredient.id === ingredientId),
    [ingredients, ingredientId],
  );
  const sortedIngredients = useMemo(() => [...ingredients].sort((a, b) =>
    stockLevel(a) - stockLevel(b) || a.name.localeCompare(b.name, 'id')),
  [ingredients]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    const parsedQuantity = Number(quantity);
    if (!selectedIngredient || !Number.isFinite(parsedQuantity) || parsedQuantity <= 0 ||
        Math.round(parsedQuantity * 100) / 100 !== parsedQuantity || note.trim().length < 3) {
      setError('Pilih bahan, masukkan jumlah positif maksimal 2 desimal, dan tulis catatan minimal 3 karakter.');
      return;
    }
    requestKey.current ??= crypto.randomUUID();
    setSubmitting(true);
    try {
      const result = await requestIngredientStock({
        shiftId, ingredientId, quantity: parsedQuantity, note,
        requestKey: requestKey.current,
      });
      if (!result.success) { setError(result.error); return; }
      requestKey.current = null;
      setIngredientId('');
      setQuantity('');
      setNote('');
      setSuccess('Permintaan dikirim. Stok akan bertambah setelah super admin menyetujui.');
      await load();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Gagal mengirim permintaan stok.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/90 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="ingredient-stock-request-title">
      <div className="mx-auto max-w-3xl space-y-5 pb-8">
        <header className="clay-surface flex items-start justify-between rounded-2xl p-5">
          <div>
            <h2 id="ingredient-stock-request-title" className="flex items-center gap-2 text-xl font-bold text-white"><Boxes size={22} /> Tambahkan Stok Bahan</h2>
            <p className="mt-1 text-sm text-slate-200">Ajukan stok masuk. Stok tidak berubah sebelum disetujui super admin.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup permintaan stok" className="rounded-lg p-2 text-white hover:bg-white/10"><X size={20} /></button>
        </header>

        {error && <p role="alert" className="rounded-xl border border-red-400/50 bg-red-950/60 p-3 text-sm text-white">{error}</p>}
        {success && <p role="status" className="rounded-xl border border-emerald-400/50 bg-emerald-950/50 p-3 text-sm text-white">{success}</p>}

        {loading ? <div className="flex justify-center p-12 text-white"><Loader2 className="animate-spin" /></div> : <>
          <form onSubmit={submit} className="clay-surface space-y-4 rounded-2xl p-5">
            <div>
              <label htmlFor="request-ingredient" className="mb-1 block text-sm font-semibold text-white">Bahan baku</label>
              <select id="request-ingredient" required value={ingredientId}
                onChange={event => { setIngredientId(event.target.value); requestKey.current = null; }}
                className="w-full rounded-xl border border-slate-400 px-3 py-3 text-sm">
                <option value="">Pilih bahan</option>
                {sortedIngredients.map(ingredient => <option key={ingredient.id} value={ingredient.id}>{stockOptionLabel(ingredient)}</option>)}
              </select>
              <p className="mt-1 text-xs text-slate-200">Bahan habis dan menipis ditampilkan paling atas.</p>
            </div>
            {selectedIngredient && <div className={`rounded-xl border p-3 text-sm text-white ${stockLevel(selectedIngredient) < 2 ? 'border-red-400/60 bg-red-950/60' : 'border-white/20 bg-slate-900'}`}>
              {stockLevel(selectedIngredient) < 2 && <strong className="mb-1 block text-red-200">
                {stockLevel(selectedIngredient) === 0 ? 'Stok habis' : 'Stok menipis'}
              </strong>}
              <p>Stok saat ini: <strong>{stockFormatter.format(Number(selectedIngredient.current_stock ?? 0))} {selectedIngredient.yield_unit || selectedIngredient.unit || 'unit'}</strong>
                {' ('}{purchaseFormatter.format(Number(selectedIngredient.current_stock ?? 0) / Number(selectedIngredient.yield_quantity || 1))} {selectedIngredient.unit || 'unit'}{')'}</p>
              <p className="mt-1 text-xs text-slate-200">Batas menipis: {stockFormatter.format(Number(selectedIngredient.min_stock_alert ?? 0) * Number(selectedIngredient.yield_quantity || 1))} {selectedIngredient.yield_unit || selectedIngredient.unit || 'unit'}
                {' · '}1 {selectedIngredient.unit || 'unit'} = {selectedIngredient.yield_quantity} {selectedIngredient.yield_unit || selectedIngredient.unit || 'unit'}</p>
            </div>}
            <div>
              <label htmlFor="request-quantity" className="mb-1 block text-sm font-semibold text-white">Jumlah masuk ({selectedIngredient?.unit || 'satuan beli'})</label>
              <input id="request-quantity" type="number" min="0.01" max="100000" step="0.01" required
                value={quantity} onChange={event => { setQuantity(event.target.value); requestKey.current = null; }}
                className="w-full rounded-xl border border-slate-400 px-3 py-3 text-sm" placeholder="Contoh: 2.5" />
            </div>
            <div>
              <label htmlFor="request-note" className="mb-1 block text-sm font-semibold text-white">Catatan sumber stok</label>
              <textarea id="request-note" required minLength={3} maxLength={500} rows={3}
                value={note} onChange={event => { setNote(event.target.value); requestKey.current = null; }}
                className="w-full rounded-xl border border-slate-400 px-3 py-3 text-sm" placeholder="Contoh: bahan datang dari pemasok pagi ini" />
            </div>
            <button type="submit" disabled={submitting || ingredients.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-3 font-bold text-white hover:bg-red-600 disabled:opacity-50">
              {submitting ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
              Kirim untuk Persetujuan
            </button>
          </form>

          <section className="clay-surface rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div><h3 className="font-bold text-white">Permintaan Saya</h3><p className="text-xs text-slate-200">30 pengajuan terbaru</p></div>
              <button type="button" onClick={() => void load()} aria-label="Muat ulang permintaan" className="rounded-lg p-2 text-white hover:bg-white/10"><RefreshCw size={18} /></button>
            </div>
            {requests.length === 0 ? <p className="text-sm text-slate-200">Belum ada permintaan stok.</p> :
              <ul className="space-y-3">{requests.map(request => <li key={request.id} className="rounded-xl border border-white/20 bg-slate-900 p-3 text-sm text-white">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong>{request.ingredient?.name || 'Bahan baku'} · +{request.quantity_purchase} {request.unit_snapshot}</strong>
                  <span className={`rounded-full px-2 py-1 text-xs font-bold ${request.status === 'approved' ? 'bg-emerald-800' : request.status === 'rejected' ? 'bg-red-800' : 'bg-amber-800'}`}>
                    {statusText[request.status]}
                  </span>
                </div>
                <p className="mt-1 text-slate-200">{request.note}</p>
                <p className="mt-1 text-xs text-slate-300">{new Date(request.requested_at).toLocaleString('id-ID')}</p>
                {request.review_note && <p className="mt-2 text-xs text-slate-200">Catatan super admin: {request.review_note}</p>}
              </li>)}</ul>}
          </section>
        </>}
      </div>
    </div>
  );
}
