'use client';

import { useEffect, useState } from 'react';
import { sb } from '@/lib/supabaseBrowser';
import { useRouter } from 'next/navigation';

type Me = { user_id: string; role: 'admin' | 'merchant' | 'consumer' };

export default function AdminCreateMerchantPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { setMe(null); setLoading(false); return; }
      const { data } = await sb.from('me').select('*').single();
      setMe((data as Me) ?? null);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="p-4">Loading…</div>;
  if (!me || me.role !== 'admin') return <div className="p-4">Admin only.</div>;

  const submit = async () => {
    setError(null);
    if (!name.trim()) { setError('Merchant name is required.'); return; }
    setSaving(true);
    const { error } = await sb.from('merchants').insert({ name: name.trim(), is_active: isActive });
    setSaving(false);
    if (error) { setError(error.message); return; }
    router.push('/admin'); // back to admin home
  };

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-semibold">Create merchant</h1>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <label className="block">
        <div className="text-sm mb-1">Name</div>
        <input
          className="border p-2 rounded w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Test Cafe"
        />
      </label>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        <span>Active</span>
      </label>

      <button
        onClick={submit}
        disabled={saving}
        className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Create merchant'}
      </button>
    </div>
  );
}
