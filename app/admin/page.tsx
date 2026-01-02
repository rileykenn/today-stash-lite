'use client';

import { useEffect, useState } from 'react';
import { sb } from '@/lib/supabaseBrowser';

import AdminTabs, { AdminTabKey } from './_components/AdminTabs';
import UsersTable from './_components/UsersTable';
import MerchantsTable from './_components/MerchantsTable';
import DealsTable from './_components/DealsTable';
import ApplicationsTable from './_components/ApplicationsTable';
import SupportTable from './_components/SupportTable';
import TownsTable from './_components/TownsTable';

type Role = 'admin' | 'merchant' | 'consumer';

export default function AdminHome() {
  const [meRole, setMeRole] = useState<Role | null>(null);
  const [meUserId, setMeUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<AdminTabKey>('users');

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
        console.error('PROFILE FETCH ERROR:', error);
        setMeRole(null);
      } else {
        setMeRole(String((data as any)?.role) as Role);
      }

      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-[#F6F7FB] p-4 text-slate-700">Loading…</div>;
  }

  if (meRole !== 'admin') {
    return (
      <div className="min-h-screen bg-[#F6F7FB] p-4 text-slate-700">
        Admin only. Make sure you are logged in as an admin.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F7FB] text-slate-900">
      <div className="mx-auto w-full max-w-[95vw] px-3 sm:px-6 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold leading-tight">Admin</h1>
            <p className="text-sm text-slate-600">Simple, Airtable-style admin workspace.</p>
          </div>
        </div>

        {/* Tabs */}
        <AdminTabs value={tab} onChange={setTab} />

        {/* Panels */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="p-3 sm:p-4">
            {tab === 'users' && <UsersTable meUserId={meUserId} />}
            {tab === 'merchants' && <MerchantsTable />}
            {tab === 'deals' && <DealsTable />}
            {tab === 'applications' && <ApplicationsTable />}
            {tab === 'support' && <SupportTable />}
            {tab === 'towns' && <TownsTable />}
          </div>
        </div>
      </div>
    </div>
  );
}
