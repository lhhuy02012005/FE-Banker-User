"use client";

import { useEffect, useState, useCallback } from 'react';
import {
  Sparkles, Gift, Clock, ChevronLeft, ChevronRight,
  CircleDollarSign, Bell, Search, Trophy, Loader2,
  CheckCircle2, XCircle, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  campaignService,
  type CampaignResponse,
  type CampaignHistoryDetailResponse,
} from '@/app/services/campaign.service';
import { handleError } from '@/app/utils/error-handler';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatVND(value: string | number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function progressPct(remaining: number, total: number) {
  if (!total) return 0;
  return Math.round((remaining / total) * 100);
}

function HistoryStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700',
    SUCCESS: 'bg-emerald-100 text-emerald-700',
    COMPLETED: 'bg-emerald-100 text-emerald-700',
    FAILED: 'bg-rose-100 text-rose-700',
  };
  const icons: Record<string, React.ReactNode> = {
    PENDING: <RefreshCw size={11} />,
    SUCCESS: <CheckCircle2 size={11} />,
    COMPLETED: <CheckCircle2 size={11} />,
    FAILED: <XCircle size={11} />,
  };

  const label = status === 'SUCCESS' ? 'COMPLETED' : status;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${styles[status] ?? 'bg-slate-100 text-slate-500'}`}>
      {icons[status]} {label}
    </span>
  );
}

// ─── Campaign Card ────────────────────────────────────────────────────────────

function CampaignCard({
  campaign,
  claiming,
  onClaim,
}: {
  campaign: CampaignResponse;
  claiming: boolean;
  onClaim: (id: string) => void;
}) {
  const pct = progressPct(campaign.remainingQuantity, campaign.totalQuantity);
  const isCashBack = campaign.actionType === 'CASH_BACK';

  return (
    <div className="group relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/90 p-6 shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      {/* accent bar */}
      <div
        className={`absolute left-0 top-0 h-1.5 w-full rounded-t-[2rem] ${
          isCashBack
            ? 'bg-gradient-to-r from-emerald-400 to-teal-400'
            : 'bg-gradient-to-r from-purple-400 to-pink-400'
        }`}
      />

      <div className="mt-1 flex items-start justify-between gap-4">
        <div
          className={`rounded-2xl p-3 ${
            isCashBack ? 'bg-emerald-100 text-emerald-600' : 'bg-purple-100 text-purple-600'
          }`}
        >
          {isCashBack ? <CircleDollarSign size={22} /> : <Bell size={22} />}
        </div>

        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700">
          ACTIVE
        </span>
      </div>

      <h3 className="mt-4 text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
        {campaign.name}
      </h3>
      {campaign.description && (
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500 line-clamp-2">{campaign.description}</p>
      )}

      <div className="mt-4 space-y-1">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Còn lại: {campaign.remainingQuantity.toLocaleString()} / {campaign.totalQuantity.toLocaleString()}</span>
          <span className={`font-semibold ${pct < 20 ? 'text-rose-500' : 'text-emerald-600'}`}>{pct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all ${
              pct < 20 ? 'bg-rose-400' : 'bg-gradient-to-r from-emerald-400 to-teal-400'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
        <Clock size={12} />
        <span>{formatDate(campaign.startTime)} → {formatDate(campaign.endTime)}</span>
      </div>

      {isCashBack && (
        <div className="mt-3 text-2xl font-black text-emerald-600">
          +{formatVND(campaign.actionValue)}
        </div>
      )}

      <button
        onClick={() => onClaim(campaign.id)}
        disabled={claiming || campaign.remainingQuantity === 0}
        className={`mt-4 w-full rounded-2xl px-4 py-3 text-sm font-bold transition ${
          campaign.remainingQuantity === 0
            ? 'cursor-not-allowed bg-slate-100 text-slate-400'
            : 'bg-slate-950 text-white shadow-lg shadow-slate-200 hover:bg-slate-800 active:scale-95 disabled:opacity-60'
        }`}
      >
        {claiming ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" /> Đang xử lý...
          </span>
        ) : campaign.remainingQuantity === 0 ? (
          'Đã hết phần quà'
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Gift size={16} /> Tham gia ngay
          </span>
        )}
      </button>
    </div>
  );
}

// ─── History Tab ─────────────────────────────────────────────────────────────

function HistoryTab() {
  const [rows, setRows] = useState<CampaignHistoryDetailResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await campaignService.getMyHistory(p, 10, 'joinedAt:desc');
      setRows(res.data ?? []);
      setTotalPages(res.totalPages ?? 1);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(page); }, [page, load]);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="animate-spin text-slate-300" size={32} />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-[2rem] bg-white/60 py-16 text-slate-400">
        <Trophy size={40} className="opacity-40" />
        <p className="text-sm font-medium">Bạn chưa tham gia campaign nào</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rows.map((h) => (
        <div
          key={h.historyId}
          className="rounded-[1.75rem] border border-white/60 bg-white/90 p-5 shadow-sm backdrop-blur-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {h.actionType === 'CASH_BACK' ? (
                  <CircleDollarSign size={18} className="text-emerald-500 shrink-0" />
                ) : (
                  <Bell size={18} className="text-purple-500 shrink-0" />
                )}
                <h4 className="font-bold text-slate-900">{h.campaignName}</h4>
              </div>
              {h.campaignDescription && (
                <p className="mt-1 text-xs text-slate-400 line-clamp-1">{h.campaignDescription}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock size={11} /> Tham gia: {formatDate(h.joinedAt)}
                </span>
                {h.actionType === 'CASH_BACK' && (
                  <span className="font-semibold text-emerald-600">+{formatVND(h.actionValue)}</span>
                )}
              </div>
            </div>
            <HistoryStatusBadge status={h.status} />
          </div>
        </div>
      ))}

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 pt-2">
          <span className="text-xs text-slate-400">Trang {page} / {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1}
              className="rounded-xl border p-2 text-slate-500 hover:bg-white disabled:opacity-40 transition"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
              className="rounded-xl border p-2 text-slate-500 hover:bg-white disabled:opacity-40 transition"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'explore' | 'history';

export default function CampaignPage() {
  const [tab, setTab] = useState<Tab>('explore');

  // explore tab state
  const [campaigns, setCampaigns] = useState<CampaignResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [debouncedKw, setDebouncedKw] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  // debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedKw(keyword), 400);
    return () => clearTimeout(t);
  }, [keyword]);

  const loadCampaigns = useCallback(async (p: number, kw: string, silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    try {
      const res = await campaignService.getActiveCampaigns(p, 9, kw, 'startTime:desc');
      setCampaigns(res.data ?? []);
      setTotalPages(res.totalPages ?? 1);
    } catch (err) {
      handleError(err);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => { setPage(1); }, [debouncedKw]);
  useEffect(() => { void loadCampaigns(page, debouncedKw); }, [page, debouncedKw, loadCampaigns]);

  useEffect(() => {
    // Keep campaign stock and newly-created campaigns fresh without manual reload.
    if (tab !== 'explore') return;

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadCampaigns(page, debouncedKw, true);
      }
    }, 5000);

    return () => window.clearInterval(interval);
  }, [tab, page, debouncedKw, loadCampaigns]);

  const handleClaim = async (id: string) => {
    setClaimingId(id);
    try {
      await campaignService.claimCampaign(id);
      toast.success('🎉 Tham gia thành công! Phần thưởng đang được xử lý.');
      await loadCampaigns(page, debouncedKw, true);
    } catch (err) {
      handleError(err);
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 p-8 text-white shadow-2xl sm:p-10">
        <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_top_right,rgba(34,197,94,0.5),transparent_28%),radial-gradient(circle_at_left,rgba(14,165,233,0.3),transparent_30%)]" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300">
              <Sparkles size={13} /> Campaign Hub
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              Nhận thưởng thật dễ dàng 🎁
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-7 text-slate-300">
              Khám phá các chương trình ưu đãi đang diễn ra và tham gia ngay để nhận phần thưởng về tài khoản.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setTab('explore')}
              className={`rounded-2xl px-5 py-2.5 text-sm font-bold transition ${
                tab === 'explore'
                  ? 'bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-400/30'
                  : 'border border-white/20 text-white hover:bg-white/10'
              }`}
            >
              Khám phá
            </button>
            <button
              onClick={() => setTab('history')}
              className={`rounded-2xl px-5 py-2.5 text-sm font-bold transition ${
                tab === 'history'
                  ? 'bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-400/30'
                  : 'border border-white/20 text-white hover:bg-white/10'
              }`}
            >
              <Trophy size={14} className="mr-1 inline" />
              Đã tham gia
            </button>
          </div>
        </div>
      </section>

      {/* Content */}
      {tab === 'explore' ? (
        <>
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm kiếm campaign..."
              className="w-full rounded-2xl border border-slate-200/80 bg-white/80 py-3 pl-10 pr-4 text-sm shadow-sm outline-none backdrop-blur transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          {/* Grid */}
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="animate-spin text-slate-300" size={36} />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-[2rem] bg-white/60 py-20 text-slate-400">
              <Sparkles size={40} className="opacity-40" />
              <p className="text-sm">Không có campaign đang hoạt động</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {campaigns.map((c) => (
                <CampaignCard
                  key={c.id}
                  campaign={c}
                  claiming={claimingId === c.id}
                  onClaim={handleClaim}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 disabled:opacity-40 transition hover:bg-slate-50"
              >
                <ChevronLeft size={16} /> Trước
              </button>
              <span className="text-sm text-slate-500">
                Trang {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 disabled:opacity-40 transition hover:bg-slate-50"
              >
                Sau <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      ) : (
        <HistoryTab />
      )}
    </div>
  );
}