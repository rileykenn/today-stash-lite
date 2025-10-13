'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { sb } from '@/lib/supabaseBrowser';

type Role = 'admin' | 'merchant' | 'consumer';

type ProfileRow = {
  user_id: string;
  email: string | null;
  role: Role;
  merchant_id: string | null;                 // filled from merchant_staff map
  merchants?: { name: string } | null;        // filled from merchants map
};

type Merchant = { id: string; name: string };

// NEW: deals row shape
type DealRow = {
  id: string;
  title: string | null;         // offer name in your table
  merchant_id: string;
  merchants: { name: string } | null;
};

export default function AdminHome() {
  const [meRole, setMeRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [q, setQ] = useState('');

  // assign modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<ProfileRow | null>(null);
  const [chosenMerchant, setChosenMerchant] = useState<string>('');

  // create-merchant modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newMerchantName, setNewMerchantName] = useState('');
  const [newMerchantStreet, setNewMerchantStreet] = useState('');
  const [creating, setCreating] = useState(false);

  // NEW: deals state
  const [deals, setDeals] = useState<DealRow[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { setMeRole(null); setLoading(false); return; }
      const { data, error } = await sb.from('profiles').select('role').eq('user_id', session.user.id).single();
      if (error) { console.error(error); setMeRole(null); }
      else setMeRole(String((data as any)?.role) as Role);
      setLoading(false);
    })();
  }, []);

  const fetchMerchants = async () => {
    const { data, error } = await sb
      .from('merchants')
      .select('id,name')
      .order('name', { ascending: true })
      .limit(500);
    if (error) { console.error(error); setMerchants([]); return; }
    setMerchants(data as Merchant[]);
  };

  const fetchUsers = async (term = '') => {
    // 1) pull users from profiles ONLY (avoids merchant_staff RLS killing the list)
    const { data: profileRows, error: pErr } = await sb
      .from('profiles')
      .select('user_id,email,role')
      .ilike('email', term ? `%${term}%` : '%')
      .order('email', { ascending: true, nullsFirst: true })
      .limit(200);

    if (pErr) {
      console.error(pErr);
      setUsers([]);
      return;
    }

    const baseUsers: ProfileRow[] = (profileRows as any[]).map(r => ({
      user_id: r.user_id,
      email: r.email,
      role: r.role as Role,
      merchant_id: null,
      merchants: null,
    }));

    // Short-circuit if no users
    if (baseUsers.length === 0) {
      setUsers([]);
      return;
    }

    // 2) try to fetch their merchant assignments from merchant_staff
    let staffMap = new Map<string, string>(); // user_id -> merchant_id
    {
      const ids = baseUsers.map(u => u.user_id);
      const { data: staffRows, error: sErr } = await sb
        .from('merchant_staff')
        .select('user_id,merchant_id')
        .in('user_id', ids);

      // If RLS blocks, we still show users; assignment will just be blank.
      if (!sErr && staffRows) {
        for (const row of staffRows as any[]) {
          // one merchant per user policy (last one wins if multiple)
          staffMap.set(row.user_id, row.merchant_id);
        }
      } else if (sErr) {
        console.warn('merchant_staff read blocked by RLS (showing users without merchant link):', sErr.message);
      }
    }

    // 3) map merchant_id -> name
    const merchantNameById = new Map<string, string>();
    for (const m of merchants) merchantNameById.set(m.id, m.name);

    const merged = baseUsers.map(u => {
      const mid = staffMap.get(u.user_id) ?? null;
      return {
        ...u,
        merchant_id: mid,
        merchants: mid ? { name: merchantNameById.get(mid) ?? '' } : null,
      };
    });

    setUsers(merged);
  };

  // NEW: fetch deals from offers + merchant name
  const fetchDeals = async () => {
    const { data, error } = await sb
      .from('offers')
      .select('id,title,merchant_id,merchants(name)')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) { console.error(error); setDeals([]); return; }
    setDeals(data as unknown as DealRow[]);
  };

  useEffect(() => {
    if (meRole === 'admin') { fetchMerchants().then(() => { fetchUsers(''); fetchDeals(); }); }
  }, [meRole]);

  // counts calculated from the already-merged users list
  const usersAssignedCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const u of users) if (u.merchant_id) map[u.merchant_id] = (map[u.merchant_id] || 0) + 1;
    return map;
  }, [users]);

  // --- Actions (write to merchant_staff as source of truth) ---
  const setRole = async (user_id: string, role: Role) => {
    if (role === 'merchant') { alert('Assign to a specific merchant instead.'); return; }

    const { error: rErr } = await sb.from('profiles').update({ role }).eq('user_id', user_id);
    if (rErr) return alert('Failed to set role: ' + rErr.message);

    if (role === 'consumer') {
      // clear any staff links
      const { error: dErr } = await sb.from('merchant_staff').delete().eq('user_id', user_id);
      if (dErr) return alert('Failed to clear merchant assignment: ' + dErr.message);
    }

    await fetchUsers(q);
  };

  const assignMerchant = async (user_id: string, merchant_id: string) => {
    // ensure role
    const { error: roleErr } = await sb.from('profiles').update({ role: 'merchant' }).eq('user_id', user_id);
    if (roleErr) return alert('Failed to set role: ' + roleErr.message);

    // clear old links (enforce one-merchant-per-user)
    const { error: delErr } = await sb.from('merchant_staff').delete().eq('user_id', user_id);
    if (delErr) return alert('Failed to clear previous assignment: ' + delErr.message);

    // create new link
    const { error: insErr } = await sb.from('merchant_staff').insert({ user_id, merchant_id });
    if (insErr) return alert('Failed to assign merchant: ' + insErr.message);

    setAssignModalOpen(false); setTargetUser(null); setChosenMerchant('');
    await fetchUsers(q);
  };

  const removeAssignment = async (user_id: string) => {
    const { error: delErr } = await sb.from('merchant_staff').delete().eq('user_id', user_id);
    if (delErr) return alert('Failed to remove assignment: ' + delErr.message);

    const { error: roleErr } = await sb.from('profiles').update({ role: 'consumer' }).eq('user_id', user_id);
    if (roleErr) return alert('Failed to set role: ' + roleErr.message);

    await fetchUsers(q);
  };

  const createMerchant = async () => {
    if (!newMerchantName.trim()) { alert('Please enter a merchant name.'); return; }
    setCreating(true);
    const { data: m, error: mErr } = await sb
      .from('merchants').insert({ name: newMerchantName.trim() }).select('id,name').single();
    if (mErr) { setCreating(false); alert('Failed to create merchant: ' + mErr.message); return; }

    if (newMerchantStreet.trim()) {
      const { error: aErr } = await sb
        .from('merchant_addresses')
        .insert({ merchant_id: m.id, street_address: newMerchantStreet.trim() });
      if (aErr) console.warn('merchant_addresses insert failed:', aErr.message);
    }

    setCreating(false);
    setCreateModalOpen(false);
    setNewMerchantName(''); setNewMerchantStreet('');
    await fetchMerchants();
    await fetchUsers(q);
  };

  const deleteMerchant = async (merchant_id: string) => {
    if ((usersAssignedCounts[merchant_id] || 0) > 0) {
      alert('Unassign all users from this merchant before deleting.');
      return;
    }
    if (!confirm('Delete this merchant? This cannot be undone.')) return;
    const { error } = await sb.from('merchants').delete().eq('id', merchant_id);
    if (error) { alert('Failed to delete merchant: ' + error.message); return; }
    await fetchMerchants();
  };

  // NEW: delete deal
  const deleteDeal = async (deal_id: string) => {
    if (!confirm('Delete this deal? This cannot be undone.')) return;
    const { error } = await sb.from('offers').delete().eq('id', deal_id);
    if (error) { alert('Failed to delete deal: ' + error.message); return; }
    await fetchDeals();
  };

  if (loading) return <div className="p-4">Loading…</div>;
  if (meRole !== 'admin') return <div className="p-4">Admin only.</div>;

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-semibold">Admin</h1>

      {/* Quick actions */}
      <div className="space-x-3">
        <button onClick={() => setCreateModalOpen(true)} className="underline">Create merchant</button>
        <Link href="/admin/offer/new" className="underline ml-3">Create deal</Link>
      </div>

      {/* Merchants summary */}
      <section className="rounded-2xl border border-white/10 p-4">
        <h2 className="font-semibold mb-3">Merchants</h2>
        <div className="overflow-x-auto">
          <table className="min-w-[600px] w-full text-sm">
            <thead className="text-left text-white/60">
              <tr>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Assigned Users</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {merchants.map((m) => (
                <tr key={m.id} className="border-t border-white/10">
                  <td className="py-2 pr-4">{m.name}</td>
                  <td className="py-2 pr-4">{usersAssignedCounts[m.id] ?? 0}</td>
                  <td className="py-2 pr-4 space-x-2">
                    {/* EDIT REMOVED AS REQUESTED */}
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
              {merchants.length === 0 && (
                <tr><td className="py-2 text-white/60">No merchants yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* NEW: Deals panel */}
      <section className="rounded-2xl border border-white/10 p-4">
        <h2 className="font-semibold mb-3">Deals</h2>
        <div className="overflow-x-auto">
          <table className="min-w-[700px] w-full text-sm">
            <thead className="text-left text-white/60">
              <tr>
                <th className="py-2 pr-4">Deal</th>
                <th className="py-2 pr-4">Merchant</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => (
                <tr key={d.id} className="border-t border-white/10">
                  <td className="py-2 pr-4">{d.title ?? <span className="opacity-60">—</span>}</td>
                  <td className="py-2 pr-4">{d.merchants?.name ?? <span className="opacity-60">—</span>}</td>
                  <td className="py-2 pr-4 space-x-2">
                    <Link className="underline" href={`/admin/offer/${d.id}`}>Edit</Link>
                    <button
                      onClick={() => deleteDeal(d.id)}
                      className="ml-2 underline text-red-400 hover:text-red-300"
                      title="Delete deal"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {deals.length === 0 && (
                <tr><td className="py-2 text-white/60">No deals yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Users table */}
      <section className="rounded-2xl border border-white/10 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Users</h2>
          <div className="flex">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') fetchUsers(q); }}
              placeholder="Search by email…"
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 outline-none"
              aria-label="Search users by email"
            />
            <button
              onClick={() => fetchUsers(q)}
              className="ml-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20"
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
              {users.map((u) => (
                <tr key={u.user_id} className="border-t border-white/10">
                  <td className="py-2 pr-4">{u.email ?? <span className="opacity-60">—</span>}</td>
                  <td className="py-2 pr-4">{u.role}</td>
                  <td className="py-2 pr-4">{u.merchants?.name ?? <span className="opacity-60">—</span>}</td>
                  <td className="py-2 pr-4 space-x-2">
                    {/* Role controls */}
                    <button
                      onClick={() => setRole(u.user_id, 'consumer')}
                      className="px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                      title="Set role: consumer (also clears merchant)"
                    >
                      Set Consumer
                    </button>
                    <button
                      onClick={() => setRole(u.user_id, 'admin')}
                      className="px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                      title="Set role: admin"
                    >
                      Set Admin
                    </button>

                    {/* Assignment controls */}
                    {u.role !== 'merchant' || !u.merchant_id ? (
                      <button
                        onClick={() => { setTargetUser(u); setChosenMerchant(''); setAssignModalOpen(true); }}
                        className="ml-3 px-2 py-1 rounded bg-[#14F195] text-[#0B1210] font-semibold hover:opacity-90"
                      >
                        Assign merchant role
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => { setTargetUser(u); setChosenMerchant(u.merchant_id!); setAssignModalOpen(true); }}
                          className="ml-3 px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                        >
                          Re-assign
                        </button>
                        <button
                          onClick={() => removeAssignment(u.user_id)}
                          className="px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                        >
                          Remove assign
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td className="py-2 text-white/60">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Assign/Reassign Modal */}
      {assignModalOpen && targetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-2xl bg-[#0B1210] border border-white/10 p-4">
            <h3 className="text-lg font-semibold mb-2">Assign merchant to</h3>
            <p className="text-sm text-white/70 mb-4">{targetUser.email ?? targetUser.user_id}</p>

            <label className="text-sm mb-2 block">Merchant</label>
            <select
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2"
              value={chosenMerchant}
              onChange={(e) => setChosenMerchant(e.target.value)}
            >
              <option value="" disabled>Select a merchant…</option>
              {merchants.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setAssignModalOpen(false); setTargetUser(null); setChosenMerchant(''); }}
                className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!chosenMerchant) { alert('Pick a merchant'); return; }
                  assignMerchant(targetUser.user_id, chosenMerchant);
                }}
                className="px-3 py-2 rounded-lg bg-[#14F195] text-[#0B1210] font-semibold hover:opacity-90"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Merchant Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-2xl bg-[#0B1210] border border-white/10 p-4">
            <h3 className="text-lg font-semibold mb-2">Create merchant</h3>

            <label className="text-sm mb-1 block">Merchant name</label>
            <input
              className="w-full mb-3 rounded-lg bg-white/5 border border-white/10 px-3 py-2"
              value={newMerchantName}
              onChange={(e) => setNewMerchantName(e.target.value)}
              placeholder="e.g., Ocean Café"
            />

            <label className="text-sm mb-1 block">Street address</label>
            <input
              className="w-full mb-4 rounded-lg bg-white/5 border border-white/10 px-3 py-2"
              value={newMerchantStreet}
              onChange={(e) => setNewMerchantStreet(e.target.value)}
              placeholder="e.g., 123 Beach Rd, Sussex Inlet"
            />

            <div className="mt-2 flex justify-end gap-2">
              <button
                onClick={() => { if (!creating) { setCreateModalOpen(false); setNewMerchantName(''); setNewMerchantStreet(''); } }}
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
