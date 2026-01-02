'use client';

import { useEffect, useMemo, useState } from 'react';
import { sb } from '@/lib/supabaseBrowser';
import CreateTown from './CreateTown';

type TownRow = {
  id: string;
  name: string | null;
  slug: string | null; // exists in DB but we won't render it
  access_code: string | null;
  is_free: boolean | null;
  created_at?: string | null;
};

export default function TownsTable() {
  const [rows, setRows] = useState<TownRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState('');

  // editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingIsFree, setEditingIsFree] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);

  const fetchTowns = async () => {
    setLoading(true);

    const { data, error } = await sb
      .from('towns')
      .select('id,name,slug,access_code,is_free,created_at')
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
      const hay = [r.name ?? '', r.access_code ?? ''].join(' ').toLowerCase();
      return hay.includes(term);
    });
  }, [rows, q]);

  const startEdit = (t: TownRow) => {
    setEditingId(t.id);
    setEditingName(t.name ?? '');
    setEditingIsFree(Boolean(t.is_free));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
    setEditingIsFree(false);
    setSaving(false);
  };

  const saveEdit = async () => {
    if (!editingId) return;

    const name = editingName.trim();
    if (!name) return alert('Town name cannot be empty.');

    setSaving(true);

    const { data, error } = await sb
      .from('towns')
      .update({ name, is_free: editingIsFree })
      .eq('id', editingId)
      .select('id,name,access_code,is_free')
      .single();

    if (error) {
      setSaving(false);
      return alert('Failed to update town: ' + error.message);
    }

    const updated = data as any;

    setRows((prev) =>
      prev.map((r) =>
        r.id === editingId
          ? { ...r, name: updated.name, is_free: updated.is_free, access_code: updated.access_code }
          : r,
      ),
    );

    setSaving(false);
    cancelEdit();
  };

  const deleteTown = async (t: TownRow) => {
    if (!confirm(`Delete "${t.name ?? 'this town'}"? This cannot be undone.`)) return;

    // Safety check: don't delete if merchants reference it (if your merchants table uses town_id)
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
      // fallback
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header / controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Towns</h2>
          <p className="text-sm text-slate-600">
            Manage towns (name, access code, and free access).
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search town or code…"
            className="w-full sm:w-64 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-slate-200"
          />
          <button
            onClick={fetchTowns}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-sm font-medium"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* ✅ Create town as separate component */}
      <CreateTown onCreated={fetchTowns} />

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="py-3 px-3 text-left font-medium">Town</th>
              <th className="py-3 px-3 text-left font-medium">Access code</th>
              <th className="py-3 px-3 text-left font-medium">Free?</th>
              <th className="py-3 px-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="py-4 px-3 text-slate-500" colSpan={4}>
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="py-4 px-3 text-slate-500" colSpan={4}>
                  No towns found.
                </td>
              </tr>
            ) : (
              filtered.map((t) => {
                const isEditing = editingId === t.id;

                return (
                  <tr key={t.id} className="border-t border-slate-200">
                    <td className="py-3 px-3">
                      {isEditing ? (
                        <input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="w-full max-w-md px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-slate-200"
                        />
                      ) : (
                        <span className="font-medium">{t.name ?? '—'}</span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{t.access_code ?? '—'}</span>
                        {t.access_code && (
                          <button
                            onClick={() => copy(t.access_code!)}
                            className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs"
                            title="Copy code"
                          >
                            Copy
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      {isEditing ? (
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={editingIsFree}
                            onChange={(e) => setEditingIsFree(e.target.checked)}
                            className="h-4 w-4"
                          />
                          Free
                        </label>
                      ) : (
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${
                            t.is_free
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                              : 'border-slate-200 bg-slate-50 text-slate-700'
                          }`}
                        >
                          {t.is_free ? 'Yes' : 'No'}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <button
                            onClick={saveEdit}
                            disabled={saving}
                            className="px-2 py-1 rounded-lg bg-slate-900 text-white hover:opacity-95 disabled:opacity-60"
                          >
                            {saving ? 'Saving…' : 'Save'}
                          </button>
                          <button
                            onClick={cancelEdit}
                            disabled={saving}
                            className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-60"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(t)}
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
                      )}
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
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-slate-500">
            No towns found.
          </div>
        ) : (
          filtered.map((t) => (
            <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{t.name ?? '—'}</div>
                  <div className="mt-1 text-sm text-slate-600">
                    Code: <span className="font-mono">{t.access_code ?? '—'}</span>
                  </div>
                  <div className="mt-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${
                        t.is_free
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 bg-slate-50 text-slate-700'
                      }`}
                    >
                      {t.is_free ? 'Free town' : 'Paid town'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => startEdit(t)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium"
                >
                  Edit
                </button>
                {t.access_code && (
                  <button
                    onClick={() => copy(t.access_code!)}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium"
                  >
                    Copy code
                  </button>
                )}
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

      {/* Simple mobile edit modal (optional) */}
      {editingId && (
        <div className="fixed inset-0 z-50 bg-black/30 p-3 flex items-center justify-center md:hidden">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <div className="font-semibold">Edit town</div>
              <button
                onClick={cancelEdit}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm"
              >
                Close
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <div className="text-xs font-medium text-slate-500">Town name</div>
                <input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editingIsFree}
                  onChange={(e) => setEditingIsFree(e.target.checked)}
                  className="h-4 w-4"
                />
                Free town
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={cancelEdit}
                  disabled={saving}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="px-3 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
