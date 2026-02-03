'use client';

import { useEffect, useMemo, useState } from 'react';
import { sb } from '@/lib/supabaseBrowser';

type ScheduleItem = {
  day: string;
  start: string;
  end: string;
  isOpen: boolean;
};

type DealRow = {
  id: string;
  title: string | null;
  merchant_id: string;
  merchants: { name: string } | null;
  exp_date: string | null;
  valid_until: string | null;
  recurring_schedule: ScheduleItem[] | null;
  is_active: boolean;
  created_at?: string | null;
};

function fmtTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

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

function getValidToDisplay(deal: DealRow) {
  // 1. Scheduled Logic
  if (deal.recurring_schedule && Array.isArray(deal.recurring_schedule) && deal.recurring_schedule.length > 0) {
    const days = deal.recurring_schedule.map((s) => s.day.slice(0, 3)).join(', ');
    // capitalize first letter of each day short code
    const formattedDays = days.replace(/\b\w/g, (c) => c.toUpperCase());
    return (
      <span className="text-slate-700">
        <span className="font-semibold text-purple-700">Scheduled:</span> {formattedDays}
      </span>
    );
  }

  // 2. Today Only Logic (using valid_until)
  if (deal.valid_until) {
    const now = Date.now();
    const until = new Date(deal.valid_until).getTime();
    const timeStr = fmtTime(deal.valid_until);

    if (until < now) {
      return (
        <span className="text-slate-500">
          <span className="font-medium text-slate-700">Today only</span> (Expired {timeStr})
        </span>
      );
    } else {
      return (
        <span className="text-slate-700">
          <span className="font-medium text-emerald-700">Today only</span> (Valid until {timeStr})
        </span>
      );
    }
  }

  // 3. Fallback (Legacy exp_date)
  if (deal.exp_date) {
    return <span className="text-slate-500">{fmtDateAU(deal.exp_date)}</span>;
  }

  return <span className="text-slate-400">—</span>;
}

function getDealStatus(deal: DealRow) {
  const now = Date.now();

  // If recurring, it's generally "Active" unless manually disabled
  if (deal.recurring_schedule && deal.recurring_schedule.length > 0) {
    return deal.is_active
      ? { label: 'Active (Scheduled)', className: 'text-purple-700 border-purple-200 bg-purple-50' }
      : { label: 'Inactive', className: 'text-slate-700 border-slate-200 bg-slate-50' };
  }

  // One-off checks
  if (!deal.valid_until && !deal.exp_date) {
    return deal.is_active
      ? { label: 'Active', className: 'text-emerald-700 border-emerald-200 bg-emerald-50' }
      : { label: 'No expiry', className: 'text-slate-600 border-slate-200 bg-slate-50' };
  }

  const expiryIso = deal.valid_until || deal.exp_date;
  const exp = expiryIso ? new Date(expiryIso).getTime() : NaN;

  if (!Number.isNaN(exp) && exp < now) {
    return { label: 'Expired', className: 'text-red-700 border-red-200 bg-red-50' };
  }

  if (!deal.is_active) {
    return { label: 'Inactive', className: 'text-slate-700 border-slate-200 bg-slate-50' };
  }

  return { label: 'Active', className: 'text-emerald-700 border-emerald-200 bg-emerald-50' };
}

type MerchantOption = { id: string; name: string };

export default function DealsTable() {
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [qDeals, setQDeals] = useState('');

  // ✅ NEW: merchant filter
  const [merchantFilter, setMerchantFilter] = useState<string>('all'); // 'all' or merchant_id

  const fetchDeals = async () => {
    const { data, error } = await sb
      .from('offers')
      .select('id,title,merchant_id,exp_date,valid_until,recurring_schedule,is_active,created_at,merchants(name)')
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

  return (
    <div className="space-y-3">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Deals</h2>
          <p className="text-sm text-slate-600">View current offers (Read Only).</p>
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

          {/* Create button removed */}
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
            </tr>
          </thead>
          <tbody>
            {filteredDeals.map((d) => {
              const status = getDealStatus(d);
              const validToDisplay = getValidToDisplay(d);

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
                  <td className="py-3 px-3">{validToDisplay}</td>
                </tr>
              );
            })}

            {filteredDeals.length === 0 && (
              <tr>
                <td className="py-4 px-3 text-slate-500" colSpan={4}>
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
          const validToDisplay = getValidToDisplay(d);

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
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      Valid to: {validToDisplay}
                    </span>
                  </div>
                </div>
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
    </div>
  );
}
