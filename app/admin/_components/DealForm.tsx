'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { sb } from '@/lib/supabaseBrowser';

type Merchant = { id: string; name: string };

function resolveOfferMediaPublicUrl(maybePath: string | null) {
  if (!maybePath) return null;
  if (/^https?:\/\//i.test(maybePath)) return maybePath;

  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  return `${base}/storage/v1/object/public/offer-media/${maybePath.replace(/^\/+/, '')}`;
}

function isoToDateInput(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(
    2,
    '0',
  )}`;
}

function isoToTimeInput(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function makeIsoFromDateTime(date: string, time: string) {
  if (!date) return null;
  return new Date(`${date}T${time || '00:00'}:00`).toISOString();
}

function toIntOrNull(v: string) {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export default function DealForm({
  offerId,
  onSaved,
}: {
  offerId?: string;
  onSaved?: () => void;
}) {
  const isEdit = Boolean(offerId);

  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [merchantId, setMerchantId] = useState('');

  const [title, setTitle] = useState('');

  // validity window (UI-only for now)
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');

  const [isActive, setIsActive] = useState(true);

  const [totalLimit, setTotalLimit] = useState('');
  const [dailyLimit, setDailyLimit] = useState('');
  const [perUserLimit, setPerUserLimit] = useState('');
  const [savingsCents, setSavingsCents] = useState('');

  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const imagePreviewUrl = useMemo(() => resolveOfferMediaPublicUrl(imagePath), [imagePath]);

  // merchants
  useEffect(() => {
    (async () => {
      const { data, error } = await sb.from('merchants').select('id,name').order('name').limit(1000);
      if (error) {
        console.error('MERCHANTS FETCH ERROR:', error);
        setMerchants([]);
        return;
      }
      setMerchants((data as Merchant[]) ?? []);
    })();
  }, []);

  // load deal for edit
  useEffect(() => {
    if (!offerId) return;

    (async () => {
      const { data, error } = await sb
        .from('offers')
        .select(
          'merchant_id,title,exp_date,is_active,total_limit,daily_limit,per_user_limit,savings_cents,image_url',
        )
        .eq('id', offerId)
        .single();

      if (error) {
        console.error('OFFER FETCH ERROR:', error);
        return;
      }
      if (!data) return;

      setMerchantId(data.merchant_id ?? '');
      setTitle(data.title ?? '');
      setIsActive(data.is_active !== false);

      // using exp_date as "valid to" for now
      setEndDate(isoToDateInput(data.exp_date));
      setEndTime(isoToTimeInput(data.exp_date));

      setTotalLimit(data.total_limit?.toString() ?? '');
      setDailyLimit(data.daily_limit?.toString() ?? '');
      setPerUserLimit(data.per_user_limit?.toString() ?? '');
      setSavingsCents(data.savings_cents?.toString() ?? '');

      setImagePath((data as any).image_url ?? null);
    })();
  }, [offerId]);

  // image upload
  const uploadImage = async (file: File) => {
    setImageBusy(true);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const idPart = offerId ?? crypto.randomUUID();
      const safeTitle = (title || 'deal')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const path = `offers/${idPart}/${safeTitle || 'deal'}-${Date.now()}.${ext}`;

      const { error: upErr } = await sb.storage.from('offer-media').upload(path, file, {
        upsert: true,
        contentType: file.type,
      });

      if (upErr) {
        alert('Upload failed: ' + upErr.message);
        return;
      }

      setImagePath(path);

      // if editing, persist immediately
      if (offerId) {
        const { error: updErr } = await sb.from('offers').update({ image_url: path }).eq('id', offerId);
        if (updErr) console.warn('image_url update failed:', updErr.message);
      }
    } finally {
      setImageBusy(false);
    }
  };

  const removeImage = async () => {
    setImageBusy(true);
    try {
      if (offerId) {
        const { error } = await sb.from('offers').update({ image_url: null }).eq('id', offerId);
        if (error) console.warn('remove image_url failed:', error.message);
      }
      setImagePath(null);
    } finally {
      setImageBusy(false);
    }
  };

  const onSave = async () => {
    setErrorMsg(null);

    if (!merchantId) return setErrorMsg('Select a merchant.');
    if (!title.trim()) return setErrorMsg('Enter a deal title.');

    setSaving(true);

    const payload: Record<string, any> = {
      merchant_id: merchantId,
      title: title.trim(),
      is_active: isActive,

      // existing column you already have
      exp_date: makeIsoFromDateTime(endDate, endTime),

      total_limit: toIntOrNull(totalLimit),
      daily_limit: toIntOrNull(dailyLimit),
      per_user_limit: toIntOrNull(perUserLimit),
      savings_cents: toIntOrNull(savingsCents),

      image_url: imagePath,
    };

    // NOTE: startDate/startTime are UI-only for now (you said DB columns later)

    const res = offerId
      ? await sb.from('offers').update(payload).eq('id', offerId)
      : await sb.from('offers').insert(payload);

    if (res.error) {
      setSaving(false);
      setErrorMsg(res.error.message);
      return;
    }

    setSaving(false);
    onSaved?.();
  };

  return (
    <div className="space-y-4">
      {errorMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Merchant + Active */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className="text-sm font-medium">Merchant</label>
          <select
            value={merchantId}
            onChange={(e) => setMerchantId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 bg-white"
          >
            <option value="">Select merchant…</option>
            {merchants.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Active</label>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm text-slate-600">{isActive ? 'On' : 'Off'}</span>
          </div>
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="text-sm font-medium">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 bg-white"
          placeholder="e.g., Free muffin with any two large coffees"
        />
      </div>

      {/* Validity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Valid from</label>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white"
            />
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Valid to (expires)</label>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white"
            />
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Deal image */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Deal image</div>
            <div className="text-xs text-slate-600">Upload an image or remove the current one.</div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={imageBusy}
              className="px-3 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:opacity-95 disabled:opacity-60"
            >
              Upload
            </button>
            <button
              type="button"
              onClick={removeImage}
              disabled={imageBusy || !imagePath}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold disabled:opacity-60"
            >
              Remove
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadImage(f);
            // reset so same file can be chosen again
            if (e.target) e.target.value = '';
          }}
        />

        {imagePreviewUrl ? (
          <div className="mt-3 flex items-center gap-3">
            <div className="w-16 h-16 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreviewUrl} alt="" className="w-full h-full object-cover" />
            </div>
          </div>
        ) : (
          <div className="mt-3 text-sm text-slate-500">No image</div>
        )}
      </div>

      {/* Limits */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div>
          <label className="text-sm font-medium">Total limit</label>
          <input
            value={totalLimit}
            onChange={(e) => setTotalLimit(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 bg-white"
            placeholder="e.g., 120"
            inputMode="numeric"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Daily limit</label>
          <input
            value={dailyLimit}
            onChange={(e) => setDailyLimit(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 bg-white"
            placeholder="e.g., 10"
            inputMode="numeric"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Per-user limit</label>
          <input
            value={perUserLimit}
            onChange={(e) => setPerUserLimit(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 bg-white"
            placeholder="e.g., 1"
            inputMode="numeric"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Savings (cents)</label>
          <input
            value={savingsCents}
            onChange={(e) => setSavingsCents(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 bg-white"
            placeholder="e.g., 300"
            inputMode="numeric"
          />
          <div className="mt-1 text-xs text-slate-500">
            {toIntOrNull(savingsCents) ? `${toIntOrNull(savingsCents)} = $${(Number(savingsCents) / 100).toFixed(2)}` : ' '}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <button
          onClick={onSave}
          disabled={saving}
          className="px-3 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:opacity-95 disabled:opacity-60"
        >
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create deal'}
        </button>
      </div>
    </div>
  );
}
