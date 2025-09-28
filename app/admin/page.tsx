'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { sb } from '@/lib/supabaseBrowser';

type Me = { user_id: string; role: 'admin' | 'merchant' | 'consumer' };

export default function AdminHome() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // must be signed in
      const { data: { session } } = await sb.auth.getSession();
      if (!session) {
        setMe(null);
        setLoading(false);
        return;
      }
      const { data } = await sb.from('me').select('*').single();
      setMe((data as Me) ?? null);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="p-4">Loading…</div>;
  if (!me || me.role !== 'admin') return <div className="p-4">Admin only.</div>;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Admin</h1>

      <div className="space-y-2">
        <Link href="/admin/merchant/new" className="underline">Create merchant</Link>
        <br />
        <Link href="/admin/offer/new" className="underline">Create deal</Link>
      </div>

      <p className="text-sm text-gray-500">
        (Next steps: photo upload, title, terms, usage cap, savings.)
      </p>
    </div>
  );
}
