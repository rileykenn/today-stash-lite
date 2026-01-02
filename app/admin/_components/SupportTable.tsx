'use client';

import { useEffect, useMemo, useState } from 'react';
import { sb } from '@/lib/supabaseBrowser';

type SupportStatus = 'unresolved' | 'contacted' | 'resolved';

type SupportRow = {
  id: string;
  phone: string | null;
  type: string | null;
  topic: string | null;
  message: string | null;
  status: SupportStatus | null;
  is_read: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

function fmtSydney(v?: string | null) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-AU', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function statusLabel(s: SupportStatus | null | undefined) {
  if (!s) return 'Unresolved';
  if (s === 'unresolved') return 'Unresolved';
  if (s === 'contacted') return 'Contacted';
  return 'Resolved';
}

function statusClasses(s: SupportStatus | null | undefined) {
  if (!s || s === 'unresolved') return 'border-amber-200 bg-amber-50 text-amber-800';
  if (s === 'contacted') return 'border-sky-200 bg-sky-50 text-sky-800';
  return 'border-emerald-200 bg-emerald-50 text-emerald-800';
}

function readLabel(isRead: boolean) {
  return isRead ? 'Read' : 'Unread';
}

function readClasses(isRead: boolean) {
  return isRead
    ? 'border-slate-200 bg-slate-50 text-slate-700'
    : 'border-violet-200 bg-violet-50 text-violet-800';
}

export default function SupportTable() {
  const [rows, setRows] = useState<SupportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SupportStatus>('all');

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<SupportRow | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingRead, setSavingRead] = useState(false);

  const fetchSupport = async () => {
    setLoading(true);

    const { data, error } = await sb
      .from('support_requests')
      .select('id,phone,type,topic,message,status,is_read,created_at,updated_at')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('SUPPORT FETCH ERROR:', error);
      setRows([]);
      setLoading(false);
      return;
    }

    const list = ((data as any[]) || []) as SupportRow[];
    setRows(list);
    setLoading(false);
  };

  useEffect(() => {
    fetchSupport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = useMemo(() => {
    // unread first, then status priority, then newest
    const statusWeight = (s: SupportStatus | null | undefined) => {
      if (!s || s === 'unresolved') return 0;
      if (s === 'contacted') return 1;
      return 2;
    };

    return [...rows].sort((a, b) => {
      // unread first
      const rw = Number(a.is_read) - Number(b.is_read);
      if (rw !== 0) return rw;

      // unresolved/contacted/resolved
      const sw = statusWeight(a.status) - statusWeight(b.status);
      if (sw !== 0) return sw;

      // newest
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });
  }, [rows]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();

    return sorted.filter((r) => {
      if (statusFilter !== 'all') {
        const s = (r.status ?? 'unresolved') as SupportStatus;
        if (s !== statusFilter) return false;
      }

      if (!term) return true;

      const hay = [
        r.type ?? '',
        r.topic ?? '',
        r.phone ?? '',
        r.message ?? '',
        r.id ?? '',
        r.status ?? '',
        r.is_read ? 'read' : 'unread',
      ]
        .join(' ')
        .toLowerCase();

      return hay.includes(term);
    });
  }, [sorted, q, statusFilter]);

  const closeModal = () => {
    setOpen(false);
    setActive(null);
    setSavingStatus(false);
    setSavingRead(false);
  };

  const updateStatus = async (id: string, status: SupportStatus) => {
  setSavingStatus(true);

  const { data, error } = await sb
    .from('support_requests')
    .update({ status })
    .eq('id', id)
    .select('status, updated_at')
    .single();

  if (error) {
    console.error('SUPPORT STATUS UPDATE ERROR:', error);
    alert('Failed to update status: ' + error.message);
    setSavingStatus(false);
    return;
  }

  const updated_at = (data as any)?.updated_at ?? null;
  const newStatus = ((data as any)?.status ?? status) as SupportStatus;

  setRows((prev) =>
    prev.map((r) => (r.id === id ? { ...r, status: newStatus, updated_at } : r))
  );
  setActive((prev) => (prev && prev.id === id ? { ...prev, status: newStatus, updated_at } : prev));

  setSavingStatus(false);
};


  const toggleRead = async (id: string, next: boolean) => {
    setSavingRead(true);

    const { data, error } = await sb
      .from('support_requests')
      .update({ is_read: next })
      .eq('id', id)
      .select('updated_at')
      .single();

    if (error) {
      console.error('SUPPORT READ UPDATE ERROR:', error);
      alert('Failed to update read/unread: ' + error.message);
      setSavingRead(false);
      return;
    }

    const updated_at = (data as any)?.updated_at ?? null;

    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, is_read: next, updated_at } : r)));
    setActive((prev) =>
      prev && prev.id === id ? { ...prev, is_read: next, updated_at } : prev
    );
    setSavingRead(false);
  };

  return (
    <div className="space-y-3">
      {/* Header / controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Support</h2>
          <p className="text-sm text-slate-600">View customer support requests and messages.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search type, topic, phone, message…"
            className="w-full sm:w-80 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-slate-200"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full sm:w-44 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-slate-200"
          >
            <option value="all">All statuses</option>
            <option value="unresolved">Unresolved</option>
            <option value="contacted">Contacted</option>
            <option value="resolved">Resolved</option>
          </select>

          <button
            onClick={fetchSupport}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-sm font-medium"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="py-3 px-3 text-left font-medium">Status</th>
              <th className="py-3 px-3 text-left font-medium">Read</th>
              <th className="py-3 px-3 text-left font-medium">Type</th>
              <th className="py-3 px-3 text-left font-medium">Topic</th>
              <th className="py-3 px-3 text-left font-medium">Phone</th>
              <th className="py-3 px-3 text-left font-medium">Submitted</th>
              <th className="py-3 px-3 text-left font-medium">Last updated</th>
              <th className="py-3 px-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="py-4 px-3 text-slate-500" colSpan={8}>
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="py-4 px-3 text-slate-500" colSpan={8}>
                  No support requests found.
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const s = (r.status ?? 'unresolved') as SupportStatus;
                return (
                  <tr key={r.id} className="border-t border-slate-200">
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusClasses(
                          s
                        )}`}
                      >
                        {statusLabel(s)}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <button
                        onClick={() => toggleRead(r.id, !r.is_read)}
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold hover:opacity-90 ${readClasses(
                          r.is_read
                        )}`}
                        title="Toggle read/unread"
                      >
                        {readLabel(r.is_read)}
                      </button>
                    </td>

                    <td className="py-3 px-3">
                      {r.type ? (
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-700">
                          {r.type}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="py-3 px-3">{r.topic ?? <span className="text-slate-400">—</span>}</td>

                    <td className="py-3 px-3">{r.phone ?? <span className="text-slate-400">—</span>}</td>

                    <td className="py-3 px-3">{fmtSydney(r.created_at)}</td>

                    <td className="py-3 px-3">{fmtSydney(r.updated_at)}</td>

                    <td className="py-3 px-3">
                      <button
                        onClick={() => {
                          setActive(r);
                          setOpen(true);
                        }}
                        className="px-3 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:opacity-95"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {loading ? (
          <div className="text-sm text-slate-500">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-slate-500">No support requests found.</div>
        ) : (
          filtered.map((r) => {
            const s = (r.status ?? 'unresolved') as SupportStatus;

            return (
              <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusClasses(
                          s
                        )}`}
                      >
                        {statusLabel(s)}
                      </span>

                      <button
                        onClick={() => toggleRead(r.id, !r.is_read)}
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold hover:opacity-90 ${readClasses(
                          r.is_read
                        )}`}
                      >
                        {readLabel(r.is_read)}
                      </button>

                      {r.type ? (
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-700">
                          {r.type}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">No type</span>
                      )}

                      <span className="text-xs text-slate-500">{fmtSydney(r.created_at)}</span>
                    </div>

                    <div className="mt-1 font-semibold truncate">{r.topic ?? '—'}</div>

                    <div className="mt-1 text-sm text-slate-600">Phone: {r.phone ?? '—'}</div>

                    <div className="mt-1 text-xs text-slate-500">
                      Last updated: {fmtSydney(r.updated_at)}
                    </div>

                    {r.message && (
                      <div className="mt-2 text-sm text-slate-700 line-clamp-3">{r.message}</div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setActive(r);
                      setOpen(true);
                    }}
                    className="shrink-0 px-3 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold"
                  >
                    View
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* View modal */}
      {open && active && (
        <div
          className="fixed inset-0 z-50 bg-black/30 p-3 flex items-center justify-center"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-200">
              <div className="min-w-0">
                <div className="text-sm text-slate-500">Support request</div>
                <div className="text-lg font-semibold truncate">{active.topic ?? '—'}</div>
              </div>

              <button
                onClick={closeModal}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium"
              >
                Close
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[75vh] overflow-y-auto p-4 space-y-4">
              {/* Read toggle */}
              <div className="rounded-xl border border-slate-200 p-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">Read state</div>
                    <div className="text-xs text-slate-500">Mark it read/unread for your team.</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleRead(active.id, !active.is_read)}
                      disabled={savingRead}
                      className={`px-3 py-2 rounded-xl border text-sm font-semibold disabled:opacity-60 ${readClasses(
                        active.is_read
                      )}`}
                    >
                      {active.is_read ? 'Mark unread' : 'Mark read'}
                    </button>

                    <span className="text-xs text-slate-500">{savingRead ? 'Saving…' : ''}</span>
                  </div>
                </div>
              </div>

              {/* Set status */}
              <div className="rounded-xl border border-slate-200 p-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">Set status</div>
                    <div className="text-xs text-slate-500">
                      Track whether you’ve contacted them or resolved the issue.
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={(active.status ?? 'unresolved') as SupportStatus}
                      onChange={(e) => updateStatus(active.id, e.target.value as SupportStatus)}
                      disabled={savingStatus}
                      className="w-full sm:w-48 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
                    >
                      <option value="unresolved">Unresolved</option>
                      <option value="contacted">Contacted</option>
                      <option value="resolved">Resolved</option>
                    </select>

                    <span className="text-xs text-slate-500">{savingStatus ? 'Saving…' : ''}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 p-3">
                  <div className="text-xs font-medium text-slate-500">Type</div>
                  <div className="mt-1 text-sm text-slate-900">{active.type ?? '—'}</div>
                </div>

                <div className="rounded-xl border border-slate-200 p-3">
                  <div className="text-xs font-medium text-slate-500">Phone</div>
                  <div className="mt-1 text-sm text-slate-900">{active.phone ?? '—'}</div>
                </div>

                <div className="rounded-xl border border-slate-200 p-3">
                  <div className="text-xs font-medium text-slate-500">Submitted</div>
                  <div className="mt-1 text-sm text-slate-900">{fmtSydney(active.created_at)}</div>
                </div>

                <div className="rounded-xl border border-slate-200 p-3">
                  <div className="text-xs font-medium text-slate-500">Last updated</div>
                  <div className="mt-1 text-sm text-slate-900">{fmtSydney(active.updated_at)}</div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <div className="text-xs font-medium text-slate-500">Message</div>
                <div className="mt-2 whitespace-pre-wrap text-sm text-slate-900">
                  {active.message ?? '—'}
                </div>
              </div>

              <div className="text-xs text-slate-400">ID: {active.id}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
