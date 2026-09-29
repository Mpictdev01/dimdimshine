'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ClipboardCheck, Loader2, RefreshCw, X } from 'lucide-react';
import {
  pendingIngredientStockRequests, reviewedIngredientStockRequests,
  reviewIngredientStockRequest, type IngredientStockRequest,
} from '@/app/actions/ingredient-stock-requests';

type Tab = 'pending' | 'reviewed';
type Decision = 'approved' | 'rejected';

export default function StockRequestsClient() {
  const [tab, setTab] = useState<Tab>('pending');
  const [page, setPage] = useState(0);
  const [requests, setRequests] = useState<IngredientStockRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<{ request: IngredientStockRequest; decision: Decision } | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const latestLoad = useRef(0);

  const load = useCallback(async () => {
    const loadId = ++latestLoad.current;
    setLoading(true);
    setError('');
    setRequests([]);
    try {
      const result = tab === 'pending'
        ? await pendingIngredientStockRequests(page)
        : await reviewedIngredientStockRequests(page);
      if (loadId !== latestLoad.current) return;
      setRequests(result.requests);
      setTotal(result.total);
      setPageSize(result.pageSize);
    } catch (failure) {
      if (loadId === latestLoad.current) setError(failure instanceof Error ? failure.message : 'Gagal memuat permintaan stok.');
    } finally {
      if (loadId === latestLoad.current) setLoading(false);
    }
  }, [tab, page]);

  useEffect(() => { void load(); }, [load]);

  const switchTab = (next: Tab) => {
    setTab(next);
    setPage(0);
    setNotice('');
  };

  const openDecision = (request: IngredientStockRequest, decision: Decision) => {
    setSelected({ request, decision });
    setReviewNote('');
    setError('');
  };

  const submitDecision = async () => {
    if (!selected) return;
    if (selected.decision === 'rejected' && reviewNote.trim().length < 3) {
      setError('Tuliskan alasan penolakan minimal 3 karakter.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const result = await reviewIngredientStockRequest({
        requestId: selected.request.id,
        decision: selected.decision,
        note: reviewNote,
      });
      if (!result.success) { setError(result.error); return; }
      setNotice(selected.decision === 'approved'
        ? 'Permintaan disetujui. Stok bahan sudah bertambah.'
        : 'Permintaan ditolak. Stok bahan tidak berubah.');
      setSelected(null);
      if (page > 0 && requests.length === 1) setPage(page - 1);
      else await load();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Gagal memutuskan permintaan stok.');
    } finally {
      setSubmitting(false);
    }
  };

  return <main className="space-y-5 p-4 md:p-8">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-white"><ClipboardCheck size={25} /> Persetujuan Stok Bahan</h1>
        <p className="mt-1 text-sm text-slate-200">Stok baru bertambah saat permintaan kasir disetujui.</p>
      </div>
      <button type="button" onClick={() => void load()} className="flex items-center gap-2 rounded-xl border border-red-300/40 px-3 py-2 text-sm font-semibold text-white hover:bg-red-900/30">
        <RefreshCw size={16} /> Muat ulang
      </button>
    </header>

    <div className="flex gap-2" role="tablist" aria-label="Status permintaan stok">
      <button type="button" role="tab" aria-selected={tab === 'pending'} onClick={() => switchTab('pending')}
        className={`rounded-xl px-4 py-2 text-sm font-semibold ${tab === 'pending' ? 'bg-red-700 text-white' : 'bg-slate-800 text-slate-200'}`}>
        Menunggu Persetujuan
      </button>
      <button type="button" role="tab" aria-selected={tab === 'reviewed'} onClick={() => switchTab('reviewed')}
        className={`rounded-xl px-4 py-2 text-sm font-semibold ${tab === 'reviewed' ? 'bg-red-700 text-white' : 'bg-slate-800 text-slate-200'}`}>
        Riwayat Keputusan
      </button>
    </div>

    {notice && <p role="status" className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3 text-sm text-white">{notice}</p>}
    {error && <p role="alert" className="rounded-xl border border-red-400/50 bg-red-950/40 p-3 text-sm text-white">{error}</p>}

    {loading ? <div className="flex justify-center p-12 text-white"><Loader2 className="animate-spin" /></div> :
      requests.length === 0 ? <div className="clay-surface rounded-2xl p-8 text-center text-slate-200">
        {tab === 'pending' ? 'Tidak ada permintaan yang menunggu.' : 'Belum ada keputusan stok.'}
      </div> : <div className="grid gap-4 lg:grid-cols-2">
        {requests.map(request => <article key={request.id} className="clay-surface rounded-2xl p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-white">{request.ingredient?.name || 'Bahan baku'}</h2>
              <p className="text-sm text-slate-200">Kasir: {request.requester?.full_name || 'Tidak dikenal'}</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold text-white ${request.status === 'approved' ? 'bg-emerald-800' : request.status === 'rejected' ? 'bg-red-800' : 'bg-amber-800'}`}>
              {request.status === 'pending' ? 'Menunggu' : request.status === 'approved' ? 'Disetujui' : 'Ditolak'}
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-white">+{request.quantity_purchase} {request.unit_snapshot}</p>
          <p className="text-xs text-slate-200">Setara {request.quantity_stock} {request.yield_unit_snapshot} stok bahan</p>
          <div className="mt-3 rounded-xl bg-slate-900 p-3 text-sm text-white">
            <span className="font-semibold">Catatan kasir:</span> {request.note}
          </div>
          <p className="mt-3 text-xs text-slate-200">Diajukan {new Date(request.requested_at).toLocaleString('id-ID')}</p>
          {request.status !== 'pending' && <div className="mt-3 space-y-1 border-t border-white/20 pt-3 text-xs text-slate-200">
            <p>Diputuskan {request.reviewed_at ? new Date(request.reviewed_at).toLocaleString('id-ID') : '-'} oleh {request.reviewer?.full_name || 'Super admin'}</p>
            {request.review_note && <p>Catatan: {request.review_note}</p>}
            {request.status === 'approved' && <p>Stok: {request.stock_before} → {request.stock_after} {request.yield_unit_snapshot}</p>}
          </div>}
          {request.status === 'pending' && <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => openDecision(request, 'approved')}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-3 py-2 font-semibold text-white hover:bg-emerald-600"><Check size={17} /> Setujui</button>
            <button type="button" onClick={() => openDecision(request, 'rejected')}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-400 px-3 py-2 font-semibold text-white hover:bg-red-900/40"><X size={17} /> Tolak</button>
          </div>}
        </article>)}
      </div>}

    {total > pageSize && <nav aria-label="Halaman permintaan stok" className="flex items-center justify-between gap-3 text-sm text-white">
      <button type="button" disabled={page === 0 || loading} onClick={() => setPage(value => value - 1)} className="rounded-lg border border-white/30 px-3 py-2 disabled:opacity-40">Sebelumnya</button>
      <span>Halaman {page + 1} dari {Math.ceil(total / pageSize)}</span>
      <button type="button" disabled={(page + 1) * pageSize >= total || loading} onClick={() => setPage(value => value + 1)} className="rounded-lg border border-white/30 px-3 py-2 disabled:opacity-40">Berikutnya</button>
    </nav>}

    {selected && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-labelledby="stock-decision-title">
      <div className="clay-surface w-full max-w-md rounded-2xl p-5">
        <h2 id="stock-decision-title" className="text-xl font-bold text-white">{selected.decision === 'approved' ? 'Setujui stok masuk?' : 'Tolak permintaan stok?'}</h2>
        <p className="mt-2 text-sm text-slate-200">
          {selected.request.ingredient?.name}: +{selected.request.quantity_purchase} {selected.request.unit_snapshot}.
          {selected.decision === 'approved' ? ' Stok akan langsung bertambah setelah persetujuan.' : ' Stok tidak akan berubah.'}
        </p>
        <label htmlFor="stock-review-note" className="mt-4 block text-sm font-semibold text-white">
          Catatan {selected.decision === 'rejected' ? 'penolakan (wajib)' : '(opsional)'}
        </label>
        <textarea id="stock-review-note" rows={3} maxLength={500} value={reviewNote}
          onChange={event => setReviewNote(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-400 p-3 text-sm" />
        {error && <p role="alert" className="mt-3 rounded-lg border border-red-400/50 bg-red-950/50 p-2 text-sm text-white">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button type="button" disabled={submitting} onClick={() => setSelected(null)} className="flex-1 rounded-xl border border-white/30 px-3 py-2 font-semibold text-white">Batal</button>
          <button type="button" disabled={submitting} onClick={() => void submitDecision()} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-700 px-3 py-2 font-semibold text-white disabled:opacity-50">
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {selected.decision === 'approved' ? 'Ya, Setujui' : 'Ya, Tolak'}
          </button>
        </div>
      </div>
    </div>}
  </main>;
}
