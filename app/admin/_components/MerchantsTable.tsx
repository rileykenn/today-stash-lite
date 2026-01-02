// app/admin/_components/MerchantsTable.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { sb } from '@/lib/supabaseBrowser';
import MerchantCreate from './MerchantCreate';
import MerchantDeals from './MerchantDeals';

type MerchantRow = {
  id: string;
  name: string;
  created_at: string | null;
  street_address: string | null;
  merchant_pin: string | null;
  town_id: string | null;
  towns?: { name: string } | null;
};

export default function MerchantsTable() {
  const [rows, setRows] = useState<MerchantRow[]>([]);
  const [q, setQ] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const [dealsOpen, setDealsOpen] = useState(false);
  const [activeMerchant, setActiveMerchant] = useState<{
    id: string;
    name: string;
    street_address: string | null;
    town_name: string | null;
  } | null>(null);

  const fetchMerchants = async () => {
    const { data, error } = await sb
      .from('merchants')
      .select('id,name,created_at,street_address,merchant_pin,town_id,towns(name)')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('MERCHANTS FETCH ERROR:', error);
      setRows([]);
      return;
    }

    setRows((data as any[]) as MerchantRow[]);
  };

  useEffect(() => {
    fetchMerchants();
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const qq = q.toLowerCase();
    return rows.filter((m) => {
      const hay = [
        m.name ?? '',
        m.street_address ?? '',
        m.merchant_pin ?? '',
        m.towns?.name ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(qq);
    });
  }, [rows, q]);

  return (
    <div className="space-y-3">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Merchants</h2>
          <p className="text-sm text-slate-600">Businesses on Today’s Stash.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, town, pin, address…"
            className="w-full sm:w-72 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-slate-200"
          />
          <button
            onClick={() => setCreateOpen(true)}
            className="px-3 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:opacity-95"
          >
            Create merchant
          </button>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-[980px] w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="py-3 px-3 text-left font-medium">Business</th>
              <th className="py-3 px-3 text-left font-medium">Town</th>
              <th className="py-3 px-3 text-left font-medium">Street address</th>
              <th className="py-3 px-3 text-left font-medium">Merchant PIN</th>
              <th className="py-3 px-3 text-left font-medium">Created</th>
              <th className="py-3 px-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => {
              const createdLabel = m.created_at
                ? new Date(m.created_at).toLocaleDateString('en-AU', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : '—';

              return (
                <tr key={m.id} className="border-t border-slate-200">
                  <td className="py-3 px-3 font-medium">{m.name}</td>
                  <td className="py-3 px-3">{m.towns?.name ?? '—'}</td>
                  <td className="py-3 px-3">{m.street_address ?? '—'}</td>
                  <td className="py-3 px-3">
                    {m.merchant_pin ? (
                      <span className="font-mono text-[12px] px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                        {m.merchant_pin}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3 px-3">{createdLabel}</td>
                  <td className="py-3 px-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          setActiveMerchant({
                            id: m.id,
                            name: m.name,
                            street_address: m.street_address ?? null,
                            town_name: m.towns?.name ?? null,
                          });
                          setDealsOpen(true);
                        }}
                        className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                      >
                        View merchant deals
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td className="py-4 px-3 text-slate-500">No merchants found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {filtered.map((m) => {
          const createdLabel = m.created_at
            ? new Date(m.created_at).toLocaleDateString('en-AU', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            : '—';

          return (
            <div key={m.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="font-semibold">{m.name}</div>
              <div className="text-sm text-slate-600">Town: {m.towns?.name ?? '—'}</div>
              <div className="text-sm text-slate-600">
                Address: {m.street_address ?? '—'}
              </div>
              <div className="text-sm text-slate-600">Created: {createdLabel}</div>
              <div className="mt-2 flex items-center gap-2">
                {m.merchant_pin ? (
                  <span className="font-mono text-[12px] px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                    PIN {m.merchant_pin}
                  </span>
                ) : (
                  <span className="text-sm text-slate-500">PIN —</span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setActiveMerchant({
                      id: m.id,
                      name: m.name,
                      street_address: m.street_address ?? null,
                      town_name: m.towns?.name ?? null,
                    });
                    setDealsOpen(true);
                  }}
                  className="px-2 py-1 rounded-lg border border-slate-200 bg-white"
                >
                  View merchant deals
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-slate-500">
            No merchants found.
          </div>
        )}
      </div>

      {/* Create */}
      <MerchantCreate
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => fetchMerchants()}
      />

      {/* Deals */}
      <MerchantDeals
        open={dealsOpen}
        onClose={() => {
          setDealsOpen(false);
          setActiveMerchant(null);
        }}
        merchant={activeMerchant}
      />
    </div>
  );
}
