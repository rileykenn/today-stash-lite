'use client';

import { useEffect, useMemo, useState } from 'react';
import { sb } from '@/lib/supabaseBrowser';

type Merchant = {
  id: string;
  name: string;
  is_active: boolean;
};

type OfferInsert = {
  merchant_id: string;
  title: string;
  description: string | null;
  terms: string | null;
  exp_date: string | null;      // maps to offers.exp_date in Supabase
  is_active: boolean;
  total_limit: number | null;
  savings_cents: number | null;
  image_url: string | null;
};

export default function AdminOfferNewPage() {
  // Form state
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [merchantId, setMerchantId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [terms, setTerms] = useState<string>('');
  const [expDate, setExpDate] = useState<string>(''); // HTML datetime-local value
  const [isActive, setIsActive] = useState<boolean>(true);
  const [totalLimit, setTotalLimit] = useState<string>('');
  const [savingsDollars, setSavingsDollars] = useState<string>(''); // e.g. "5.00" -> 500 cents
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  // UX state
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load merchants
  useEffect(() => {
    (async () => {
      const { data, error: err } = await sb
        .from('merchants')
        .select('id,name,is_active')
        .order('name', { ascending: true });

      if (err) {
        setError(err.message);
        return;
      }

      const rows = (data ?? []) as Merchant[];
      setMerchants(rows);

      // default pick first active merchant
      const active = rows.find((m) => m.is_active);
      if (active) setMerchantId(active.id);
    })();
  }, []);

  // Preview selected image
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
    return merchantId !== '' && title.trim().length > 0 && !submitting;
  }, [merchantId, title, submitting]);

  function toISOFromLocal(local: string): string | null {
    // local from <input type="datetime-local"> like "2025-09-23T14:30"
    if (!local) return null;
    const d = new Date(local);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  async function handleUploadToStorage(
    f: File,
    merchant: string
  ): Promise<string> {
    const parts = f.name.split('.');
    const ext = parts.length > 1 ? (parts.pop() as string) : 'jpg';
    const objectPath = `offers/${merchant}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadErr } = await sb.storage
      .from('offer-media')
      .upload(objectPath, f, { upsert: true });

    if (uploadErr) throw uploadErr;

    const { data } = sb.storage.from('offer-media').getPublicUrl(objectPath);
    return data.publicUrl; // full, public HTTPS URL
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Resolve optional image
      let imageUrl: string | null = null;
      if (file) {
        imageUrl = await handleUploadToStorage(file, merchantId);
      }

      // Parse numeric inputs
      const totalParsed =
        totalLimit.trim() === '' ? null : Number.parseInt(totalLimit, 10);

      if (totalParsed !== null && Number.isNaN(totalParsed)) {
        throw new Error('Total limit must be a whole number');
      }

      // Dollars → cents
      const cents =
        savingsDollars.trim() === ''
          ? null
          : Math.round(Number.parseFloat(savingsDollars) * 100);

      if (cents !== null && Number.isNaN(cents)) {
        throw new Error('Savings must be a valid number (e.g., 5 or 5.50)');
      }

      const payload: OfferInsert = {
        merchant_id: merchantId,
        title: title.trim(),
        description: description.trim() === '' ? null : description.trim(),
        terms: terms.trim() === '' ? null : terms.trim(),
        exp_date: toISOFromLocal(expDate),
        is_active: isActive,
        total_limit: totalParsed,
        savings_cents: cents,
        image_url: imageUrl, // FULL PUBLIC URL (null if no image)
      };

      const { error: insertErr } = await sb.from('offers').insert(payload);
      if (insertErr) throw insertErr;

      setSuccess('Deal created successfully 🎉');
      // Reset form (keep merchant selection)
      setTitle('');
      setDescription('');
      setTerms('');
      setExpDate('');
      setIsActive(true);
      setTotalLimit('');
      setSavingsDollars('');
      setFile(null);
      setFilePreview(null);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to create deal';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#05090D] text-white px-6 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Create a New Deal</h1>

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

          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-emerald-500 text-black font-semibold text-sm hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving…' : 'Create Deal'}
          </button>
        </form>
      </div>
    </div>
  );
}
