'use client';

import { useEffect, useMemo, useState } from 'react';
import { sb } from '@/lib/supabaseBrowser';
import DealForm from './DealForm';

type DealRow = {
  id: string;
  title: string | null;
  merchant_id: string;
  merchants: { name: string } | null;
  exp_date: string | null;
  is_active: boolean;
  created_at?: string | null;
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

function getDealStatus(deal: DealRow) {
  if (!deal.exp_date) {
    return { label: 'No expiry', className: 'text-slate-600 border-slate-200 bg-slate-50' };
  }

  const now = Date.now();
  const exp = new Date(deal.exp_date).getTime();

  if (Number.isNaN(exp)) {
    return { label: 'Unknown', className: 'text-slate-600 border-slate-200 bg-slate-50' };
  }

  if (!deal.is_active) {
    return { label: 'Inactive', className: 'text-slate-700 border-slate-200 bg-slate-50' };
  }

  if (exp >= now) {
    return { label: 'Active', className: 'text-emerald-700 border-emerald-200 bg-emerald-50' };
  }

  return { label: 'Expired', className: 'text-red-700 border-red-200 bg-red-50' };
}

type MerchantOption = { id: string; name: string };

export default function DealsTable() {
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [qDeals, setQDeals] = useState('');

  // ✅ NEW: merchant filter
  const [merchantFilter, setMerchantFilter] = useState<string>('all'); // 'all' or merchant_id

  // modal state
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchDeals = async () => {
    const { data, error } = await sb
      .from('offers')
      .select('id,title,merchant_id,exp_date,is_active,created_at,merchants(name)')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error(error);
      setDeals([]);
      return;
    }

    setDeals((data as any as DealRow[]) ?? []);
  };

  useEffect(() => {
    fetchDeals();
  }, []);

  // ✅ NEW: derive merchant dropdown options from deals
  const merchantOptions = useMemo<MerchantOption[]>(() => {
    const map = new Map<string, string>();

    for (const d of deals) {
      const id = d.merchant_id;
      const name = d.merchants?.name ?? 'Unknown merchant';
      if (!map.has(id)) map.set(id, name);
    }

    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [deals]);

  // ✅ keep filter valid if deals changed (e.g. deleted merchant deals)
  useEffect(() => {
    if (merchantFilter === 'all') return;
    const stillExists = deals.some((d) => d.merchant_id === merchantFilter);
    if (!stillExists) setMerchantFilter('all');
  }, [deals, merchantFilter]);

  const filteredDeals = useMemo(() => {
    const term = qDeals.trim().toLowerCase();

    return deals.filter((d) => {
      // merchant filter
      if (merchantFilter !== 'all' && d.merchant_id !== merchantFilter) return false;

      // search filter
      if (!term) return true;

      const hay = [d.title ?? '', d.merchants?.name ?? ''].join(' ').toLowerCase();
      return hay.includes(term);
    });
  }, [deals, qDeals, merchantFilter]);

  const deleteDeal = async (deal_id: string) => {
    if (!confirm('Delete this deal? This cannot be undone.')) return;
    const { error } = await sb.from('offers').delete().eq('id', deal_id);
    if (error) {
      alert('Failed to delete deal: ' + error.message);
      return;
    }
    await fetchDeals();
  };

  return (
    <div className="space-y-3">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Deals</h2>
          <p className="text-sm text-slate-600">Manage offers, expiry status, and editing.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          {/* ✅ NEW: Merchant filter */}
          <select
            value={merchantFilter}
            onChange={(e) => setMerchantFilter(e.target.value)}
            className="w-full sm:w-60 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-slate-200"
            aria-label="Filter deals by merchant"
            title="Filter by merchant"
          >
            <option value="all">All merchants</option>
            {merchantOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          <input
            value={qDeals}
            onChange={(e) => setQDeals(e.target.value)}
            placeholder="Search deals or merchants…"
            className="w-full sm:w-72 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-slate-200"
          />

          <button
            onClick={() => {
              setEditingId(null);
              setOpen(true);
            }}
            className="px-3 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:opacity-95"
          >
            Create deal
          </button>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="py-3 px-3 text-left font-medium">Deal</th>
              <th className="py-3 px-3 text-left font-medium">Merchant</th>
              <th className="py-3 px-3 text-left font-medium">Status</th>
              <th className="py-3 px-3 text-left font-medium">Valid to</th>
              <th className="py-3 px-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDeals.map((d) => {
              const status = getDealStatus(d);

              return (
                <tr key={d.id} className="border-t border-slate-200">
                  <td className="py-3 px-3">
                    {d.title ?? <span className="text-slate-400">Untitled</span>}
                  </td>
                  <td className="py-3 px-3">
                    {d.merchants?.name ?? <span className="text-slate-400">—</span>}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </td>
                  <td className="py-3 px-3">{fmtDateAU(d.exp_date)}</td>
                  <td className="py-3 px-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingId(d.id);
                          setOpen(true);
                        }}
                        className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteDeal(d.id)}
                        className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredDeals.length === 0 && (
              <tr>
                <td className="py-4 px-3 text-slate-500" colSpan={5}>
                  No deals found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards (NO horizontal scroll) */}
      <div className="md:hidden space-y-2">
        {filteredDeals.map((d) => {
          const status = getDealStatus(d);
          return (
            <div key={d.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold leading-snug">
                    {d.title ?? <span className="text-slate-400">Untitled</span>}
                  </div>
                  <div className="mt-1 text-sm text-slate-600 truncate">
                    {d.merchants?.name ?? '—'}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${status.className}`}
                    >
                      {status.label}
                    </span>
                    <span className="text-xs text-slate-500">
                      Valid to: {fmtDateAU(d.exp_date)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setEditingId(d.id);
                    setOpen(true);
                  }}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteDeal(d.id)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}

        {filteredDeals.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-slate-500">
            No deals found.
          </div>
        )}
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/30 p-3 flex items-center justify-center">
          <div className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <div className="font-semibold">{editingId ? 'Edit deal' : 'Create deal'}</div>
              <button
                onClick={() => {
                  setOpen(false);
                  setEditingId(null);
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm"
              >
                Close
              </button>
            </div>

            <div className="p-4 max-h-[80vh] overflow-auto">
              <DealForm
                offerId={editingId ?? undefined}
                onSaved={async () => {
                  setOpen(false);
                  setEditingId(null);
                  await fetchDeals();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
