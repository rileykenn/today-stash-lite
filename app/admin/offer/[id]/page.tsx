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
  exp_date: string | null;        // ISO
  is_active: boolean;
  total_limit: number | null;
  savings_cents: number | null;
  image_url: string | null;
};

export default function AdminOfferEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // --- form state (mirrors new-create page) ---
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [merchantId, setMerchantId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [terms, setTerms] = useState<string>('');
  const [expDate, setExpDate] = useState<string>(''); // datetime-local value
  const [isActive, setIsActive] = useState<boolean>(true);
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

  // ---- helpers ----
  function toISOFromLocal(local: string): string | null {
    if (!local) return null;
    const d = new Date(local);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  function toLocalFromISO(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
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

    const { error: uploadErr } = await sb.storage
      .from('offer-media')
      .upload(objectPath, f, { upsert: true });
    if (uploadErr) throw uploadErr;

    const { data } = sb.storage.from('offer-media').getPublicUrl(objectPath);
    return data.publicUrl;
  }

  // image preview
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
          setError('Deal not found');
          return;
        }

        const row = offer as OfferRow;

        // populate form
        setMerchantId(row.merchant_id);
        setTitle(row.title ?? '');
        setDescription(row.description ?? '');
        setTerms(row.terms ?? '');
        setExpDate(toLocalFromISO(row.exp_date));
        setIsActive(!!row.is_active);
        setTotalLimit(row.total_limit == null ? '' : String(row.total_limit));
        setSavingsDollars(
          row.savings_cents == null
            ? ''
            : (row.savings_cents / 100).toFixed(2)
        );
        setExistingImageUrl(row.image_url ?? null);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load deal.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
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
      const totalParsed =
        totalLimit.trim() === '' ? null : Number.parseInt(totalLimit, 10);
      if (totalParsed !== null && Number.isNaN(totalParsed)) {
        throw new Error('Total limit must be a whole number');
      }

      // dollars -> cents
      const cents =
        savingsDollars.trim() === ''
          ? null
          : Math.round(Number.parseFloat(savingsDollars) * 100);
      if (cents !== null && Number.isNaN(cents)) {
        throw new Error('Savings must be a valid number (e.g., 5 or 5.50)');
      }

      const payload: Partial<OfferRow> = {
        merchant_id: merchantId,
        title: title.trim(),
        description: description.trim() === '' ? null : description.trim(),
        terms: terms.trim() === '' ? null : terms.trim(),
        exp_date: toISOFromLocal(expDate),
        is_active: isActive,
        total_limit: totalParsed,
        savings_cents: cents,
        image_url: imageUrl,
      };

      const { error: updErr } = await sb
        .from('offers')
        .update(payload)
        .eq('id', String(id));
      if (updErr) throw updErr;

      setSuccess('Deal updated ✅');
      router.push('/admin');
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to update deal';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#05090D] text-white px-6 py-8">
        <div className="max-w-3xl mx-auto">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05090D] text-white px-6 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Edit Deal</h1>
          <Link
            href="/admin"
            className="text-sm text-white/70 hover:text-white underline"
          >
            Back to admin
          </Link>
        </div>

        {error && (
          <div className="mb-3 text-sm text-red-400 bg-red-500/10 border border-red-500/40 rounded-lg px-3 py-2">
            Error: {error}
          </div>
        )}
        {success && (
          <div className="mb-3 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/40 rounded-lg px-3 py-2">
            {success}
          </div>
        )}

        <form
          onSubmit={onSubmit}
          className="space-y-5 rounded-2xl bg-[#0B1117] border border-white/10 p-5"
        >
          {/* Merchant */}
          <label className="block">
            <span className="block text-sm font-medium mb-1">Merchant</span>
            <select
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#14F195]"
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
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#14F195]"
              placeholder="e.g. Free side of fries with any lunch meal"
              required
            />
          </label>

          {/* Description */}
          <label className="block">
            <span className="block text-sm font-medium mb-1">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#14F195]"
              rows={3}
              placeholder="Optional details about how the deal works"
            />
          </label>

          {/* Terms */}
          <label className="block">
            <span className="block text-sm font-medium mb-1">Terms</span>
            <textarea
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#14F195]"
              rows={2}
              placeholder="Optional conditions (e.g. weekdays only, dine-in only)"
            />
          </label>

          {/* Expiry + limits / savings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="block">
              <span className="block text-sm font-medium mb-1">
                Expiry date
              </span>
              <input
                type="datetime-local"
                value={expDate}
                onChange={(e) => setExpDate(e.target.value)}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#14F195]"
              />
            </label>

            <label className="block">
              <span className="block text-sm font-medium mb-1">
                Total limit
              </span>
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                value={totalLimit}
                onChange={(e) => setTotalLimit(e.target.value)}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#14F195]"
                placeholder="e.g. 999"
              />
            </label>

            <label className="block">
              <span className="block text-sm font-medium mb-1">
                Savings per use ($)
              </span>
              <input
                inputMode="decimal"
                value={savingsDollars}
                onChange={(e) => setSavingsDollars(e.target.value)}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#14F195]"
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
              className="h-4 w-4 rounded border border-white/20 bg-white/5"
            />
            <span className="text-sm">Active</span>
          </label>

          {/* Image upload with button */}
          <div>
            <span className="block text-sm font-medium mb-1">
              Deal Image (optional)
            </span>

            <label
              htmlFor="fileInput"
              className="inline-block mt-1 px-4 py-2 rounded-lg bg-[#14F195] text-black font-semibold cursor-pointer hover:opacity-90 text-sm"
            >
              Upload image
            </label>

            <input
              id="fileInput"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) =>
                setFile(
                  e.target.files && e.target.files[0]
                    ? e.target.files[0]
                    : null
                )
              }
            />

            {/* Existing image if no new preview */}
            {existingImageUrl && !filePreview && (
              <div className="mt-3">
                <img
                  src={existingImageUrl}
                  alt="Current"
                  className="w-40 h-40 object-cover rounded-lg border border-white/10"
                />
              </div>
            )}

            {/* New preview overrides existing */}
            {filePreview && (
              <div className="mt-3">
                <img
                  src={filePreview}
                  alt="Preview"
                  className="w-40 h-40 object-cover rounded-lg border border-white/10"
                />
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Link
              href="/admin"
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-emerald-500 text-black font-semibold text-sm hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
