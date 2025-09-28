'use client';

import { useEffect, useMemo, useState } from 'react';
import { sb } from '@/lib/supabaseBrowser';
import { useRouter } from 'next/navigation';

type Me = { user_id: string; role: 'admin' | 'merchant' | 'consumer' };
type Merchant = { id: string; name: string; is_active: boolean };

/** Insert payload for the `offers` table */
type OfferInsert = {
  merchant_id: string;
  title: string;
  description: string | null;
  terms: string | null;
  is_active: boolean;
  image_url: string | null;
  savings_cents: number | null;
  valid_from?: string; // ISO string
  valid_to?: string;   // ISO string
  daily_limit?: number;
  total_limit?: number;
};

function uuid() {
  // simple uuid v4 (client-side) for storage paths
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 15) >>> 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function AdminCreateOfferPage() {
  const router = useRouter();

  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [merchantId, setMerchantId] = useState<string>('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [terms, setTerms] = useState('');

  const [validFrom, setValidFrom] = useState<string>(''); // datetime-local
  const [validTo, setValidTo] = useState<string>('');     // datetime-local

  const [dailyLimit, setDailyLimit] = useState<string>(''); // text -> number
  const [totalLimit, setTotalLimit] = useState<string>(''); // text -> number

  const [savings, setSavings] = useState<string>(''); // AUD text; convert to cents
  const [isActive, setIsActive] = useState(true);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Load me + merchants, with surfaced errors and empty-state handling
  useEffect(() => {
    (async () => {
      const { data: sessionRes } = await sb.auth.getSession();
      if (!sessionRes?.session) {
        setMe(null);
        setLoading(false);
        return;
      }

      const { data: meRow } = await sb.from('me').select('*').single();
      setMe((meRow as Me) ?? null);
      setLoading(false);

      const { data: merch, error: mErr } = await sb
        .from('merchants')
        .select('id,name,is_active')
        .order('name', { ascending: true });

      if (mErr) {
        console.error('Merchants fetch error:', mErr);
        setError(`Merchants fetch error: ${mErr.message}`);
        setMerchants([]);
        setMerchantId('');
        return;
      }

      const list = merch ?? [];
      setMerchants(list);
      setMerchantId(list.length > 0 ? list[0].id : '');
    })();
  }, []);

  const savingsCents = useMemo(() => {
    const n = Number(savings.replace(/[^0-9.]/g, ''));
    if (Number.isNaN(n)) return 0;
    return Math.round(n * 100);
  }, [savings]);

  const onFile = (f: File | null) => {
    setImageFile(f);
    setImagePreview(f ? URL.createObjectURL(f) : null);
  };

  const submit = async () => {
    setError(null);

    if (!me || me.role !== 'admin') {
      setError('Admin only.');
      return;
    }
    if (!merchantId) {
      setError('Select a merchant.');
      return;
    }
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    setSaving(true);

    // 1) Upload image (optional)
    let image_url: string | null = null;
    if (imageFile) {
      const ext = (imageFile.name.split('.').pop() || 'jpg').toLowerCase();
      const objectPath = `${merchantId}/${uuid()}.${ext}`;
      const up = await sb.storage.from('offer-media').upload(objectPath, imageFile, {
        cacheControl: '3600',
        upsert: false,
      });
      if (up.error) {
        setSaving(false);
        setError(up.error.message);
        return;
      }
      const pub = sb.storage.from('offer-media').getPublicUrl(objectPath);
      image_url = pub.data.publicUrl;
    }

    // 2) Build payload (fully typed)
    const payload: OfferInsert = {
      merchant_id: merchantId,
      title: title.trim(),
      description: description.trim() ? description.trim() : null,
      terms: terms.trim() ? terms.trim() : null,
      is_active: isActive,
      image_url,
      savings_cents: savingsCents > 0 ? savingsCents : null,
    };

    if (validFrom) payload.valid_from = new Date(validFrom).toISOString();
    if (validTo) payload.valid_to = new Date(validTo).toISOString();

    const dl = Number(dailyLimit);
    const tl = Number(totalLimit);
    if (!Number.isNaN(dl) && dl > 0) payload.daily_limit = dl;
    if (!Number.isNaN(tl) && tl > 0) payload.total_limit = tl;

    const { error: insertErr } = await sb.from('offers').insert(payload);
    setSaving(false);

    if (insertErr) {
      setError(insertErr.message);
      return;
    }
    router.push('/admin');
  };

  if (loading) return <div className="p-4">Loading…</div>;
  if (!me || me.role !== 'admin') return <div className="p-4">Admin only.</div>;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Create deal</h1>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {/* Merchant selector with empty state */}
      <label className="block">
        <div className="text-sm mb-1">Merchant</div>

        {merchants.length === 0 ? (
          <div className="text-sm">
            <div className="mb-2 border border-dashed rounded p-2">
              No merchants found.
            </div>
            <a href="/admin/merchant/new" className="underline">Create a merchant</a>
          </div>
        ) : (
          <select
            className="border p-2 rounded w-full"
            value={merchantId}
            onChange={(e) => setMerchantId(e.target.value)}
          >
            {merchants.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}{!m.is_active ? ' (inactive)' : ''}
              </option>
            ))}
          </select>
        )}
      </label>

      <label className="block">
        <div className="text-sm mb-1">Title</div>
        <input
          className="border p-2 rounded w-full"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Free Small Coffee"
        />
      </label>

      <label className="block">
        <div className="text-sm mb-1">Description (optional)</div>
        <textarea
          className="border p-2 rounded w-full"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short blurb"
        />
      </label>

      <label className="block">
        <div className="text-sm mb-1">Terms</div>
        <textarea
          className="border p-2 rounded w-full"
          value={terms}
          onChange={(e) => setTerms(e.target.value)}
          placeholder="One per customer. Today only. Not valid with other offers."
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <div className="text-sm mb-1">Valid from (optional)</div>
          <input
            type="datetime-local"
            className="border p-2 rounded w-full"
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
          />
        </label>
        <label className="block">
          <div className="text-sm mb-1">Valid to (optional)</div>
          <input
            type="datetime-local"
            className="border p-2 rounded w-full"
            value={validTo}
            onChange={(e) => setValidTo(e.target.value)}
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <div className="text-sm mb-1">Daily limit (optional)</div>
          <input
            className="border p-2 rounded w-full"
            value={dailyLimit}
            onChange={(e) => setDailyLimit(e.target.value)}
            placeholder="e.g., 50"
          />
        </label>
        <label className="block">
          <div className="text-sm mb-1">Total limit (optional)</div>
          <input
            className="border p-2 rounded w-full"
            value={totalLimit}
            onChange={(e) => setTotalLimit(e.target.value)}
            placeholder="e.g., 200"
          />
        </label>
      </div>

      <label className="block">
        <div className="text-sm mb-1">Customer saves (AUD, optional)</div>
        <input
          className="border p-2 rounded w-full"
          value={savings}
          onChange={(e) => setSavings(e.target.value)}
          placeholder="e.g., 5.00"
        />
        <div className="text-xs text-gray-500 mt-1">
          Stored as cents: {savingsCents}
        </div>
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        <span>Active</span>
      </label>

      <label className="block">
        <div className="text-sm mb-1">Photo (optional)</div>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
        {imagePreview && (
          <img src={imagePreview} alt="preview" className="mt-2 max-w-xs rounded border" />
        )}
      </label>

      <button
        onClick={submit}
        disabled={saving}
        className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Create deal'}
      </button>
    </div>
  );
}
