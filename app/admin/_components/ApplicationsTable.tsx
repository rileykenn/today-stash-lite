'use client';

import { useEffect, useMemo, useState } from 'react';
import { sb } from '@/lib/supabaseBrowser';
import ApplicationViewModal from './ApplicationViewModal';

type ApplicationRow = {
  id: string;
  created_at: string | null;
  business_name: string | null;
  contact_name: string | null;
  address: string | null;
  category: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
};

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

export default function ApplicationsTable() {
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const fetchApps = async () => {
    const { data, error } = await sb
      .from('applications')
      .select(
        'id,created_at,business_name,contact_name,address,category,position,email,phone',
      )
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error(error);
      setRows([]);
      return;
    }

    setRows((data as any as ApplicationRow[]) ?? []);
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      [
        r.business_name ?? '',
        r.contact_name ?? '',
        r.address ?? '',
        r.category ?? '',
        r.email ?? '',
        r.phone ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [rows, q]);

  return (
    <div className="space-y-3">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Applications</h2>
          <p className="text-sm text-slate-600">
            Review business applications and open the full submission.
          </p>
        </div>

        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, business, address…"
            className="w-full sm:w-72 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-slate-200"
          />
          <button
            onClick={fetchApps}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-sm font-medium"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="py-3 px-3 text-left font-medium">Contact</th>
              <th className="py-3 px-3 text-left font-medium">Business</th>
              <th className="py-3 px-3 text-left font-medium">Address</th>
              <th className="py-3 px-3 text-left font-medium">Submitted</th>
              <th className="py-3 px-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-slate-200">
                <td className="py-3 px-3">
                  <div className="font-medium">{r.contact_name ?? '—'}</div>
                  <div className="text-xs text-slate-500">{r.email ?? '—'}</div>
                </td>
                <td className="py-3 px-3">
                  <div className="font-medium">{r.business_name ?? '—'}</div>
                  <div className="text-xs text-slate-500">{r.category ?? '—'}</div>
                </td>
                <td className="py-3 px-3">
                  <div className="text-slate-700">{r.address ?? '—'}</div>
                </td>
                <td className="py-3 px-3 text-slate-700">{fmtDateAU(r.created_at)}</td>
                <td className="py-3 px-3">
                  <button
                    onClick={() => setOpenId(r.id)}
                    className="px-3 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:opacity-95"
                  >
                    View application
                  </button>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td className="py-4 px-3 text-slate-500">No applications found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {filtered.map((r) => (
          <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold leading-snug">
                  {r.contact_name ?? '—'}
                </div>
                <div className="text-sm text-slate-600 truncate">
                  {r.business_name ?? '—'}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {r.address ?? '—'}
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Submitted: {fmtDateAU(r.created_at)}
                </div>
              </div>
            </div>

            <div className="mt-3">
              <button
                onClick={() => setOpenId(r.id)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold"
              >
                View application
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-slate-500">
            No applications found.
          </div>
        )}
      </div>

      {/* Modal */}
      <ApplicationViewModal
        open={!!openId}
        applicationId={openId}
        onClose={() => setOpenId(null)}
        onRefresh={fetchApps}
      />
    </div>
  );
}
