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
  const [qUsers, setQUsers] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

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
    fetchUsers('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          <p className="text-sm text-slate-600">View user base and roles (Read Only).</p>
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
            </div>
          );
        })}

        {filteredUsers.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-slate-500">
            No users found.
          </div>
        )}
      </div>
    </div>
  );
}
