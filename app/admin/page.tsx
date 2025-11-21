'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { sb } from '@/lib/supabaseBrowser';

type Role = 'admin' | 'merchant' | 'consumer';

type ProfileRow = {
  user_id: string;
  email: string | null;
  role: Role;
  merchant_id: string | null;
  merchants?: { name: string } | null;
};

type Merchant = { id: string; name: string };

type DealRow = {
  id: string;
  title: string | null;
  merchant_id: string;
  merchants: { name: string } | null;
  exp_date: string | null;
  is_active: boolean;
};

type Town = {
  id: string;
  name: string;
};

export default function AdminHome() {
  const [meRole, setMeRole] = useState<Role | null>(null);
  const [meUserId, setMeUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [towns, setTowns] = useState<Town[]>([]);

  const [qUsers, setQUsers] = useState('');
  const [qMerchants, setQMerchants] = useState('');
  const [qDeals, setQDeals] = useState('');

  // assign modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<ProfileRow | null>(null);
  const [chosenMerchant, setChosenMerchant] = useState<string>('');

  // create merchant modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newMerchantName, setNewMerchantName] = useState('');
  const [selectedTownId, setSelectedTownId] = useState('');
  const [creating, setCreating] = useState(false);

  // get my role + id
  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await sb.auth.getSession();
      if (!session) {
        setMeRole(null);
        setMeUserId(null);
        setLoading(false);
        return;
      }
      setMeUserId(session.user.id);

      const { data, error } = await sb
        .from('profiles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

      if (error) {
        console.error('PROFILE FETCH ERROR:', JSON.stringify(error, null, 2));
        setMeRole(null);
      } else {
        setMeRole(String((data as any)?.role) as Role);
      }
      setLoading(false);
    })();
  }, []);

  const fetchMerchants = async () => {
    const { data, error } = await sb
      .from('merchants')
      .select('id,name')
      .order('name', { ascending: true })
      .limit(500);

    if (error) {
      console.error(error);
      setMerchants([]);
      return;
    }
    setMerchants(data as Merchant[]);
  };

  const fetchTowns = async () => {
    const { data, error } = await sb
      .from('towns')
      .select('id,name')
      .order('name', { ascending: true });

    if (error) {
      console.error('TOWNS FETCH ERROR:', error);
      setTowns([]);
      return;
    }
    setTowns(data as Town[]);
  };

  // join profiles → merchants so we can show merchant name
  const fetchUsers = async (term = '') => {
    const { data: profileRows, error: pErr } = await sb
      .from('profiles')
      .select('user_id,email,role,merchant_id,merchants(name)')
      .ilike('email', term ? `%${term}%` : '%')
      .order('email', { ascending: true, nullsFirst: true })
      .limit(200);

    if (pErr) {
      console.error(pErr);
      setUsers([]);
      return;
    }

    const baseUsers: ProfileRow[] = (profileRows as any[]).map((r) => ({
      user_id: r.user_id,
      email: r.email,
      role: r.role as Role,
      merchant_id: r.merchant_id ?? null,
      merchants: r.merchants ? { name: r.merchants.name } : null,
    }));

    setUsers(baseUsers);
  };

  const fetchDeals = async (term = '') => {
    const { data, error } = await sb
      .from('offers')
      .select('id,title,merchant_id,exp_date,is_active,merchants(name)')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error(error);
      setDeals([]);
      return;
    }

    let rows = data as unknown as DealRow[];

    if (term.trim()) {
      const q = term.toLowerCase();
      rows = rows.filter((d) =>
        [d.title ?? '', d.merchants?.name ?? '']
          .join(' ')
          .toLowerCase()
          .includes(q),
      );
    }

    setDeals(rows);
  };

  useEffect(() => {
    if (meRole === 'admin') {
      Promise.all([fetchMerchants(), fetchTowns()]).then(() => {
        fetchUsers('');
        fetchDeals('');
      });
    }
  }, [meRole]);

  const usersAssignedCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const u of users) {
      if (u.merchant_id) map[u.merchant_id] = (map[u.merchant_id] || 0) + 1;
    }
    return map;
  }, [users]);

  // ---------- actions ----------

  const setRole = async (user_id: string, role: Role) => {
    // still block changing your own role so you can't demote yourself
    if (user_id === meUserId) {
      alert("You can't change your own role from the admin panel.");
      return;
    }

    if (role === 'merchant') {
      alert('Assign to a specific merchant instead.');
      return;
    }

    const { error: rErr } = await sb
      .from('profiles')
      .update({ role })
      .eq('user_id', user_id);
    if (rErr) return alert('Failed to set role: ' + rErr.message);

    if (role === 'consumer') {
      // going back to consumer should clear merchant links
      const { error: updErr } = await sb
        .from('profiles')
        .update({ merchant_id: null })
        .eq('user_id', user_id);
      if (updErr) return alert('Failed to clear merchant assignment: ' + updErr.message);

      const { error: dErr } = await sb
        .from('merchant_staff')
        .delete()
        .eq('user_id', user_id);
      if (dErr) console.warn('merchant_staff cleanup failed:', dErr.message);
    }

    await fetchUsers(qUsers);
  };

  // NEW: takes full user, keeps admins as admin, only upgrades consumers → merchant
  const assignMerchant = async (user: ProfileRow, merchant_id: string) => {
    const updates: Record<string, any> = { merchant_id };

    if (user.role === 'consumer') {
      updates.role = 'merchant';
    }
    // if user.role is admin or merchant, we keep it as-is

    const { error: updErr } = await sb
      .from('profiles')
      .update(updates)
      .eq('user_id', user.user_id);
    if (updErr) {
      alert('Failed to assign merchant: ' + updErr.message);
      return;
    }

    // optional legacy sync to merchant_staff
    const { error: delErr } = await sb
      .from('merchant_staff')
      .delete()
      .eq('user_id', user.user_id);
    if (delErr) console.warn('Failed to clear previous assignment:', delErr.message);

    const { error: insErr } = await sb
      .from('merchant_staff')
      .insert({ user_id: user.user_id, merchant_id });
    if (insErr) console.warn('Failed to assign merchant in merchant_staff:', insErr.message);

    setAssignModalOpen(false);
    setTargetUser(null);
    setChosenMerchant('');
    await fetchUsers(qUsers);
  };

  // NEW: takes full user; admin keeps admin role, merchant drops to consumer
  const removeAssignment = async (user: ProfileRow) => {
    const updates: Record<string, any> = { merchant_id: null };

    if (user.role === 'merchant') {
      updates.role = 'consumer';
    }
    // if user.role === 'admin', we *only* clear merchant_id

    const { error: updErr } = await sb
      .from('profiles')
      .update(updates)
      .eq('user_id', user.user_id);
    if (updErr) {
      alert('Failed to remove assignment: ' + updErr.message);
      return;
    }

    const { error: delErr } = await sb
      .from('merchant_staff')
      .delete()
      .eq('user_id', user.user_id);
    if (delErr) console.warn('merchant_staff cleanup failed:', delErr.message);

    await fetchUsers(qUsers);
  };

  const createMerchant = async () => {
    if (!newMerchantName.trim()) {
      alert('Please enter a merchant name.');
      return;
    }
    if (!selectedTownId) {
      alert('Please select a town.');
      return;
    }

    setCreating(true);

    const { data: m, error: mErr } = await sb
      .from('merchants')
      .insert({ name: newMerchantName.trim(), town_id: selectedTownId })
      .select('id,name')
      .single();

    if (mErr) {
      setCreating(false);
      alert('Failed to create merchant: ' + mErr.message);
      return;
    }

    setCreating(false);
    setCreateModalOpen(false);
    setNewMerchantName('');
    setSelectedTownId('');
    await fetchMerchants();
    await fetchUsers(qUsers);
  };

  const deleteMerchant = async (merchant_id: string) => {
    if ((usersAssignedCounts[merchant_id] || 0) > 0) {
      alert('Unassign all users from this merchant before deleting.');
      return;
    }
    if (!confirm('Delete this merchant? This cannot be undone.')) return;
    const { error } = await sb
      .from('merchants')
      .delete()
      .eq('id', merchant_id);
    if (error) {
      alert('Failed to delete merchant: ' + error.message);
      return;
    }
    await fetchMerchants();
  };

  const deleteDeal = async (deal_id: string) => {
    if (!confirm('Delete this deal? This cannot be undone.')) return;
    const { error } = await sb
      .from('offers')
      .delete()
      .eq('id', deal_id);
    if (error) {
      alert('Failed to delete deal: ' + error.message);
      return;
    }
    await fetchDeals(qDeals);
  };

  // ---------- filtered views ----------

  const filteredMerchants = useMemo(() => {
    if (!qMerchants.trim()) return merchants;
    const q = qMerchants.toLowerCase();
    return merchants.filter((m) => m.name.toLowerCase().includes(q));
  }, [merchants, qMerchants]);

  const filteredDeals = useMemo(() => {
    if (!qDeals.trim()) return deals;
    const q = qDeals.toLowerCase();
    return deals.filter((d) =>
      [d.title ?? '', d.merchants?.name ?? ''].join(' ').toLowerCase().includes(q),
    );
  }, [deals, qDeals]);

  // deal status
  function getDealStatus(deal: DealRow) {
    if (!deal.exp_date) {
      return { label: 'No expiry', className: 'text-white/60 border-white/20' };
    }
    const now = Date.now();
    const exp = new Date(deal.exp_date).getTime();
    if (Number.isNaN(exp)) {
      return { label: 'Unknown', className: 'text-white/60 border-white/20' };
    }
    if (!deal.is_active) {
      return {
        label: 'Inactive',
        className: 'text-white/70 border-white/20',
      };
    }
    if (exp >= now) {
      return {
        label: 'Active',
        className: 'text-emerald-300 border-emerald-400/60 bg-emerald-500/10',
      };
    }
    return {
      label: 'Expired',
      className: 'text-red-300 border-red-400/60 bg-red-500/10',
    };
  }

  if (loading) return <div className="p-4">Loading…</div>;
  if (meRole !== 'admin')
    return <div className="p-4">Admin only. Make sure you are logged in as an admin.</div>;

  return (
    <div className="min-h-screen bg-[#05090D] text-white px-6 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Admin</h1>

          <div className="flex gap-2">
            <Link
              href="/admin/applications"
              className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
            >
              Applications
            </Link>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
            >
              Create merchant
            </button>
            <Link
              href="/admin/offer/new"
              className="px-3 py-2 rounded-lg bg-[#14F195] text-black text-sm font-semibold hover:opacity-90"
            >
              Create deal
            </Link>
          </div>
        </div>

        {/* USERS */}
        <section className="rounded-2xl bg-[#0B1117] border border-white/10 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold">Users</h2>
              <p className="text-xs text-white/60">
                Quickly adjust roles and merchant access.
              </p>
            </div>
            <div className="flex">
              <input
                value={qUsers}
                onChange={(e) => setQUsers(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') fetchUsers(qUsers);
                }}
                placeholder="Search by email…"
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm outline-none"
              />
              <button
                onClick={() => fetchUsers(qUsers)}
                className="ml-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
              >
                Search
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="text-left text-white/60">
                <tr>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4">Merchant</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isMe = u.user_id === meUserId;
                  return (
                    <tr key={u.user_id} className="border-t border-white/10">
                      <td className="py-2 pr-4">
                        {u.email ?? <span className="opacity-60">—</span>}
                        {isMe && (
                          <span className="ml-2 text-[10px] uppercase tracking-wide text-white/50 border border-white/20 rounded-full px-2 py-0.5">
                            You
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-4 capitalize">{u.role}</td>
                      <td className="py-2 pr-4">
                        {u.merchants?.name ?? <span className="opacity-50">—</span>}
                      </td>
                      <td className="py-2 pr-4 space-x-2">
                        {/* Role controls – still blocked for self to avoid lockout */}
                        {!isMe && u.role !== 'consumer' && (
                          <button
                            onClick={() => setRole(u.user_id, 'consumer')}
                            className="px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                            title="Set role: consumer (also clears merchant)"
                          >
                            Make consumer
                          </button>
                        )}
                        {!isMe && u.role !== 'admin' && (
                          <button
                            onClick={() => setRole(u.user_id, 'admin')}
                            className="px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                            title="Set role: admin"
                          >
                            Make admin
                          </button>
                        )}

                        {/* Assignment controls – now allowed for self as well */}
                        {u.merchant_id ? (
                          <>
                            <button
                              onClick={() => {
                                setTargetUser(u);
                                setChosenMerchant(u.merchant_id!);
                                setAssignModalOpen(true);
                              }}
                              className="ml-3 px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                            >
                              Re-assign
                            </button>
                            <button
                              onClick={() => removeAssignment(u)}
                              className="px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                            >
                              Remove assign
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              setTargetUser(u);
                              setChosenMerchant('');
                              setAssignModalOpen(true);
                            }}
                            className="ml-3 px-2 py-1 rounded bg-[#14F195] text-[#0B1210] font-semibold hover:opacity-90"
                          >
                            Assign to merchant
                          </button>
                        )}

                        {isMe && (
                          <span className="block text-[11px] text-white/60 mt-1">
                            Role changes for your own account must be done in Supabase.
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td className="py-3 text-white/60">No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* MERCHANTS */}
        <section className="rounded-2xl bg-[#0B1117] border border-white/10 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Merchants</h2>
              <p className="text-xs text-white/60">
                Overview of venues and assigned staff.
              </p>
            </div>
            <input
              value={qMerchants}
              onChange={(e) => setQMerchants(e.target.value)}
              placeholder="Search merchants…"
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm outline-none"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[600px] w-full text-sm">
              <thead className="text-left text-white/60">
                <tr>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Assigned users</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMerchants.map((m) => (
                  <tr key={m.id} className="border-t border-white/10">
                    <td className="py-2 pr-4">{m.name}</td>
                    <td className="py-2 pr-4">
                      {usersAssignedCounts[m.id] ?? 0}
                    </td>
                    <td className="py-2 pr-4 space-x-2">
                      <button
                        onClick={() => deleteMerchant(m.id)}
                        className="ml-2 underline text-red-400 hover:text-red-300"
                        title="Delete merchant"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredMerchants.length === 0 && (
                  <tr>
                    <td className="py-3 text-white/60">No merchants found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* DEALS */}
        <section className="rounded-2xl bg-[#0B1117] border border-white/10 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Deals</h2>
              <p className="text-xs text-white/60">
                Manage offers, see expiry status and edit or delete deals.
              </p>
            </div>
            <input
              value={qDeals}
              onChange={(e) => setQDeals(e.target.value)}
              placeholder="Search deals or merchants…"
              className="px-3 py-2 rounded-lg bg:white/5 bg-white/5 border border-white/10 text-sm outline-none"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[800px] w-full text-sm">
              <thead className="text-left text-white/60">
                <tr>
                  <th className="py-2 pr-4">Deal</th>
                  <th className="py-2 pr-4">Merchant</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Expiry</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeals.map((d) => {
                  const status = getDealStatus(d);
                  const expLabel = d.exp_date
                    ? new Date(d.exp_date).toLocaleDateString('en-AU', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : '—';

                  return (
                    <tr key={d.id} className="border-t border-white/10">
                      <td className="py-2 pr-4">
                        {d.title ?? <span className="opacity-60">Untitled</span>}
                      </td>
                      <td className="py-2 pr-4">
                        {d.merchants?.name ?? <span className="opacity-60">—</span>}
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="py-2 pr-4">{expLabel}</td>
                      <td className="py-2 pr-4 space-x-2">
                        <Link className="underline" href={`/admin/offer/${d.id}`}>
                          Edit
                        </Link>
                        <button
                          onClick={() => deleteDeal(d.id)}
                          className="ml-2 underline text-red-400 hover:text-red-300"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredDeals.length === 0 && (
                  <tr>
                    <td className="py-3 text-white/60">No deals found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Assign/Reassign modal */}
      {assignModalOpen && targetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-2xl bg-[#0B1210] border border-white/10 p-4">
            <h3 className="text-lg font-semibold mb-2">Assign merchant to</h3>
            <p className="text-sm text-white/70 mb-4">
              {targetUser.email ?? targetUser.user_id}
            </p>

            <label className="text-sm mb-2 block">Merchant</label>
            <select
              className="w-full rounded-lg bg:white/5 bg-white/5 border border-white/10 px-3 py-2"
              value={chosenMerchant}
              onChange={(e) => setChosenMerchant(e.target.value)}
            >
              <option value="" disabled>
                Select a merchant…
              </option>
              {merchants.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setAssignModalOpen(false);
                  setTargetUser(null);
                  setChosenMerchant('');
                }}
                className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!chosenMerchant) {
                    alert('Pick a merchant');
                    return;
                  }
                  assignMerchant(targetUser, chosenMerchant);
                }}
                className="px-3 py-2 rounded-lg bg-[#14F195] text-[#0B1210] font-semibold hover:opacity-90"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create merchant modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-2xl bg-[#0B1210] border border-white/10 p-4">
            <h3 className="text-lg font-semibold mb-2">Create merchant</h3>

            <label className="text-sm mb-1 block">Merchant name</label>
            <input
              className="w-full mb-3 rounded-lg bg:white/5 bg-white/5 border border-white/10 px-3 py-2"
              value={newMerchantName}
              onChange={(e) => setNewMerchantName(e.target.value)}
              placeholder="e.g., Ocean Café"
            />

            <label className="text-sm mb-1 block">Town</label>
            <select
              className="w-full mb-4 rounded-lg bg:white/5 bg-white/5 border border-white/10 px-3 py-2"
              value={selectedTownId}
              onChange={(e) => setSelectedTownId(e.target.value)}
            >
              <option value="">Select a town…</option>
              {towns.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <div className="mt-2 flex justify-end gap-2">
              <button
                onClick={() => {
                  if (!creating) {
                    setCreateModalOpen(false);
                    setNewMerchantName('');
                    setSelectedTownId('');
                  }
                }}
                className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20"
                disabled={creating}
              >
                Cancel
              </button>
              <button
                onClick={createMerchant}
                className="px-3 py-2 rounded-lg bg-[#14F195] text-[#0B1210] font-semibold hover:opacity-90 disabled:opacity-50"
                disabled={creating}
              >
                {creating ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
