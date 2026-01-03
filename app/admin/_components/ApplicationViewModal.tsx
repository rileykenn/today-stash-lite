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

function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  confirmTone,
  loading,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmTone: 'danger' | 'primary';
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  const confirmClass =
    confirmTone === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : 'bg-slate-900 hover:opacity-95 text-white';

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 p-3 sm:p-6 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden max-h-[90dvh] flex flex-col">
        <div className="px-4 py-3 border-b border-slate-200">
          <div className="font-semibold">{title}</div>
          <div className="mt-1 text-sm text-slate-600 whitespace-pre-line">{description}</div>
        </div>

        <div className="px-4 py-3 flex flex-col sm:flex-row sm:justify-end gap-2">
          <button
            onClick={onCancel}
            className="w-full sm:w-auto px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`w-full sm:w-auto px-3 py-2.5 rounded-xl text-sm font-semibold ${confirmClass} disabled:opacity-50`}
            disabled={loading}
          >
            {loading ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
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

  const [confirm, setConfirm] = useState<null | 'approve' | 'deny'>(null);
  const [acting, setActing] = useState(false);

  // status control
  const [statusDraft, setStatusDraft] = useState<AppStatus>('unread');
  const [savingStatus, setSavingStatus] = useState(false);

  // required approval selections
  const [towns, setTowns] = useState<TownRow[]>([]);
  const [loadingTowns, setLoadingTowns] = useState(false);
  const [townId, setTownId] = useState<string>(''); // required
  const [category, setCategory] = useState<MerchantCategory | ''>(''); // required

  const status = (row?.status ?? 'unread') as AppStatus;

  const contactLabel = row?.contact_name || row?.email || 'this contact';
  const businessLabel = row?.business_name || 'this business';

  const selectedTownName = towns.find((t) => t.id === townId)?.name?.trim() || '';

  const approveCopy =
    `Are you sure you want to approve this application?\n\n` +
    `Town: ${selectedTownName || '—'}\n` +
    `Category: ${category || '—'}\n\n` +
    `A merchant will be created and linked to the user profile.`;

  const denyCopy =
    `Are you sure you want to deny this application?\n\n` +
    `No merchant account will be created.`;

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
      .select('id,created_at,business_name,category,address,contact_name,position,email,phone,status')
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

  const loadTowns = async () => {
    setLoadingTowns(true);

    const { data, error } = await sb.from('towns').select('id,name').order('name', { ascending: true });

    setLoadingTowns(false);

    if (error) {
      console.error('Failed to load towns:', error.message);
      setTowns([]);
      return;
    }

    setTowns((data as any as TownRow[]) || []);
  };

  // Fetch on open
  useEffect(() => {
    if (!open || !applicationId) return;

    // reset selections on each open
    setTownId('');
    setCategory('');

    loadRow();
    loadTowns();
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

  const doApprove = async () => {
    if (!row?.id) return;

    // REQUIRE town + category before approving
    if (!townId) {
      alert('Please select a town before approving.');
      return;
    }
    if (!category) {
      alert('Please select a category before approving.');
      return;
    }

    setActing(true);
    try {
      // ✅ ONE server call does: create/find user, create merchant, link profile, set app approved
      const res = await fetch('/api/admin/approve-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: row.id,
          townId,
          category,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error('approve-application failed:', json);
        alert('Approve failed: ' + (json?.error || 'Unknown error'));
        return;
      }

      // success UI feedback
      if (json.createdNewUser) {
        alert(`Approved ✅\nMerchant created ✅\nTemp password: ${json.tempPassword}`);
      } else {
        alert(`Approved ✅\nMerchant created ✅\nUser already existed (no temp password)`);
      }

      // update local state to approved
      setRow((prev) => (prev ? { ...prev, status: 'approved' } : prev));
      setStatusDraft('approved');
      setConfirm(null);
      onRefresh?.();
    } finally {
      setActing(false);
    }
  };

  const doDeny = async () => {
    if (!row?.id) return;
    setActing(true);
    try {
      const { error } = await sb.from('applications').update({ status: 'denied' }).eq('id', row.id);
      if (error) {
        alert('Failed to deny: ' + error.message);
        return;
      }
      setRow((prev) => (prev ? { ...prev, status: 'denied' } : prev));
      setStatusDraft('denied');
      setConfirm(null);
      onRefresh?.();
    } finally {
      setActing(false);
    }
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

  const canApprove = !!row && !!townId && !!category;

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
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-slate-700">Review the details below, then approve or deny.</div>

                  <div className="flex w-full gap-2 sm:w-auto">
                    <button
                      onClick={() => setConfirm('deny')}
                      className="w-1/2 sm:w-auto px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-sm font-semibold text-red-700"
                      disabled={!row}
                    >
                      Deny
                    </button>

                    <button
                      onClick={() => setConfirm('approve')}
                      className="w-1/2 sm:w-auto px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50"
                      disabled={!canApprove}
                      title={!canApprove ? 'Select town and category first' : 'Approve'}
                    >
                      Approve
                    </button>
                  </div>
                </div>

                {/* Town + Category required selectors */}
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs font-semibold text-slate-500">Town (required)</div>
                      <select
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 bg-white text-sm"
                        value={townId}
                        onChange={(e) => setTownId(e.target.value)}
                        disabled={!row || loadingTowns}
                      >
                        <option value="">{loadingTowns ? 'Loading towns…' : 'Select town'}</option>
                        {towns.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name || 'Unnamed town'}
                          </option>
                        ))}
                      </select>
                      <div className="mt-1 text-[11px] text-slate-500">Must be an existing town on the server.</div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-slate-500">Category (required)</div>
                      <select
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 bg-white text-sm"
                        value={category}
                        onChange={(e) => setCategory(e.target.value as MerchantCategory)}
                        disabled={!row}
                      >
                        <option value="">Select category</option>
                        {MERCHANT_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <div className="mt-1 text-[11px] text-slate-500">Matches your merchants.category enum.</div>
                    </div>
                  </div>
                </div>

                {/* Set Status section */}
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-slate-500">Set status</div>
                      <div className="text-sm text-slate-700">Use this to mark as pending, approved, etc.</div>
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
                  <Field label="Category (from form)" value={row.category ?? '—'} />
                  <div className="sm:col-span-2">
                    <Field label="Address" value={row.address ?? '—'} />
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

      <ConfirmModal
        open={confirm === 'approve'}
        title="Approve application?"
        description={approveCopy}
        confirmLabel="Approve"
        confirmTone="primary"
        loading={acting}
        onCancel={() => setConfirm(null)}
        onConfirm={doApprove}
      />

      <ConfirmModal
        open={confirm === 'deny'}
        title="Deny application?"
        description={denyCopy}
        confirmLabel="Deny"
        confirmTone="danger"
        loading={acting}
        onCancel={() => setConfirm(null)}
        onConfirm={doDeny}
      />
    </>
  );
}
