'use client';

import { useEffect, useMemo, useState } from 'react';
import { sb } from '@/lib/supabaseBrowser';

type AppStatus = 'unread' | 'read' | 'pending' | 'approved' | 'denied';

type ApplicationRow = {
  id: string;
  created_at: string | null;

  business_name: string | null;
  category: string | null;
  address: string | null;

  contact_name: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;

  status: AppStatus | null;
  town_name: string | null; // Raw town string from form
};

type TownRow = {
  id: string;
  name: string | null;
};

const MERCHANT_CATEGORIES = [
  'Cafe & Bakery',
  'Financial',
  'Fitness',
  'Hair & Beauty',
  'Mechanical',
  'Miscellaneous',
  'Pet Care',
  'Photography',
  'Recreation',
] as const;

type MerchantCategory = (typeof MERCHANT_CATEGORIES)[number];

function fmtDateAU(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-1 text-sm text-slate-900 break-words">{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: AppStatus }) {
  const cfg = {
    unread: { label: 'Unread', cls: 'bg-slate-100 text-slate-800 border-slate-200' },
    read: { label: 'Read', cls: 'bg-white text-slate-800 border-slate-200' },
    pending: { label: 'Pending', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
    approved: { label: 'Approved', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    denied: { label: 'Denied', cls: 'bg-red-50 text-red-800 border-red-200' },
  }[status];

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

export default function ApplicationViewModal({
  open,
  applicationId,
  onClose,
  onRefresh,
}: {
  open: boolean;
  applicationId: string | null;
  onClose: () => void;
  onRefresh?: () => void;
}) {
  const [row, setRow] = useState<ApplicationRow | null>(null);
  const [loading, setLoading] = useState(false);

  // status control
  const [statusDraft, setStatusDraft] = useState<AppStatus>('unread');
  const [savingStatus, setSavingStatus] = useState(false);

  const status = (row?.status ?? 'unread') as AppStatus;

  const contactLabel = row?.contact_name || row?.email || 'this contact';
  const businessLabel = row?.business_name || 'this business';

  // ✅ IMPORTANT: lock background scroll while modal is open
  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;

    // prevent layout shift from scrollbar disappearance (desktop)
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [open]);

  const loadRow = async () => {
    if (!applicationId) return;
    setLoading(true);

    const { data, error } = await sb
      .from('applications')
      .select('id,created_at,business_name,category,address,town_name,contact_name,position,email,phone,status')
      .eq('id', applicationId)
      .single();

    setLoading(false);

    if (error) {
      console.error(error);
      setRow(null);
      return;
    }

    const r = (data as any as ApplicationRow) ?? null;
    setRow(r);
    setStatusDraft(((r?.status ?? 'unread') as AppStatus) || 'unread');
  };

  // Fetch on open
  useEffect(() => {
    if (!open || !applicationId) return;
    loadRow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, applicationId]);

  // Auto-mark as read when viewed (only if unread)
  useEffect(() => {
    if (!open || !row?.id) return;
    const current = (row.status ?? 'unread') as AppStatus;
    if (current !== 'unread') return;

    (async () => {
      const { error } = await sb.from('applications').update({ status: 'read' }).eq('id', row.id);
      if (error) {
        console.warn('Failed to auto-mark read:', error.message);
        return;
      }
      setRow((prev) => (prev ? { ...prev, status: 'read' } : prev));
      setStatusDraft('read');
      onRefresh?.();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, row?.id]);

  const setStatus = async (next: AppStatus) => {
    if (!row?.id) return;
    setSavingStatus(true);

    const { error } = await sb.from('applications').update({ status: next }).eq('id', row.id);

    setSavingStatus(false);

    if (error) {
      alert('Failed to update status: ' + error.message);
      return;
    }

    setRow((prev) => (prev ? { ...prev, status: next } : prev));
    setStatusDraft(next);
    onRefresh?.();
  };

  const statusOptions: { value: AppStatus; label: string }[] = useMemo(
    () => [
      { value: 'unread', label: 'Unread' },
      { value: 'read', label: 'Read' },
      { value: 'pending', label: 'Pending' },
      { value: 'approved', label: 'Approved' },
      { value: 'denied', label: 'Denied' },
    ],
    [],
  );

  if (!open) return null;

  return (
    <>
      {/* Overlay: blocks pointer + scroll on background */}
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 sm:p-6">
        {/* Modal: true popup, internal scroll only */}
        <div
          className="
            w-full max-w-2xl
            bg-white border border-slate-200 shadow-xl
            rounded-2xl overflow-hidden
            max-h-[90dvh]
            flex flex-col
            overscroll-contain
          "
          role="dialog"
          aria-modal="true"
        >
          {/* Header (fixed inside modal) */}
          <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="font-semibold truncate">{businessLabel}</div>
                  <StatusPill status={status} />
                </div>
                <div className="text-xs text-slate-500">Submitted: {fmtDateAU(row?.created_at ?? null)}</div>
              </div>

              <div className="flex w-full gap-2 sm:w-auto">
                <button
                  onClick={loadRow}
                  className="w-1/2 sm:w-auto px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm"
                >
                  Refresh
                </button>
                <button
                  onClick={onClose}
                  className="w-1/2 sm:w-auto px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>

          {/* Scroll area (ONLY this scrolls) */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {/* Action bar */}
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <div className="space-y-3">
                <div className="text-sm text-slate-700">
                  This application is for manual review. <br />
                  <span className="text-slate-500 text-xs">Approving here creates record only - authentication & merchant creation must be done manually.</span>
                </div>

                {/* Set Status section */}
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-slate-500">Set status</div>
                      <div className="text-sm text-slate-700">Manually update application status.</div>
                    </div>

                    <div className="flex w-full gap-2 sm:w-auto sm:items-center">
                      <select
                        className="w-full sm:w-56 rounded-xl border border-slate-200 px-3 py-2.5 bg-white text-sm"
                        value={statusDraft}
                        onChange={(e) => setStatusDraft(e.target.value as AppStatus)}
                        disabled={!row}
                      >
                        {statusOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => setStatus(statusDraft)}
                        className="shrink-0 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold disabled:opacity-50"
                        disabled={!row || savingStatus || statusDraft === status}
                        title={statusDraft === status ? 'No changes to save' : 'Save status'}
                      >
                        {savingStatus ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="p-4">
              {loading && <div className="text-sm text-slate-600">Loading…</div>}

              {!loading && !row && <div className="text-sm text-slate-600">Could not load application.</div>}

              {!loading && row && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Business name" value={row.business_name ?? '—'} />
                  <Field label="Category" value={row.category ?? '—'} />
                  <div className="sm:col-span-2">
                    <Field label="Address" value={row.address ?? '—'} />
                    {row.town_name && <div className="text-[11px] text-slate-400 mt-1">Raw Town: {row.town_name}</div>}
                  </div>

                  <Field label="Contact name" value={row.contact_name ?? '—'} />
                  <Field label="Position" value={row.position ?? '—'} />

                  <Field label="Email" value={row.email ?? '—'} />
                  <Field label="Phone" value={row.phone ?? '—'} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
