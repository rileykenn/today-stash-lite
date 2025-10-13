'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { sb } from '@/lib/supabaseBrowser';

type Merchant = {
  id: string;
  name: string;
  is_active: boolean;
};

type OfferRow = {
  id: string;
  merchant_id: string;
  title: string;
  description: string | null;
  terms: string | null;
  valid_from: string | null; // ISO
  valid_to: string | null;   // ISO
  is_active: boolean;
  daily_limit: number | null;
  total_limit: number | null;
  savings_cents: number | null;
  image_url: string | null;
};

export default function AdminOfferEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // --- form state (mirrors create page) ---
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [merchantId, setMerchantId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [terms, setTerms] = useState<string>('');
  const [validFrom, setValidFrom] = useState<string>(''); // datetime-local value
  const [validTo, setValidTo] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [dailyLimit, setDailyLimit] = useState<string>(''); // keep as string, parse later
  const [totalLimit, setTotalLimit] = useState<string>('');
  const [savingsDollars, setSavingsDollars] = useState<string>(''); // 500 -> "5.00"
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

  // UX
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ---- helpers (same semantics as create) ----
  function toISOFromLocal(local: string): string | null {
    if (!local) return null;
    const d = new Date(local);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  function toLocalFromISO(iso: string | null): string {
    // convert ISO -> value accepted by <input type="datetime-local">
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    // pad to "YYYY-MM-DDTHH:mm"
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  }

  async function handleUploadToStorage(f: File, merchant: string): Promise<string> {
    const parts = f.name.split('.');
    const ext = parts.length > 1 ? (parts.pop() as string) : 'jpg';
    const objectPath = `offers/${merchant}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadErr } = await sb.storage.from('offer-media').upload(objectPath, f, { upsert: true });
    if (uploadErr) throw uploadErr;

    const { data } = sb.storage.from('offer-media').getPublicUrl(objectPath);
    return data.publicUrl;
  }

  // image preview (same as create)
  useEffect(() => {
    if (!file) {
      setFilePreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setFilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const canSubmit = useMemo(() => {
    return merchantId !== '' && title.trim().length > 0 && !saving && !loading;
  }, [merchantId, title, saving, loading]);

  // Load merchants + offer
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // Merchants
        const { data: mData, error: mErr } = await sb
          .from('merchants')
          .select('id,name,is_active')
          .order('name', { ascending: true });
        if (mErr) throw mErr;
        if (!mounted) return;
        setMerchants((mData ?? []) as Merchant[]);

        // Offer
        const { data: offer, error: oErr } = await sb
          .from('offers')
          .select('*')
          .eq('id', String(id))
          .maybeSingle();
        if (oErr) throw oErr;
        if (!mounted) return;

        if (!offer) {
          setError('Offer not found');
          return;
        }

        const row = offer as OfferRow;

        // populate form
        setMerchantId(row.merchant_id);
        setTitle(row.title ?? '');
        setDescription(row.description ?? '');
        setTerms(row.terms ?? '');
        setValidFrom(toLocalFromISO(row.valid_from));
        setValidTo(toLocalFromISO(row.valid_to));
        setIsActive(!!row.is_active);
        setDailyLimit(row.daily_limit == null ? '' : String(row.daily_limit));
        setTotalLimit(row.total_limit == null ? '' : String(row.total_limit));
        setSavingsDollars(
          row.savings_cents == null
            ? ''
            : (row.savings_cents / 100).toFixed(2).replace(/\.00$/, '.00') // keep two decimals
        );
        setExistingImageUrl(row.image_url ?? null);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load offer.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // optional new image upload
      let imageUrl: string | null = existingImageUrl ?? null;
      if (file) {
        imageUrl = await handleUploadToStorage(file, merchantId);
      }

      // parse numeric inputs
      const dailyParsed = dailyLimit.trim() === '' ? null : Number.parseInt(dailyLimit, 10);
      const totalParsed = totalLimit.trim() === '' ? null : Number.parseInt(totalLimit, 10);
      if (dailyParsed !== null && Number.isNaN(dailyParsed)) throw new Error('Daily limit must be a whole number');
      if (totalParsed !== null && Number.isNaN(totalParsed)) throw new Error('Total limit must be a whole number');

      // dollars -> cents
      const cents =
        savingsDollars.trim() === ''
          ? null
          : Math.round(Number.parseFloat(savingsDollars) * 100);
      if (cents !== null && Number.isNaN(cents)) throw new Error('Savings must be a valid number (e.g., 5 or 5.50)');

      const payload: Partial<OfferRow> = {
        merchant_id: merchantId,
        title: title.trim(),
        description: description.trim() === '' ? null : description.trim(),
        terms: terms.trim() === '' ? null : terms.trim(),
        valid_from: toISOFromLocal(validFrom),
        valid_to: toISOFromLocal(validTo),
        is_active: isActive,
        daily_limit: dailyParsed,
        total_limit: totalParsed,
        savings_cents: cents,
        image_url: imageUrl,
      };

      const { error: updErr } = await sb.from('offers').update(payload).eq('id', String(id));
      if (updErr) throw updErr;

      setSuccess('Offer updated ✅');
      // go back to Admin deals list
      router.push('/admin');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update offer';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-5 max-w-2xl">Loading…</div>;

  return (
    <div className="p-5 max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Edit Deal</h1>
        <Link href="/admin" className="underline">Back to Admin</Link>
      </div>

      {error && <div className="mb-3 text-sm text-red-600">Error: {error}</div>}
      {success && <div className="mb-3 text-sm text-green-600">{success}</div>}

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Merchant */}
        <label className="block">
          <span className="block text-sm font-medium mb-1">Merchant</span>
          <select
            value={merchantId}
            onChange={(e) => setMerchantId(e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            {merchants.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} {m.is_active ? '' : '(inactive)'}
              </option>
            ))}
          </select>
        </label>

        {/* Title */}
        <label className="block">
          <span className="block text-sm font-medium mb-1">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="e.g. Buy 1 Get 1 Free Coffee"
            required
          />
        </label>

        {/* Description */}
        <label className="block">
          <span className="block text-sm font-medium mb-1">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded px-3 py-2"
            rows={3}
            placeholder="Optional details"
          />
        </label>

        {/* Terms */}
        <label className="block">
          <span className="block text-sm font-medium mb-1">Terms</span>
          <textarea
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            className="w-full border rounded px-3 py-2"
            rows={2}
            placeholder="Optional conditions"
          />
        </label>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-sm font-medium mb-1">Valid From</span>
            <input
              type="datetime-local"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </label>

          <label className="block">
            <span className="block text-sm font-medium mb-1">Valid To</span>
            <input
              type="datetime-local"
              value={validTo}
              onChange={(e) => setValidTo(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </label>
        </div>

        {/* Limits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="block">
            <span className="block text-sm font-medium mb-1">Daily Limit</span>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              value={dailyLimit}
              onChange={(e) => setDailyLimit(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="e.g. 50"
            />
          </label>

          <label className="block">
            <span className="block text-sm font-medium mb-1">Total Limit</span>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              value={totalLimit}
              onChange={(e) => setTotalLimit(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="e.g. 200"
            />
          </label>

          <label className="block">
            <span className="block text-sm font-medium mb-1">Savings ($)</span>
            <input
              inputMode="decimal"
              value={savingsDollars}
              onChange={(e) => setSavingsDollars(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="e.g. 5 or 5.50"
            />
          </label>
        </div>

        {/* Active */}
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <span className="text-sm">Active</span>
        </label>

        {/* Image upload */}
        <div>
          <span className="block text-sm font-medium mb-1">Deal Image (optional)</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
          />
          {/* Existing image */}
          {existingImageUrl && !filePreview && (
            <div className="mt-2">
              <img
                src={existingImageUrl}
                alt="Current"
                style={{ width: 160, height: 160, objectFit: 'cover', borderRadius: 8 }}
              />
            </div>
          )}
          {/* New preview */}
          {filePreview && (
            <div className="mt-2">
              <img
                src={filePreview}
                alt="Preview"
                style={{ width: 160, height: 160, objectFit: 'cover', borderRadius: 8 }}
              />
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Link href="/admin" className="px-4 py-2 rounded bg-white/10 hover:bg-white/20">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={!canSubmit}
            className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
