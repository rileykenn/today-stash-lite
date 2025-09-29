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
  valid_from: string | null; // ISO string (date or datetime)
  valid_to: string | null;   // ISO string
  is_active: boolean;
  daily_limit: number | null;
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
  const [validFrom, setValidFrom] = useState<string>(''); // HTML datetime-local value
  const [validTo, setValidTo] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [dailyLimit, setDailyLimit] = useState<string>(''); // keep as string, parse later
  const [totalLimit, setTotalLimit] = useState<string>('');
  const [savingsDollars, setSavingsDollars] = useState<string>(''); // e.g. "5.00" -> 500 cents
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  // UX state
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load merchants (public read)
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
      setMerchants((data ?? []) as Merchant[]);
      // default pick first active merchant
      const active = (data ?? []).find((m) => (m as Merchant).is_active) as Merchant | undefined;
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
    const ext = parts.length > 1 ? parts.pop() as string : 'jpg';
    const objectPath = `offers/${merchant}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadErr } = await sb
      .storage
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
      const dailyParsed = dailyLimit.trim() === '' ? null : Number.parseInt(dailyLimit, 10);
      const totalParsed = totalLimit.trim() === '' ? null : Number.parseInt(totalLimit, 10);

      if (dailyParsed !== null && Number.isNaN(dailyParsed)) {
        throw new Error('Daily limit must be a whole number');
      }
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
        valid_from: toISOFromLocal(validFrom),
        valid_to: toISOFromLocal(validTo),
        is_active: isActive,
        daily_limit: dailyParsed,
        total_limit: totalParsed,
        savings_cents: cents,
        image_url: imageUrl, // FULL PUBLIC URL (null if no image)
      };

      const { error: insertErr } = await sb.from('offers').insert(payload);
      if (insertErr) throw insertErr;

      setSuccess('Offer created successfully 🎉');
      // Reset form (keep merchant selection)
      setTitle('');
      setDescription('');
      setTerms('');
      setValidFrom('');
      setValidTo('');
      setIsActive(true);
      setDailyLimit('');
      setTotalLimit('');
      setSavingsDollars('');
      setFile(null);
      setFilePreview(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create offer';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-5 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-4">Create a New Deal</h1>

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

        <button
          type="submit"
          disabled={!canSubmit}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Create Offer'}
        </button>
      </form>
    </div>
  );
}
