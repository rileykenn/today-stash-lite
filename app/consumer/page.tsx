/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { sb } from '@/lib/supabaseBrowser';
import { useRouter } from 'next/navigation';
import Gold3DBanner from '@/components/Gold3DBanner';

/* =======================
   Types
   ======================= */
type Coupon = {
  id: string;
  title: string;
  terms: string;
  totalValue: number; // dollars
  imageUrl: string | null;
  merchant: {
    name: string;
    logoUrl: string | null;
    addressText: string | null;
  } | null;

  usedCount: number;           // from offers.redeemed_count
  totalLimit: number | null;   // from offers.total_limit (null = unlimited)

  areaKey: string;   // internal key for area/town
  areaLabel: string; // human label for selector
};

type Step = 'instructions' | 'success';

/* =======================
   Helpers
   ======================= */
function isAbsoluteUrl(u: string) {
  return /^https?:\/\//i.test(u);
}
function resolvePublicUrl(maybePath: string | null, bucket = 'offer-media'): string | null {
  if (!maybePath) return null;
  const trimmed = String(maybePath).trim();
  if (!trimmed) return null;
  if (isAbsoluteUrl(trimmed)) return trimmed;
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  return `${base}/storage/v1/object/public/${bucket}/${trimmed.replace(/^\/+/, '')}`;
}
function firstOrNull<T>(val: T | T[] | null | undefined): T | null {
  if (!val) return null as any;
  return Array.isArray(val) ? (val[0] ?? null) : (val as any);
}
function getMerchantName(m: unknown): string {
  const mm = m as Record<string, unknown>;
  return (mm?.name ?? mm?.display_name ?? mm?.title ?? '') as string;
}
function getMerchantLogo(m: unknown): string | null {
  const mm = m as Record<string, unknown>;
  const v =
    (mm?.logo_url as string | null | undefined) ??
    (mm?.photo_url as string | null | undefined) ??
    (mm?.image_url as string | null | undefined) ??
    (mm?.avatar_url as string | null | undefined) ??
    (mm?.logo as string | null | undefined) ??
    (mm?.photo as string | null | undefined) ??
    null;
  return v ?? null;
}
function getMerchantAddress(m: unknown): string | null {
  const mm = m as Record<string, unknown>;
  return (mm?.address_text ?? mm?.address ?? mm?.location ?? null) as string | null;
}
function fmtMoney(v: number) {
  const n = Number.isFinite(v) ? v : 0;
  const needsCents = n % 1 !== 0;
  const core = n.toLocaleString(undefined, {
    minimumFractionDigits: needsCents ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `$${core}`;
}

/* =======================
   Page
   ======================= */
export default function ConsumerDealsPage() {
  const [deals, setDeals] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const router = useRouter();

  /** Returns 'pro' | 'free' | 'unknown' by checking profiles.plan/role and auth metadata. */
  async function getUserRole(): Promise<'pro' | 'free' | 'unknown'> {
    const {
      data: { session },
    } = await sb.auth.getSession();
    if (!session) return 'unknown';

    const { data: prof, error } = await sb
      .from('profiles')
      .select('plan, role')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (!error && prof) {
      const plan = String(prof.plan ?? '').toLowerCase().trim();
      const role = String(prof.role ?? '').toLowerCase().trim();
      if (plan === 'pro' || role === 'pro') return 'pro';
      if (plan === 'free' || role === 'free') return 'free';
    }

    const metaRole = String(
      (session.user.user_metadata?.role ?? session.user.app_metadata?.role ?? '') as string
    )
      .toLowerCase()
      .trim();
    const metaPlan = String(
      (session.user.user_metadata?.plan ?? session.user.app_metadata?.plan ?? '') as string
    )
      .toLowerCase()
      .trim();

    if (metaPlan === 'pro' || metaRole === 'pro') return 'pro';
    if (metaPlan === 'free' || metaRole === 'free') return 'free';

    return 'unknown';
  }

  /** Unified gate: anon -> /signup, free/unknown -> /upgrade, pro -> open modal */
  async function handleShowGate(deal: Coupon) {
    const {
      data: { session },
    } = await sb.auth.getSession();
    if (!session) {
      router.push(`/signup?next=${encodeURIComponent('/consumer')}`);
      return;
    }

    const role = await getUserRole();
    if (role !== 'pro') {
      router.push(`/upgrade?reason=unlock-redemptions&next=${encodeURIComponent('/consumer')}`);
      return;
    }

    openModal(deal);
  }

  // Modal state (for PIN redemption with staff)
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<Step>('instructions');
  const [activeDeal, setActiveDeal] = useState<Coupon | null>(null);

  // PIN flow state
  const [pinInput, setPinInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Area/town gate state
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [accessCode, setAccessCode] = useState('');
  const [areaUnlocked, setAreaUnlocked] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlockLoading, setUnlockLoading] = useState(false);

  // Open/close modal
  const openModal = (deal: Coupon) => {
    setActiveDeal(deal);
    setStep('instructions');
    setPinInput('');
    setSubmitError(null);
    setSubmitting(false);
    setModalOpen(true);
    document.documentElement.style.overflow = 'hidden';
  };
  const closeModal = () => {
    setModalOpen(false);
    setActiveDeal(null);
    setPinInput('');
    setSubmitError(null);
    setSubmitting(false);
    document.documentElement.style.overflow = '';
  };

  // Submit merchant PIN -> redeem
  async function handleRedeemWithPin() {
    if (!activeDeal) return;
    if (!pinInput || pinInput.trim().length < 4) {
      setSubmitError('Ask the staff to enter their full 4-digit PIN.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const { error, data } = await sb.rpc('redeem_offer_with_pin', {
        p_offer_id: activeDeal.id,
        p_pin: pinInput.trim(),
      });

      if (error) {
        console.error('redeem_offer_with_pin failed', error);
        setSubmitError('PIN incorrect or redemption not allowed. Please confirm with staff.');
        setSubmitting(false);
        return;
      }

      // Optionally inspect `data` if your function returns something
      setStep('success');
    } catch (e) {
      console.error(e);
      setSubmitError('Something went wrong. Please try again.');
      setSubmitting(false);
    } finally {
      if (step !== 'success') setSubmitting(false);
    }
  }

  // Fetch deals
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErr(null);

      const { data, error } = await sb
        .from('offers')
        .select(`
    id,
    merchant_id,
    title,
    description,
    terms,
    image_url,
    savings_cents,
    total_limit,
    redeemed_count,
    is_active,
    created_at,
    area_key,
    area_name,
    merchant:merchants(*)
  `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (!mounted) return;

      if (error) {
        setErr(error.message);
        setDeals([]);
        setLoading(false);
        return;
      }

      const mapped: Coupon[] = (data ?? []).map((r: any) => {
        const img = resolvePublicUrl(
          r?.image_url ?? null,
          process.env.NEXT_PUBLIC_OFFER_BUCKET || 'offer-media'
        );
        const mRaw = firstOrNull<any>(r?.merchant);
        const logoPath = getMerchantLogo(mRaw);
        const logoUrl = resolvePublicUrl(
          logoPath,
          process.env.NEXT_PUBLIC_MERCHANT_BUCKET || 'merchant-media'
        );
        const dollars =
          typeof r?.savings_cents === 'number' && Number.isFinite(r.savings_cents)
            ? Math.max(0, Math.round(r.savings_cents) / 100)
            : 0;

        const areaKey: string = String(
          r?.area_key ?? r?.area_slug ?? r?.area ?? r?.area_name ?? 'default'
        )
          .toLowerCase()
          .trim();

        const areaLabel: string = String(
          r?.area_name ?? r?.area_label ?? r?.area ?? 'Local deals'
        );

        return {
          id: String(r.id),
          title: String(r.title ?? ''),
          terms: String(r.terms ?? r.description ?? ''),
          totalValue: dollars,
          imageUrl: img,
          merchant: mRaw
            ? {
                name: getMerchantName(mRaw),
                logoUrl,
                addressText: getMerchantAddress(mRaw),
              }
            : null,
          usedCount: Number.isFinite(r?.redeemed_count) ? Number(r.redeemed_count) : 0,
          totalLimit:
            r?.total_limit === null || r?.total_limit === undefined
              ? null
              : Number(r.total_limit),
          areaKey,
          areaLabel,
        };
      });

      setDeals(mapped);
      setLoading(false);
    })();

    return () => {
      mounted = false;
      document.documentElement.style.overflow = '';
    };
  }, []);

  // Derive unique area options from deals
  const areaOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of deals) {
      if (!map.has(d.areaKey)) {
        map.set(d.areaKey, d.areaLabel);
      }
    }
    return Array.from(map.entries()).map(([key, label]) => ({ key, label }));
  }, [deals]);

  // When areas load, set default selected area
  useEffect(() => {
    if (!selectedArea && areaOptions.length > 0) {
      setSelectedArea(areaOptions[0].key);
    }
  }, [areaOptions, selectedArea]);

  // Reset area unlock when switching area
  useEffect(() => {
    setAreaUnlocked(false);
    setAccessCode('');
    setUnlockError(null);
  }, [selectedArea]);

  // Filter deals by selected area
  const visibleDeals = useMemo(() => {
    if (!selectedArea) return [];
    return deals.filter((d) => d.areaKey === selectedArea);
  }, [deals, selectedArea]);

  // Unlock area with a 4-digit code
  async function handleUnlockArea(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!selectedArea) {
      setUnlockError('Please select a town/area first.');
      return;
    }
    if (!accessCode || accessCode.trim().length < 4) {
      setUnlockError('Enter your 4-digit access code.');
      return;
    }

    setUnlockLoading(true);
    setUnlockError(null);
    try {
      const { data, error } = await sb.rpc('verify_area_access_code', {
        p_area_key: selectedArea,
        p_code: accessCode.trim(),
      });

      if (error) {
        console.error('verify_area_access_code failed', error);
        setUnlockError('Invalid code. Please double-check and try again.');
        setAreaUnlocked(false);
      } else {
        const ok = data === true || data?.ok === true;
        if (!ok) {
          setUnlockError('Invalid code. Please double-check and try again.');
          setAreaUnlocked(false);
        } else {
          setAreaUnlocked(true);
        }
      }
    } catch (e) {
      console.error(e);
      setUnlockError('Something went wrong. Please try again.');
      setAreaUnlocked(false);
    } finally {
      setUnlockLoading(false);
    }
  }

  const body = useMemo(() => {
    if (loading) return <p className="text-gray-300/80 text-sm">Loading deals…</p>;
    if (err)
      return (
        <p className="text-red-300 text-sm">
          Error loading deals: <span className="font-semibold">{err}</span>
        </p>
      );
    if (!areaOptions.length)
      return <p className="text-gray-300/80 text-sm">No active deals yet.</p>;

    return (
      <div className="space-y-8">
        {/* Area selector + access code gate */}
        <form
          onSubmit={handleUnlockArea}
          className="rounded-2xl bg-[#111923] ring-1 ring-white/10 p-4 sm:p-5 space-y-4"
        >
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-white/70 mb-1.5">
                Choose your town / area
              </label>
              <select
                className="w-full h-11 rounded-xl bg-white/5 px-3 text-sm text-white outline-none ring-1 ring-white/15 focus:ring-2 focus:ring-emerald-400/70"
                value={selectedArea ?? ''}
                onChange={(e) => setSelectedArea(e.target.value || null)}
              >
                {areaOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-xs font-medium text-white/70 mb-1.5">
                Enter your 4-digit access code
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={accessCode}
                onChange={(e) =>
                  setAccessCode(
                    e.target.value
                      .replace(/[^\d]/g, '')
                      .slice(0, 6)
                  )
                }
                className="w-full h-11 rounded-xl bg-white/5 px-3 text-base tracking-[0.25em] text-center font-semibold outline-none ring-1 ring-white/15 placeholder:text-white/30 focus:ring-2 focus:ring-emerald-400/70"
                placeholder="••••"
              />
            </div>
          </div>

          {unlockError && <p className="text-xs text-red-400">{unlockError}</p>}

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              type="submit"
              disabled={unlockLoading}
              className="h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed text-sm font-semibold"
            >
              {unlockLoading ? 'Checking code…' : 'Unlock deals for this town'}
            </button>
          </div>
        </form>

        {/* Deals grid */}
        {!areaUnlocked ? (
          <p className="text-gray-300/80 text-sm">
            Enter your access code above to view the available deals in this town.
          </p>
        ) : visibleDeals.length === 0 ? (
          <p className="text-gray-300/80 text-sm">
            No active deals for this town yet. Check back soon.
          </p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {visibleDeals.map((d) => (
              <li key={d.id}>
                <CouponTicket deal={d} onShow={() => handleShowGate(d)} />
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }, [
    loading,
    err,
    areaOptions,
    selectedArea,
    accessCode,
    unlockError,
    unlockLoading,
    areaUnlocked,
    visibleDeals,
  ]);

  return (
    <main className="relative min-h-screen bg-[#0A0F13] overflow-x-hidden">
      {/* subtle blurry blobs (blue bias) */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-[380px] w-[380px] rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 right-[-60px] h-[420px] w-[420px] rounded-full bg-blue-400/10 blur-3xl" />

      {/* Banner */}
      <div className="relative z-10 flex justify-center pt-10 pb-4">
        <Gold3DBanner />
      </div>

      {/* Deals section */}
      <section className="relative mx-auto max-w-5xl px-4 py-8">{body}</section>

      {/* ===== Bottom Sheet Modal (PIN-based redemption) ===== */}
      {modalOpen && (
        <div
          className="
            fixed inset-0 z-[100]
            flex items-end sm:items-center justify-center
            min-h-[100dvh]
          "
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <button
            onClick={closeModal}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label="Close"
          />

          {/* Panel */}
          <div
            className="
              relative w-full max-w-full sm:max-w-md
              rounded-t-3xl sm:rounded-2xl
              bg-[#0D1620] text-white shadow-2xl ring-1 ring-white/10
              pt-3 sm:pt-5
              pb-[calc(env(safe-area-inset-bottom)+16px)]
              px-5 sm:px-6
              max-h-[88dvh] overflow-y-auto overflow-x-hidden
              pointer-events-auto box-border
            "
          >
            {/* Drag handle */}
            <div className="mx-auto mb-2 sm:hidden h-1.5 w-10 rounded-full bg-white/20" />

            {/* Header */}
            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
              {activeDeal?.merchant?.logoUrl && (
                <img
                  src={activeDeal.merchant.logoUrl}
                  alt={activeDeal.merchant.name || 'Merchant'}
                  className="h-10 w-10 rounded-md object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-white/60 truncate">
                  {activeDeal?.merchant?.name ?? 'Merchant'}
                </p>
                <h3 className="text-base font-semibold leading-tight truncate">
                  {activeDeal?.title ?? 'Deal'}
                </h3>
              </div>
              <button
                onClick={closeModal}
                className="ml-auto -m-2 p-2 rounded-md hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/20"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            {step === 'instructions' ? (
              <div className="pt-4 space-y-4">
                <h4 className="text-lg font-semibold">Redeem this deal in-store</h4>

                <ol className="list-decimal list-inside space-y-2 text-[13.5px] leading-relaxed text-white/85">
                  <li>
                    Show this screen to the{' '}
                    <span className="font-semibold text:white">staff at the counter.</span>
                  </li>
                  <li>
                    Ask them to enter their{' '}
                    <span className="font-semibold text-white">4-digit Today&apos;s Stash PIN</span> on
                    your phone.
                  </li>
                  <li>
                    Once the PIN is entered, this deal will be{' '}
                    <span className="font-semibold text-white">marked as redeemed</span> for you.
                  </li>
                </ol>

                <div className="rounded-lg bg-[#12202B] text-xs text-white/70 p-3 ring-1 ring-white/10">
                  Only staff should enter the PIN. Redemptions may be final and limited per member.
                </div>

                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-medium text-white/70">
                    Staff 4-digit PIN
                    <input
                      inputMode="numeric"
                      maxLength={6}
                      value={pinInput}
                      onChange={(e) =>
                        setPinInput(
                          e.target.value
                            .replace(/[^\d]/g, '')
                            .slice(0, 6)
                        )
                      }
                      className="
                        mt-1 w-full h-11 rounded-xl bg-white/5 px-3
                        text-base tracking-[0.25em] text-center font-semibold
                        outline-none ring-1 ring-white/15
                        placeholder:text-white/30
                        focus:ring-2 focus:ring-emerald-400/70
                      "
                      placeholder="••••"
                    />
                  </label>

                  {submitError && (
                    <p className="text-xs text-red-400">{submitError}</p>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                      onClick={handleRedeemWithPin}
                      disabled={submitting}
                      className="
                        h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400
                        disabled:opacity-60 disabled:cursor-not-allowed
                        font-semibold
                      "
                    >
                      {submitting ? 'Redeeming…' : "Staff entered PIN – confirm"}
                    </button>
                    <button
                      onClick={closeModal}
                      className="h-12 rounded-xl bg-white/10 hover:bg-white/15"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="pt-6 space-y-4 text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-400/40">
                  <span className="text-2xl">✅</span>
                </div>
                <h4 className="text-lg font-semibold">Deal redeemed successfully</h4>
                <p className="text-sm text-white/75">
                  This deal has been marked as redeemed on your account. Enjoy your offer at{' '}
                  <span className="font-semibold">
                    {activeDeal?.merchant?.name ?? 'the business'}
                  </span>
                  .
                </p>
                <button
                  onClick={closeModal}
                  className="mt-3 h-11 w-full rounded-xl bg-white/10 hover:bg-white/15 text-sm font-medium"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

/* =======================
   Coupon Ticket
   ======================= */
function CouponTicket({ deal, onShow }: { deal: Coupon; onShow: () => void }) {
  const { title, totalValue, imageUrl, merchant } = deal as any;
  const [expanded, setExpanded] = useState(false);

  // Live numbers
  const rawTotalLimit =
    (deal as any).totalLimit ?? (deal as any).total_limit ?? null;
  const rawUsedCount =
    (deal as any).usedCount ?? (deal as any).redeemed_count ?? 0;

  const used = Math.max(0, Number(rawUsedCount) || 0);
  const total =
    rawTotalLimit === null || rawTotalLimit === undefined
      ? Math.max(used, 1)
      : Math.max(1, Number(rawTotalLimit) || 1);
  const left = Math.max(0, total - used);
  const usedPct = Math.min(100, (used / total) * 100);

  return (
    <article className="relative overflow-hidden rounded-2xl bg-[#13202B] ring-1 ring-white/10 shadow-md">
      {/* Ribbon */}
      {Number.isFinite(totalValue) && totalValue > 0 && (
        <div className="absolute left-0 top-0 z-20 pointer-events-none select-none">
          <div className="absolute -left-7 top-4 w-[120px] -rotate-45 rounded-sm bg-gradient-to-b from-[#e79727] to-[#e5cc4f] py-0.5 text-center text-[10px] font-extrabold text-white shadow-[0_2px_6px_rgba(0,0,0,0.5)]">
            SAVE {fmtMoney(totalValue)}
          </div>
        </div>
      )}

      {/* CTA */}
      <button
        onClick={onShow}
        className="absolute bottom-3 right-3 rounded-full px-3 py-1 text-[12px] font-semibold text-white bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)] active:scale-95 whitespace-nowrap"
      >
        Redeem in store
      </button>

      {/* Grid */}
      <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-3 p-3 min-w-0">
        {/* Image */}
        <div className="w-20 h-20 overflow-hidden rounded-xl bg-white/5">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-xs text-white/60">
              No image
            </div>
          )}
        </div>

        {/* Text */}
        <div className="min-w-0">
          {/* Expandable Title */}
          <div className="flex items-center gap-1">
            <h3
              className={`block w-full min-w-0 text-[17px] font-extrabold leading-tight text-white transition-all duration-300 ${
                expanded ? 'whitespace-normal' : 'truncate'
              }`}
            >
              {title}
            </h3>

            {title?.length > 30 && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="flex-shrink-0 text-white/70 hover:text-white transition-transform duration-300"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`w-3 h-3 ${expanded ? 'rotate-180' : 'rotate-0'} transition-transform duration-300`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>

          {merchant?.name && (
            <p className="block w-full min-w-0 truncate text-[13px] text-white/70">
              {merchant.name}
            </p>
          )}

          {/* Usage + progress bar */}
          <div className="mt-1 mr-[140px]">
            <p className="text-[12px] text-white/60">
              Used: {used} • Left: {left}
            </p>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${usedPct}%`,
                  backgroundImage:
                    'linear-gradient(to right, #10B981 0%, #84CC16 35%, #F59E0B 60%, #FB923C 80%, #EF4444 100%)',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
