'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { sb } from '@/lib/supabaseBrowser';

type ApplicationRow = {
  id: string;
  created_at: string | null;
  business_name: string | null;
  contact_name: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  category: string | null;
  is_read: boolean | null;
  town_id: string | null;
};

type AppWithTown = ApplicationRow & {
  town_name: string;
};

type ReviewStatus = 'pending' | 'approved' | 'denied';

export default function ApplicationsPage() {
  const [apps, setApps] = useState<AppWithTown[]>([]);
  const [reviewStatus, setReviewStatus] = useState<Record<string, ReviewStatus>>(
    {}
  );
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // ---------- data load ----------
  const fetchData = async () => {
    setLoading((prev) => prev || true);
    setRefreshing(true);
    setErrorMessage(null);

    try {
      // towns
      const { data: townRows, error: townErr } = await sb
        .from('towns')
        .select('id, name');

      if (townErr) {
        console.error('Error loading towns:', townErr);
        setErrorMessage('Failed to load towns from Supabase.');
        setApps([]);
        setRefreshing(false);
        setLoading(false);
        return;
      }

      const townById = new Map<string, string>();
      (townRows ?? []).forEach((t: any) => {
        if (t.id) townById.set(t.id, t.name || 'Unknown town');
      });

      // applications
      const { data: appRows, error: appErr } = await sb
        .from('applications')
        .select(
          'id, created_at, business_name, contact_name, position, email, phone, address, category, is_read, town_id'
        )
        .order('created_at', { ascending: false });

      if (appErr) {
        console.error('Error loading applications:', appErr);
        setErrorMessage('Failed to load applications from Supabase.');
        setApps([]);
        setRefreshing(false);
        setLoading(false);
        return;
      }

      const mapped: AppWithTown[] = (appRows ?? []).map((row: any) => ({
        ...row,
        town_name: row.town_id
          ? townById.get(row.town_id) ?? 'Unknown'
          : '—',
      }));

      setApps(mapped);

      // default all review statuses to pending (local-only for now)
      const initialReview: Record<string, ReviewStatus> = {};
      mapped.forEach((a) => {
        initialReview[a.id] = initialReview[a.id] ?? 'pending';
      });
      setReviewStatus(initialReview);
    } catch (err) {
      console.error('Unexpected error loading applications:', err);
      setErrorMessage('Unexpected error talking to Supabase.');
      setApps([]);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ---------- helpers ----------

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-AU', {
      year: '2-digit',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (app: AppWithTown) => {
    if (app.is_read) {
      return (
        <span className="inline-flex items-center rounded-full border border-white/25 px-2 py-0.5 text-xs text-white/70">
          Read
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-400/60 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
        New
      </span>
    );
  };

  const getReviewBadge = (status: ReviewStatus) => {
    if (status === 'approved') {
      return (
        <span className="inline-flex items-center rounded-full border border-emerald-400/60 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
          Approved
        </span>
      );
    }
    if (status === 'denied') {
      return (
        <span className="inline-flex items-center rounded-full border border-red-400/60 bg-red-500/10 px-2 py-0.5 text-xs text-red-300">
          Denied
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full border border-white/20 px-2 py-0.5 text-xs text-white/60">
        Pending
      </span>
    );
  };

  // ---------- actions ----------

  const updateRead = async (appId: string, next: boolean) => {
    // optimistic UI
    setApps((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, is_read: next } : a))
    );

    const { error } = await sb
      .from('applications')
      .update({ is_read: next })
      .eq('id', appId);

    if (error) {
      console.error('Failed to update is_read:', error);
      setApps((prev) =>
        prev.map((a) =>
          a.id === appId ? { ...a, is_read: !next } : a
        )
      );
      alert('Could not update read status. Please try again.');
    }
  };

  const handleToggleRead = async (app: AppWithTown) => {
    const next = !(app.is_read ?? false);
    await updateRead(app.id, next);

    // NEW: if we’re marking as unread, clear any Approved/Denied badge
    if (!next) {
      setReviewStatus((prev) => ({
        ...prev,
        [app.id]: 'pending',
      }));
    }

    setOpenMenuId(null);
  };

  const handleReview = async (
    app: AppWithTown,
    status: ReviewStatus
  ) => {
    // local review state
    setReviewStatus((prev) => ({ ...prev, [app.id]: status }));

    // approving / denying should count as "read"
    if (!app.is_read) {
      await updateRead(app.id, true);
    }
    setOpenMenuId(null);
  };

  // ---------- filtering ----------

  const filteredApps = useMemo(() => {
    if (!search.trim()) return apps;
    const q = search.toLowerCase();
    return apps.filter((a) =>
      [
        a.business_name ?? '',
        a.contact_name ?? '',
        a.email ?? '',
        a.category ?? '',
        a.address ?? '',
        a.town_name ?? '',
        a.phone ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [apps, search]);

  // ---------- render ----------

  return (
    <div className="min-h-screen bg-[#05090D] text-white px-6 py-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Applications</h1>
          <Link
            href="/admin"
            className="text-sm underline text-white/70 hover:text-white"
          >
            Back to admin
          </Link>
        </div>

        <section className="flex-1 rounded-2xl bg-[#0B1117] border border-white/10 p-4 flex flex-col">
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-xs text-white/60">
              Review new business applications and mark them as read, approved,
              or denied.
            </p>
            <div className="flex gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by business, contact, email, category..."
                className="w-72 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm outline-none"
              />
              <button
                onClick={fetchData}
                disabled={refreshing}
                className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm disabled:opacity-50"
              >
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-3 rounded-lg border border-red-500/60 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {errorMessage}
            </div>
          )}

          {loading ? (
            <div className="py-6 text-sm text-white/60">Loading…</div>
          ) : filteredApps.length === 0 ? (
            <div className="py-6 text-sm text-white/60">
              No applications found.
            </div>
          ) : (
            // table wrapper – vertical scroll only
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="text-left text-white/60 sticky top-0 bg-[#0B1117]">
                  <tr>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Review</th>
                    <th className="py-2 pr-4">Business</th>
                    <th className="py-2 pr-4">Category</th>
                    <th className="py-2 pr-4">Contact</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Phone</th>
                    <th className="py-2 pr-4">Address</th>
                    <th className="py-2 pr-4">Town</th>
                    <th className="py-2 pr-4">Submitted</th>
                    <th className="py-2 pl-4 pr-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApps.map((app) => {
                    const review = reviewStatus[app.id] ?? 'pending';
                    const isMenuOpen = openMenuId === app.id;

                    return (
                      <tr
                        key={app.id}
                        className="border-t border-white/10 align-middle"
                      >
                        <td className="py-2 pr-4">{getStatusBadge(app)}</td>
                        <td className="py-2 pr-4">
                          {getReviewBadge(review)}
                        </td>
                        <td className="py-2 pr-4">
                          {app.business_name ?? '—'}
                        </td>
                        <td className="py-2 pr-4">
                          {app.category ?? <span className="opacity-60">—</span>}
                        </td>
                        <td className="py-2 pr-4">
                          {app.contact_name ?? '—'}
                          {app.position && (
                            <span className="ml-1 text-xs text-white/50">
                              ({app.position})
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          {app.email ?? <span className="opacity-60">—</span>}
                        </td>
                        <td className="py-2 pr-4">
                          {app.phone ?? <span className="opacity-60">—</span>}
                        </td>
                        <td className="py-2 pr-4">
                          {app.address ?? (
                            <span className="opacity-60">—</span>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          {app.town_name ?? (
                            <span className="opacity-60">—</span>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          {formatDate(app.created_at)}
                        </td>
                        <td className="py-2 pl-4 pr-2 text-right">
                          <div className="relative inline-flex justify-end w-full">
                            <button
                              type="button"
                              onClick={() =>
                                setOpenMenuId(
                                  isMenuOpen ? null : app.id
                                )
                              }
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg_white/5 bg-white/5 hover:bg-white/10"
                            >
                              <span className="sr-only">Actions</span>
                              <span className="text-lg leading-none">⋯</span>
                            </button>

                            {isMenuOpen && (
                              <div className="absolute right-0 top-9 z-20 w-40 rounded-lg border border-white/10 bg-[#05090D] shadow-lg">
                                <button
                                  className="w-full px-3 py-2 text-left text-xs hover:bg-white/10"
                                  onClick={() => handleToggleRead(app)}
                                >
                                  {app.is_read
                                    ? 'Mark as unread'
                                    : 'Mark as read'}
                                </button>
                                <button
                                  className="w-full px-3 py-2 text-left text-xs text-emerald-200 hover:bg-white/10"
                                  onClick={() =>
                                    handleReview(app, 'approved')
                                  }
                                >
                                  Approve
                                </button>
                                <button
                                  className="w-full px-3 py-2 text-left text-xs text-red-200 hover:bg-white/10"
                                  onClick={() =>
                                    handleReview(app, 'denied')
                                  }
                                >
                                  Deny
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* click-outside overlay for the actions menu */}
      {openMenuId && (
        <button
          type="button"
          aria-hidden="true"
          onClick={() => setOpenMenuId(null)}
          className="fixed inset-0 z-10 cursor-default bg-transparent"
        />
      )}
    </div>
  );
}
