'use client';

import { useEffect, useMemo, useState } from 'react';
import { sb } from '@/lib/supabaseBrowser';

type Role = 'admin' | 'merchant' | 'consumer';

type ProfileRow = {
  user_id: string;
  email: string | null;
  role: Role;
  merchant_id: string | null;
  merchants?: { name: string } | null;

  created_at?: string | null;
  last_sign_in_at?: string | null;
};

type Merchant = { id: string; name: string };
type Town = { id: string; name: string };

type RoleFilter = 'all' | Role;

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

export default function UsersTable({ meUserId }: { meUserId: string | null }) {
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [towns, setTowns] = useState<Town[]>([]);

  const [qUsers, setQUsers] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

  // assign modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<ProfileRow | null>(null);
  const [chosenMerchant, setChosenMerchant] = useState<string>('');

  // create merchant modal (kept here so it’s always reachable from Users tab)
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newMerchantName, setNewMerchantName] = useState('');
  const [selectedTownId, setSelectedTownId] = useState('');
  const [creating, setCreating] = useState(false);

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

  const fetchUsers = async (term = '') => {
    // Admin-only RPC so we can safely include auth.users.last_sign_in_at
    const { data, error } = await sb.rpc('admin_list_users', {
      p_term: term?.trim() ? term.trim() : null,
    });

    if (error) {
      console.error('ADMIN LIST USERS ERROR:', error);
      setUsers([]);
      return;
    }

    const baseUsers: ProfileRow[] = (data as any[]).map((r) => ({
      user_id: r.user_id,
      email: r.email,
      role: r.role as Role,
      merchant_id: r.merchant_id ?? null,
      merchants: r.merchant_name ? { name: r.merchant_name } : null,
      created_at: r.created_at ?? null,
      last_sign_in_at: r.last_sign_in_at ?? null,
    }));

    setUsers(baseUsers);
  };

  useEffect(() => {
    Promise.all([fetchMerchants(), fetchTowns()]).then(() => fetchUsers(''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const usersAssignedCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const u of users) {
      if (u.merchant_id) map[u.merchant_id] = (map[u.merchant_id] || 0) + 1;
    }
    return map;
  }, [users]);

  const setRole = async (user_id: string, role: Role) => {
    if (user_id === meUserId) {
      alert("You can't change your own role from the admin panel.");
      return;
    }
    if (role === 'merchant') {
      alert('Assign to a specific merchant instead.');
      return;
    }

    const { error: rErr } = await sb.from('profiles').update({ role }).eq('user_id', user_id);
    if (rErr) return alert('Failed to set role: ' + rErr.message);

    if (role === 'consumer') {
      const { error: updErr } = await sb
        .from('profiles')
        .update({ merchant_id: null })
        .eq('user_id', user_id);
      if (updErr) return alert('Failed to clear merchant assignment: ' + updErr.message);

      const { error: dErr } = await sb.from('merchant_staff').delete().eq('user_id', user_id);
      if (dErr) console.warn('merchant_staff cleanup failed:', dErr.message);
    }

    await fetchUsers(qUsers);
  };

  const assignMerchant = async (user: ProfileRow, merchant_id: string) => {
    const updates: Record<string, any> = { merchant_id };
    if (user.role === 'consumer') updates.role = 'merchant';

    const { error: updErr } = await sb.from('profiles').update(updates).eq('user_id', user.user_id);
    if (updErr) return alert('Failed to assign merchant: ' + updErr.message);

    // legacy sync
    await sb.from('merchant_staff').delete().eq('user_id', user.user_id);
    await sb.from('merchant_staff').insert({ user_id: user.user_id, merchant_id });

    setAssignModalOpen(false);
    setTargetUser(null);
    setChosenMerchant('');
    await fetchUsers(qUsers);
  };

  const removeAssignment = async (user: ProfileRow) => {
    const updates: Record<string, any> = { merchant_id: null };
    if (user.role === 'merchant') updates.role = 'consumer';

    const { error: updErr } = await sb.from('profiles').update(updates).eq('user_id', user.user_id);
    if (updErr) return alert('Failed to remove assignment: ' + updErr.message);

    await sb.from('merchant_staff').delete().eq('user_id', user.user_id);
    await fetchUsers(qUsers);
  };

  const createMerchant = async () => {
    if (!newMerchantName.trim()) return alert('Please enter a merchant name.');
    if (!selectedTownId) return alert('Please select a town.');

    setCreating(true);

    const { error: mErr } = await sb
      .from('merchants')
      .insert({ name: newMerchantName.trim(), town_id: selectedTownId })
      .select('id,name')
      .single();

    if (mErr) {
      setCreating(false);
      return alert('Failed to create merchant: ' + mErr.message);
    }

    setCreating(false);
    setCreateModalOpen(false);
    setNewMerchantName('');
    setSelectedTownId('');
    await fetchMerchants();
    await fetchUsers(qUsers);
  };

  const filteredUsers = useMemo(() => {
    if (roleFilter === 'all') return users;
    return users.filter((u) => u.role === roleFilter);
  }, [users, roleFilter]);

  return (
    <div className="space-y-3">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Users</h2>
          <p className="text-sm text-slate-600">Assign roles and merchant access.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          {/* Role filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
            className="w-full sm:w-44 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-slate-200"
            aria-label="Filter users by role"
            title="Filter by role"
          >
            <option value="all">All roles</option>
            <option value="consumer">Consumers</option>
            <option value="merchant">Merchants</option>
            <option value="admin">Admins</option>
          </select>

          <div className="flex gap-2">
            <input
              value={qUsers}
              onChange={(e) => setQUsers(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchUsers(qUsers)}
              placeholder="Search by email…"
              className="w-full sm:w-64 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-slate-200"
            />
            <button
              onClick={() => fetchUsers(qUsers)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-sm font-medium"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-[1200px] w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="py-3 px-3 text-left font-medium">Email</th>
              <th className="py-3 px-3 text-left font-medium">Role</th>
              <th className="py-3 px-3 text-left font-medium">Merchant</th>
              <th className="py-3 px-3 text-left font-medium">Created</th>
              <th className="py-3 px-3 text-left font-medium">Last sign in</th>
              <th className="py-3 px-3 text-left font-medium">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredUsers.map((u) => {
              const isMe = u.user_id === meUserId;
              return (
                <tr key={u.user_id} className="border-t border-slate-200">
                  <td className="py-3 px-3">
                    {u.email ?? <span className="text-slate-400">—</span>}
                    {isMe && (
                      <span className="ml-2 text-[10px] uppercase tracking-wide text-slate-500 border border-slate-200 rounded-full px-2 py-0.5">
                        You
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-3 capitalize">{u.role}</td>

                  <td className="py-3 px-3">
                    {u.merchants?.name ?? <span className="text-slate-400">—</span>}
                  </td>

                  <td className="py-3 px-3">{fmtSydney(u.created_at)}</td>
                  <td className="py-3 px-3">
                    {u.last_sign_in_at ? fmtSydney(u.last_sign_in_at) : '—'}
                  </td>

                  <td className="py-3 px-3">
                    <div className="flex flex-wrap gap-2">
                      {!isMe && u.role !== 'consumer' && (
                        <button
                          onClick={() => setRole(u.user_id, 'consumer')}
                          className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                        >
                          Make consumer
                        </button>
                      )}

                      {!isMe && u.role !== 'admin' && (
                        <button
                          onClick={() => setRole(u.user_id, 'admin')}
                          className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                        >
                          Make admin
                        </button>
                      )}

                      {u.merchant_id ? (
                        <>
                          <button
                            onClick={() => {
                              setTargetUser(u);
                              setChosenMerchant(u.merchant_id!);
                              setAssignModalOpen(true);
                            }}
                            className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                          >
                            Re-assign
                          </button>

                          <button
                            onClick={() => removeAssignment(u)}
                            className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                          >
                            Remove
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setTargetUser(u);
                            setChosenMerchant('');
                            setAssignModalOpen(true);
                          }}
                          className="px-2 py-1 rounded-lg bg-emerald-600 text-white font-semibold hover:opacity-95"
                        >
                          Assign
                        </button>
                      )}
                    </div>

                    {isMe && (
                      <div className="mt-1 text-[12px] text-slate-500">
                        Role changes for your own account must be done in Supabase.
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}

            {filteredUsers.length === 0 && (
              <tr>
                <td className="py-4 px-3 text-slate-500" colSpan={6}>
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {filteredUsers.map((u) => {
          const isMe = u.user_id === meUserId;

          return (
            <div key={u.user_id} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold truncate">
                    {u.email ?? '—'} {isMe && <span className="text-xs text-slate-500">(You)</span>}
                  </div>

                  <div className="mt-1 text-sm text-slate-600">
                    Role: <span className="capitalize">{u.role}</span>
                  </div>

                  <div className="text-sm text-slate-600">
                    Merchant: {u.merchants?.name ?? '—'}
                  </div>

                  <div className="mt-1 text-sm text-slate-600">
                    Created: <span className="text-slate-700">{fmtSydney(u.created_at)}</span>
                  </div>

                  <div className="text-sm text-slate-600">
                    Last sign in:{' '}
                    <span className="text-slate-700">
                      {u.last_sign_in_at ? fmtSydney(u.last_sign_in_at) : '—'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {!isMe && u.role !== 'consumer' && (
                  <button
                    onClick={() => setRole(u.user_id, 'consumer')}
                    className="px-2 py-1 rounded-lg border border-slate-200 bg-white"
                  >
                    Make consumer
                  </button>
                )}

                {!isMe && u.role !== 'admin' && (
                  <button
                    onClick={() => setRole(u.user_id, 'admin')}
                    className="px-2 py-1 rounded-lg border border-slate-200 bg-white"
                  >
                    Make admin
                  </button>
                )}

                {u.merchant_id ? (
                  <>
                    <button
                      onClick={() => {
                        setTargetUser(u);
                        setChosenMerchant(u.merchant_id!);
                        setAssignModalOpen(true);
                      }}
                      className="px-2 py-1 rounded-lg border border-slate-200 bg-white"
                    >
                      Re-assign
                    </button>

                    <button
                      onClick={() => removeAssignment(u)}
                      className="px-2 py-1 rounded-lg border border-slate-200 bg-white"
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setTargetUser(u);
                      setChosenMerchant('');
                      setAssignModalOpen(true);
                    }}
                    className="px-2 py-1 rounded-lg bg-emerald-600 text-white font-semibold"
                  >
                    Assign
                  </button>
                )}
              </div>

              {isMe && (
                <div className="mt-2 text-[12px] text-slate-500">
                  Role changes for your own account must be done in Supabase.
                </div>
              )}
            </div>
          );
        })}

        {filteredUsers.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-slate-500">
            No users found.
          </div>
        )}
      </div>

      {/* Assign modal */}
      {assignModalOpen && targetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-3">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-lg p-4">
            <h3 className="text-lg font-semibold mb-1">Assign merchant</h3>
            <p className="text-sm text-slate-600 mb-3">{targetUser.email ?? targetUser.user_id}</p>

            <label className="text-sm font-medium mb-1 block">Merchant</label>
            <select
              className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white"
              value={chosenMerchant}
              onChange={(e) => setChosenMerchant(e.target.value)}
            >
              <option value="" disabled>
                Select a merchant…
              </option>
              {merchants.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                  {usersAssignedCounts[m.id] ? ` (${usersAssignedCounts[m.id]})` : ''}
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
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  if (!chosenMerchant) return alert('Pick a merchant');
                  assignMerchant(targetUser, chosenMerchant);
                }}
                className="px-3 py-2 rounded-xl bg-slate-900 text-white font-semibold hover:opacity-95"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create merchant modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-3">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Create merchant</h3>

            <label className="text-sm font-medium mb-1 block">Merchant name</label>
            <input
              className="w-full mb-3 rounded-xl border border-slate-200 px-3 py-2 bg-white"
              value={newMerchantName}
              onChange={(e) => setNewMerchantName(e.target.value)}
              placeholder="e.g., Ocean Café"
            />

            <label className="text-sm font-medium mb-1 block">Town</label>
            <select
              className="w-full mb-4 rounded-xl border border-slate-200 px-3 py-2 bg-white"
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

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  if (!creating) {
                    setCreateModalOpen(false);
                    setNewMerchantName('');
                    setSelectedTownId('');
                  }
                }}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
                disabled={creating}
              >
                Cancel
              </button>

              <button
                onClick={createMerchant}
                className="px-3 py-2 rounded-xl bg-slate-900 text-white font-semibold disabled:opacity-50"
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
