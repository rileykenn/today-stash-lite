'use client';

import { useEffect, useMemo, useState } from 'react';
import { sb } from '@/lib/supabaseBrowser';
import TownForm from './TownForm';

type TownRow = {
  id: string;
  name: string | null;
  slug: string | null;
  is_free: boolean | null;
  image_url?: string | null;
  created_at?: string | null;
};

export default function TownsTable() {
  const [rows, setRows] = useState<TownRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  // Modal State
  const [open, setOpen] = useState(false);
  const [editingTown, setEditingTown] = useState<TownRow | undefined>(undefined);

  const fetchTowns = async () => {
    setLoading(true);

    const { data, error } = await sb
      .from('towns')
      .select('id,name,slug,is_free,image_url,created_at')
      .order('name', { ascending: true })
      .limit(1000);

    if (error) {
      console.error('TOWNS FETCH ERROR:', error);
      setRows([]);
      setLoading(false);
      return;
    }

    setRows(((data as any[]) ?? []) as TownRow[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchTowns();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;

    return rows.filter((r) => {
      const hay = [r.name ?? ''].join(' ').toLowerCase();
      return hay.includes(term);
    });
  }, [rows, q]);

  const deleteTown = async (t: TownRow) => {
    if (!confirm(`Delete "${t.name ?? 'this town'}"? This cannot be undone.`)) return;

    // Safety check: don't delete if merchants reference it via town_id
    // This assumes specific FK setup, usually good practice to keep.
    const { count, error: cErr } = await sb
      .from('merchants')
      .select('id', { count: 'exact', head: true })
      .eq('town_id', t.id);

    if (!cErr && (count ?? 0) > 0) {
      return alert(`Can't delete — ${count} merchant(s) are linked to this town.`);
    }

    const { error } = await sb.from('towns').delete().eq('id', t.id);
    if (error) return alert('Failed to delete town: ' + error.message);

    await fetchTowns();
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // fallback ignored for brevity
    }
  };

  return (
    <div className="space-y-3">
      {/* Header / controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Towns</h2>
          <p className="text-sm text-slate-600">
            Manage towns and images.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search town…"
            className="w-full sm:w-64 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-slate-200"
          />
          <button
            onClick={() => {
              setEditingTown(undefined);
              setOpen(true);
            }}
            className="px-3 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:opacity-95"
          >
            Create town
          </button>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="py-3 px-3 text-left font-medium">Town</th>
              <th className="py-3 px-3 text-left font-medium">Status</th>
              <th className="py-3 px-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="py-4 px-3 text-slate-500" colSpan={3}>Loading…</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="py-4 px-3 text-slate-500" colSpan={3}>No towns found.</td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id} className="border-t border-slate-200">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-3">
                      {t.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.image_url} alt="" className="w-10 h-10 rounded-lg object-cover bg-slate-100" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        </div>
                      )}
                      <span className="font-medium">{t.name ?? '—'}</span>
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${t.is_free
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-amber-200 bg-amber-50 text-amber-800'
                        }`}
                    >
                      {t.is_free ? 'Free' : 'Paid'}
                    </span>
                  </td>

                  <td className="py-3 px-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingTown(t);
                          setOpen(true);
                        }}
                        className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteTown(t)}
                        className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {loading ? (
          <div className="text-sm text-slate-500">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-slate-500">
            No towns found.
          </div>
        ) : (
          filtered.map((t) => (
            <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-start gap-3">
                {t.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.image_url} alt="" className="w-12 h-12 rounded-lg object-cover bg-slate-100 shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300 shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{t.name ?? '—'}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${t.is_free
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border-amber-200 bg-amber-50 text-amber-800'
                        }`}
                    >
                      {t.is_free ? 'Free' : 'Paid'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setEditingTown(t);
                    setOpen(true);
                  }}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteTown(t)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Main Modal */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/30 p-3 flex items-center justify-center">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <div className="font-semibold">{editingTown ? 'Edit Town' : 'Create Town'}</div>
              <button
                onClick={() => setOpen(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm"
              >
                Close
              </button>
            </div>

            <div className="p-4">
              <TownForm
                town={editingTown}
                onSaved={() => {
                  setOpen(false);
                  fetchTowns();
                }}
                onCancel={() => setOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

