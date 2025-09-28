'use client';

import { useEffect, useMemo, useState } from 'react';
import { sb } from '@/lib/supabaseBrowser';
import { useRouter } from 'next/navigation';

type Me = { user_id: string; role: 'admin' | 'merchant' | 'consumer' };
type Merchant = { id: string; name: string; is_active: boolean };

function uuid() {
  // lightweight uuid for file paths (no external dep)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 15) >> 0;
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

  const [validFrom, setValidFrom] = useState<string>(''); // ISO local datetime
  const [validTo, setValidTo] = useState<string>('');

  const [dailyLimit, setDailyLimit] = useState<string>(''); // optional
  const [totalLimit, setTotalLimit] = useState<string>(''); // optional

  const [savings, setSavings] = useState<string>(''); // dollars input, we convert to cents
  const [isActive, setIsActive] = useState(true);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { setMe(null); setLoading(false); return; }
      const { data } = await sb.from('me').select('*').single();
      setMe((data as Me) ?? null);
      setLoading(false);

      const { data: merch } = await sb.from('merchants')
        .select('id,name,is_active')
        .order('name', { ascending: true });
      setMerchants(merch ?? []);
      if ((merch ?? []).length > 0) setMerchantId(merch![0].id);
    })();
  }, []);

  const savingsCents = useMemo(() => {
    const n = Number(savings.replace(/[^0-9.]/g, ''));
    if (Number.isNaN(n)) return 0;
    return Math.round(n * 100);
  }, [savings]);

  if (loading) return <div className="p-4">Loading…</div>;
  if (!me || me.role !== 'admin') return <div className="p-4">Admin only.</div>;

  const onFile = (f: File | null) => {
    setImageFile(f);
    setImagePreview(f ? URL.createObjectURL(f) : null);
  };

  const submit = async () => {
    setError(null);

    if (!merchantId) { setError('Select a merchant.'); return; }
    if (!title.trim()) { setError('Title is required.'); return; }

    setSaving(true);

    // 1) Upload image (optional)
    let image_url: string | null = null;
    if (imageFile) {
      const ext = imageFile.name.split('.').pop() || 'jpg';
      const objectPath = `${merchantId}/${uuid()}.${ext}`;
      const up = await sb.storage.from('offer-media').upload(objectPath, imageFile, {
        cacheControl: '3600',
        upsert: false,
      });
      if (up.error) { setSaving(false); setError(up.error.message); return; }
      const pub = sb.storage.from('offer-media').getPublicUrl(objectPath);
      image_url = pub.data.publicUrl;
    }

    // 2) Insert offer
    const insertPayload: any = {
      merchant_id: merchantId,
      title: title.trim(),
      description: description.trim() || null,
      terms: terms.trim() || null,
      is_active: isActive,
      image_url,
      savings_cents: savingsCents || null,
    };

    if (validFrom) insertPayload.valid_from = new Date(validFrom).toISOString();
    if (validTo) insertPayload.valid_to = new Date(validTo).toISOString();

    const dl = Number(dailyLimit);
    const tl = Number(totalLimit);
    if (!Number.isNaN(dl) && dl > 0) insertPayload.daily_limit = dl;
    if (!Number.isNaN(tl) && tl > 0) insertPayload.total_limit = tl;

    const { error } = await sb.from('offers').insert(insertPayload);
    setSaving(false);

    if (error) { setError(error.message); return; }
    router.push('/admin'); // back to admin home
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Create deal</h1>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <label className="block">
        <div className="text-sm mb-1">Merchant</div>
        <select
          className="border p-2 rounded w-full"
          value={merchantId}
          onChange={(e) => setMerchantId(e.target.value)}
        >
          {merchants.map(m => (
            <option key={m.id} value={m.id}>
              {m.name}{!m.is_active ? ' (inactive)' : ''}
            </option>
          ))}
        </select>
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
        <div className="text-xs text-gray-500 mt-1">Stored as cents: {savingsCents}</div>
      </label>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
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
