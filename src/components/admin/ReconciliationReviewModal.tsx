import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AppWindowModal } from '../common/AppWindowModal';
import { ReconciliationReviewResponse, ReconciliationReviewItem } from '../../types';
import {
  ShieldAlert,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Barcode,
  TrendingDown,
  TrendingUp,
  Wrench,
  X,
  Loader2,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenBarcode?: (barcode: string) => void;
}

const CATEGORIES = [
  { id: 'SHRINKAGE', label: 'Shrinkage / Theft / Loss' },
  { id: 'LEGACY_DATA', label: 'Legacy Seed Data Gap' },
  { id: 'DAMAGE_UNTRACKED', label: 'Untracked Damage' },
  { id: 'MANUAL_CORRECTION', label: 'Manual Count Correction' },
  { id: 'OTHER', label: 'Other' },
];

export const ReconciliationReviewModal: React.FC<Props> = ({ isOpen, onClose, onOpenBarcode }) => {
  const [data, setData] = useState<ReconciliationReviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolveTarget, setResolveTarget] = useState<ReconciliationReviewItem | null>(null);
  const [resolveCategory, setResolveCategory] = useState('SHRINKAGE');
  const [resolveReason, setResolveReason] = useState('');
  const [resolving, setResolving] = useState(false);

  const fetchReview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getReconciliationReview();
      setData(res);
    } catch (e: any) {
      setError(e?.message || 'Failed to load reconciliation review.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchReview();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleResolve = async () => {
    if (!resolveTarget) return;
    setResolving(true);
    try {
      await api.resolveReconciliationVariance({
        barcode: resolveTarget.barcode,
        category: resolveCategory,
        reason: resolveReason.trim() || undefined,
      });
      setResolveTarget(null);
      setResolveReason('');
      setResolveCategory('SHRINKAGE');
      await fetchReview();
    } catch (e: any) {
      alert(e?.message || 'Failed to resolve variance.');
    } finally {
      setResolving(false);
    }
  };

  const items = data?.items || [];

  return (
    <AppWindowModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-600" />
          <span>Audit Review — Variance Investigator</span>
        </div>
      }
      subtitle="Barcodes jinka auto-reconciliation balance nahi hota — unaccounted units (shrinkage / legacy data) resolve karein"
      size="2xl"
    >
      <div className="p-4 sm:p-6 space-y-4 max-h-[85vh] overflow-y-auto">
        {/* Summary strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Scanned</div>
              <div className="text-lg font-black text-slate-800" data-testid="recon-review-scanned">{data?.summary.totalBarcodesScanned ?? '—'}</div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-center">
              <div className="text-[10px] text-amber-700 uppercase font-bold">Flagged</div>
              <div className="text-lg font-black text-amber-700" data-testid="recon-review-flagged">{data?.summary.flaggedCount ?? '—'}</div>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-center">
              <div className="text-[10px] text-rose-700 uppercase font-bold flex items-center justify-center gap-1"><TrendingDown className="w-3 h-3" />Unaccounted</div>
              <div className="text-lg font-black text-rose-700">{data?.summary.totalUnaccounted ?? 0}</div>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2.5 text-center">
              <div className="text-[10px] text-indigo-700 uppercase font-bold flex items-center justify-center gap-1"><TrendingUp className="w-3 h-3" />Over-Counted</div>
              <div className="text-lg font-black text-indigo-700">{data?.summary.totalOverCounted ?? 0}</div>
            </div>
          </div>
          <button
            onClick={fetchReview}
            disabled={loading}
            data-testid="recon-review-refresh"
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-300 cursor-pointer self-start"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Rescan</span>
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center space-y-2">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto" />
            <p className="text-sm font-bold text-slate-700">Scanning all barcodes for reconciliation variance...</p>
          </div>
        ) : error ? (
          <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-2">
            <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
            <p className="text-xs text-rose-700">{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
            <h4 className="text-base font-bold text-emerald-900">All Inventory Fully Reconciled ✓</h4>
            <p className="text-xs text-emerald-700">Har barcode ka purchased = accounted. Koi variance nahi mila.</p>
          </div>
        ) : (
          <div className="space-y-2.5" data-testid="recon-review-list">
            {items.map((it) => {
              const over = it.variance < 0;
              return (
                <div key={it.barcode} data-testid={`recon-review-item-${it.barcode}`} className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs hover:border-amber-300 transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => onOpenBarcode && onOpenBarcode(it.barcode)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-mono font-bold border border-indigo-200 text-xs cursor-pointer"
                          title="Open full barcode lifecycle"
                        >
                          <Barcode className="w-3 h-3" />
                          {it.barcode}
                        </button>
                        <span className="font-bold text-slate-900 text-sm">{it.productName}</span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 ${over ? 'bg-indigo-100 text-indigo-800' : 'bg-rose-100 text-rose-800'}`}
                        >
                          <AlertTriangle className="w-3 h-3" />
                          {over ? `${Math.abs(it.variance)} over-counted` : `${it.variance} unaccounted`}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Purchased {it.purchased} = Avail {it.available} − Ret {it.returned} + Quick {it.quickSold} + InStock {it.pantryInStock} + Ret {it.returned} + Pay {it.pantryPayConsumed} + Miss {it.auditorMissing}{it.inTransit > 0 ? ` + Transit ${it.inTransit}` : ''}{it.reconciledAdjustment !== 0 ? ` + Resolved ${it.reconciledAdjustment}` : ''} = <strong>{it.accounted}</strong>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setResolveTarget(it);
                        setResolveReason('');
                        setResolveCategory(over ? 'MANUAL_CORRECTION' : 'SHRINKAGE');
                      }}
                      data-testid={`recon-resolve-btn-${it.barcode}`}
                      className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      Resolve
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resolve dialog */}
      {resolveTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" data-testid="recon-resolve-dialog">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
              <h4 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-600" />
                Resolve Variance — {resolveTarget.barcode}
              </h4>
              <button onClick={() => setResolveTarget(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                <strong>{resolveTarget.productName}</strong> — iski open variance{' '}
                <strong className={resolveTarget.variance < 0 ? 'text-indigo-700' : 'text-rose-700'}>
                  {resolveTarget.variance > 0 ? `+${resolveTarget.variance}` : resolveTarget.variance} units
                </strong>{' '}
                ko write-off karke reconciliation balance (variance → 0) kar diya jayega. Ye step audit-log me record hoga.
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase">Category</label>
                <select
                  value={resolveCategory}
                  onChange={(e) => setResolveCategory(e.target.value)}
                  data-testid="recon-resolve-category"
                  className="mt-1 w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase">Reason / Note (optional)</label>
                <textarea
                  value={resolveReason}
                  onChange={(e) => setResolveReason(e.target.value)}
                  data-testid="recon-resolve-reason"
                  rows={2}
                  placeholder="e.g. Physical count confirmed shrinkage; legacy seed had untracked consumption"
                  className="mt-1 w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setResolveTarget(null)}
                className="px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={resolving}
                data-testid="recon-resolve-confirm"
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60"
              >
                {resolving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Confirm Write-off
              </button>
            </div>
          </div>
        </div>
      )}
    </AppWindowModal>
  );
};
