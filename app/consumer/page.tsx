/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { sb } from '@/lib/supabaseBrowser';

/* =======================
   Types
   ======================= */
type Merchant = {
  name: string;
  photo_url: string | null;
  address_text: string | null;
};

type OfferRow = {
  id: string;
  title: string;
  terms: string | null;
  total_value: number | null;
  image_url: string | null;
  // Supabase can return a single object or an array depending on how the relation is defined.
  merchant: Merchant | Merchant[] | null;
};

type Coupon = {
  id: string;
  title: string;
  terms: string;
  totalValue: number;
  imageUrl: string | null;
  merchant: {
    name: string;
    photoUrl: string | null;
    addressText: string | null;
  } | null;
};

/* ---------- Helpers ---------- */
function isAbsoluteUrl(u: string) {
  return /^https?:\/\//i.test(u);
}

/** Resolve a public storage path to a full URL if needed. */
function resolvePublicUrl(maybePath: string | null, bucket = 'offer-media'): string | null {
  if (!maybePath) return null;
  const trimmed = maybePath.trim();
  if (isAbsoluteUrl(trimmed)) return trimmed;

  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  return `${base}/storage/v1/object/public/${bucket}/${trimmed.replace(/^\/+/, '')}`;
}

/* Normalize merchant field (object or array) to a single Merchant or null */
function normalizeMerchant(m: OfferRow['merchant']): Merchant | null {
  if (!m) return null;
  if (Array.isArray(m)) return m[0] ?? null;
  return m;
}

/* =======================
   Page
   ======================= */
export default function ConsumerDealsPage() {
  const [deals, setDeals] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setErr(null);

      // Pull real data from Supabase with a merchant join
      const { data, error } = await sb
        .from('offers')
        .select(
          `
          id,
          title,
          terms,
          total_value,
          image_url,
          merchant:merchants (
            name,
            photo_url,
            address_text
          )
        `
        )
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (!mounted) return;

      if (error) {
        setErr(error.message);
        setDeals([]);
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as OfferRow[];

      // Map rows into Coupon UI shape
      const mapped: Coupon[] = rows.map((r) => {
        const imageUrl = resolvePublicUrl(r.image_url, 'offer-media');

        const m = normalizeMerchant(r.merchant);
        const merchPhoto = resolvePublicUrl(m?.photo_url ?? null, 'merchant-media'); // change bucket if needed

        return {
          id: r.id,
          title: r.title,
          terms: r.terms ?? '',
          totalValue: Number.isFinite(r.total_value as number) ? (r.total_value as number) : 0,
          imageUrl,
          merchant: m
            ? {
                name: m.name,
                photoUrl: merchPhoto,
                addressText: m.address_text,
              }
            : null,
        };
      });

      setDeals(mapped);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const content = useMemo(() => {
    if (loading) {
      return <p className="text-blue-100 text-sm">Loading deals…</p>;
    }
    if (err) {
      return (
        <p className="text-red-200 text-sm">
          Error loading deals: <span className="font-medium">{err}</span>
        </p>
      );
    }
    if (deals.length === 0) {
      return <p className="text-blue-100 text-sm">No deals yet.</p>;
    }
    return (
      <ul className="space-y-4">
        {deals.map((d) => (
          <li key={d.id}>
            <CouponCard
              deal={d}
              primaryLabel="Show QR"
              onPrimary={(id) => {
                // TODO: wire your token/QR modal here
              }}
            />
          </li>
        ))}
      </ul>
    );
  }, [loading, err, deals]);

  return (
    <main className="min-h-screen bg-blue-950">
      <section className="mx-auto max-w-4xl px-4 py-6 md:py-10">{content}</section>
    </main>
  );
}

/* =======================
   Coupon Card (inline)
   ======================= */
function CouponCard({
  deal,
  primaryLabel = 'Get Deal',
  onPrimary,
}: {
  deal: Coupon;
  primaryLabel?: string;
  onPrimary?: (id: string) => void;
}) {
  const { id, title, terms, totalValue, imageUrl, merchant } = deal;

  return (
    <article
      className="
        group grid gap-4 rounded-2xl border border-blue-800 bg-blue-900 p-3 shadow-sm
        transition hover:ring-1 hover:ring-green-400/40
        md:grid-cols-[176px,1fr,auto] md:items-stretch md:gap-5 md:p-4
      "
    >
      {/* LEFT: Image (square on mobile, fixed width on md+) */}
      <div className="relative overflow-hidden rounded-xl bg-blue-800">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="
              h-36 w-full object-cover
              md:h-full md:w-[176px] md:object-cover
            "
          />
        ) : (
          <div className="flex h-36 w-full items-center justify-center text-xs text-blue-200 md:h-full md:w-[176px]">
            No image
          </div>
        )}
      </div>

      {/* MIDDLE: Content */}
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-white truncate">{title}</h3>

        {terms && (
          <p className="mt-1 text-sm text-blue-100 overflow-hidden text-ellipsis whitespace-nowrap">
            {terms}
          </p>
        )}

        {/* Merchant row */}
        {merchant && (
          <div className="mt-2 flex items-center gap-2 text-xs text-blue-200">
            {merchant.photoUrl ? (
              <img
                src={merchant.photoUrl}
                alt={`${merchant.name} logo`}
                className="h-5 w-5 rounded-full object-cover"
              />
            ) : (
              <span
                aria-hidden
                className="grid h-5 w-5 place-items-center rounded-full bg-blue-800 text-[10px] text-blue-200"
                title={merchant.name}
              >
                🏪
              </span>
            )}
            <span className="truncate">{merchant.name}</span>
          </div>
        )}

        {/* Total value highlight */}
        <div className="mt-3 inline-flex items-center rounded-full border border-green-400/30 bg-green-500/10 px-2 py-1 text-xs font-medium text-green-300">
          Save up to ${Number.isFinite(totalValue) ? totalValue : 0}
        </div>

        {/* Mobile CTA (stacked) */}
        <div className="mt-4 md:hidden">
          <PrimaryButton
            label={primaryLabel}
            onClick={() => onPrimary?.(id)}
          />
        </div>
      </div>

      {/* RIGHT: Desktop CTA */}
      <div className="hidden md:flex md:items-center">
        <PrimaryButton
          label={primaryLabel}
          onClick={() => onPrimary?.(id)}
        />
      </div>
    </article>
  );
}

/* ---------- UI: Primary Button (Accessible) ---------- */
function PrimaryButton({
  label,
  onClick,
}: {
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        inline-flex h-11 items-center justify-center rounded-lg
        bg-green-500 px-4 text-sm font-semibold text-black
        transition hover:bg-green-600
        focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-2 focus-visible:ring-offset-blue-900
      "
    >
      {label}
    </button>
  );
}
