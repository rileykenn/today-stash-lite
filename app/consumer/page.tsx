/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'react-qr-code';
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

  // live progress fields (data only; UI unchanged)
  usedCount: number;           // from offers.redeemed_count
  totalLimit: number | null;   // from offers.total_limit (null = unlimited)
};
type Step = 'info' | 'qr';

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
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return 'unknown';

  // 1) Prefer your profiles table — note: user_id and plan/role
  const { data: prof, error } = await sb
    .from('profiles')
    .select('plan, role')        // support either column name
    .eq('user_id', session.user.id) // <-- your schema uses user_id
    .maybeSingle();

  if (!error && prof) {
    const plan = String(prof.plan ?? '').toLowerCase().trim();
    const role = String(prof.role ?? '').toLowerCase().trim();
    if (plan === 'pro' || role === 'pro') return 'pro';
    if (plan === 'free' || role === 'free') return 'free';
  }

  // 2) Fallbacks via auth metadata (in case profiles row is missing)
  const metaRole =
    String(session.user.user_metadata?.role ?? session.user.app_metadata?.role ?? '').toLowerCase().trim();
  const metaPlan =
    String(session.user.user_metadata?.plan ?? session.user.app_metadata?.plan ?? '').toLowerCase().trim();

  if (metaPlan === 'pro' || metaRole === 'pro') return 'pro';
  if (metaPlan === 'free' || metaRole === 'free') return 'free';

  return 'unknown';
}

/** Unified gate: anon -> /signup, free/unknown -> /upgrade, pro -> open modal */
async function handleShowGate(deal: Coupon) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    router.push(`/signup?next=${encodeURIComponent('/consumer')}`);
    return;
  }

  const role = await getUserRole();
  // Optional: quick debug
  // console.log('role', role);

  if (role !== 'pro') {
    router.push(`/upgrade?reason=unlock-redemptions&next=${encodeURIComponent('/consumer')}`);
    return;
  }

  openInstructions(deal);
}


  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<Step>('info');
  const [activeDeal, setActiveDeal] = useState<Coupon | null>(null);

  // 90s token + manual code lifecycle
  const [token, setToken] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null); // ms epoch
  const [countdown, setCountdown] = useState<number>(0);
  const isRefreshingRef = useRef(false);

  // Open/close
  const openInstructions = (deal: Coupon) => {
    setActiveDeal(deal);
    setStep('info');
    setModalOpen(true);
    document.documentElement.style.overflow = 'hidden';
  };
  const closeModal = () => {
    setModalOpen(false);
    setActiveDeal(null);
    setToken(null);
    setManualCode(null);
    setExpiresAt(null);
    setCountdown(0);
    document.documentElement.style.overflow = '';
  };

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
  title,
  description,
  terms,
  image_url,
  savings_cents,
  total_limit,
  redeemed_count,
  is_active,
  created_at,
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

          // 👇 wire live progress
          usedCount: Number.isFinite(r?.redeemed_count) ? Number(r.redeemed_count) : 0,
          totalLimit:
            r?.total_limit === null || r?.total_limit === undefined
              ? null
              : Number(r.total_limit),
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

  // Issue a 90s token + manual code for a deal
  async function refreshRedemption(dealId: string) {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    try {
      const { data, error } = await sb.rpc('issue_redemption_token', {
        p_deal_id: dealId,
        p_ttl_seconds: 90,
      });
      if (error) throw error;

      // Supabase RPC returns an array — unwrap first row
      const row = Array.isArray(data) ? data[0] : (data as any);

      const nextToken = row?.token ?? null;
      const nextCode = (row?.manual_code ?? '').toString().toUpperCase() || null;
      const nextExp =
        row?.expires_at ? Date.parse(row.expires_at as string) : Date.now() + 90_000;

      setToken(nextToken);
      setManualCode(nextCode);
      setExpiresAt(nextExp);
    } catch (e) {
      console.error('issue_redemption_token failed', e);
    } finally {
      isRefreshingRef.current = false;
    }
  }

  // Countdown + auto-refresh
  useEffect(() => {
    if (!expiresAt || !activeDeal) return;
    const id = setInterval(() => {
      const sec = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setCountdown(sec);
      if (sec === 0 && activeDeal && !isRefreshingRef.current) {
        void refreshRedemption(activeDeal.id);
      }
    }, 500);
    return () => clearInterval(id);
  }, [expiresAt, activeDeal]);

  // Render list
  const body = useMemo(() => {
    if (loading) return <p className="text-gray-300/80 text-sm">Loading deals…</p>;
    if (err)
      return (
        <p className="text-red-300 text-sm">
          Error loading deals: <span className="font-semibold">{err}</span>
        </p>
      );
    if (deals.length === 0) return <p className="text-gray-300/80 text-sm">No active deals yet.</p>;

    return (
      <ul className="space-y-8">
        {deals.map((d) => (
          <li key={d.id}>
            <CouponTicket deal={d} onShow={() => handleShowGate(d)} />
          </li>
        ))}
      </ul>
    );
  }, [loading, err, deals]);

  return (
  <main className="relative min-h-screen bg-[#0A0F13] overflow-x-hidden">
    {/* subtle blurry blobs (blue bias) */}
    <div className="pointer-events-none absolute -top-24 -left-24 h-[380px] w-[380px] rounded-full bg-blue-500/10 blur-3xl" />
    <div className="pointer-events-none absolute bottom-10 right-[-60px] h-[420px] w-[420px] rounded-full bg-blue-400/10 blur-3xl" />

    {/* ✅ Add the banner here */}
    <div className="relative z-10 flex justify-center pt-10 pb-4">
      <Gold3DBanner />
    </div>

    {/* Deals section */}
    <section className="relative mx-auto max-w-5xl px-4 py-8">{body}</section>

      {/* ===== Mobile-first Bottom Sheet Modal ===== */}
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
            {step === 'info' ? (
              <div className="pt-4 space-y-4">
                <h4 className="text-lg font-semibold">Ready to redeem?</h4>

                <ol className="list-decimal list-inside space-y-2 text-[13.5px] leading-relaxed text-white/85">
                  <li>
                    Head into the business and ask the friendly staff to{' '}
                    <span className="font-semibold text-white">scan your QR code</span>.
                  </li>
                  <li>Keep this screen open — your QR is unique and time-limited.</li>
                  <li>Staff will confirm the discount and complete the redemption.</li>
                </ol>

                <div className="rounded-lg bg-[#12202B] text-xs text-white/70 p-3 ring-1 ring-white/10">
                  Staff must scan your QR or enter your manual code. Codes expire after 90 seconds.
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    onClick={async () => {
                      setStep('qr');
                      if (activeDeal) await refreshRedemption(activeDeal.id);
                    }}
                    className="h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 font-semibold"
                  >
                    I’m at the counter — show my QR
                  </button>
                  <button
                    onClick={closeModal}
                    className="h-12 rounded-xl bg-white/10 hover:bg-white/15"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-white/70">Show this to staff to redeem</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">
                      {countdown > 0 ? `${countdown}s` : 'Expired'}
                    </span>
                    <button
                      onClick={() => activeDeal && refreshRedemption(activeDeal.id)}
                      className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-xs"
                      title="Refresh code"
                    >
                      Refresh
                    </button>
                  </div>
                </div>

                {/* QR */}
                <div className="mx-auto w-full max-w-[280px] rounded-2xl bg-white p-4">
                  <QRCode value={JSON.stringify({ token: token ?? '' })} size={240} />
                </div>

                {/* --- or --- */}
                <div className="relative text-center">
                  <div className="absolute left-0 right-0 top-1/2 h-px bg-white/10" />
                  <span className="relative inline-block bg-[#0D1620] px-3 text-white/60 text-xs">
                    — or —
                  </span>
                </div>

                {/* Manual code */}
                <div className="text-center space-y-2">
                  <p className="text-sm text-white/80">
                    Ask the friendly staff to enter your <span className="font-semibold">manual code</span>:
                  </p>
                  <div className="mx-auto inline-block rounded-xl bg-white/5 ring-1 ring-white/10 px-4 py-3">
                    <code className="tracking-[0.35em] text-2xl font-extrabold">
                      {manualCode ?? '•••••'}
                    </code>
                  </div>
                  <p className="text-xs text-white/60">This code and QR expire in 90 seconds.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => setStep('info')}
                    className="h-12 rounded-xl bg-white/10 hover:bg-white/15"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => activeDeal && refreshRedemption(activeDeal.id)}
                    className="h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-semibold"
                  >
                    Refresh
                  </button>
                </div>
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
/* =======================
   Coupon Ticket
   ======================= */
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
        Show QR
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
          {/* Expandable Title — preserves layout */}
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

          {/* Usage + progress bar (unaltered alignment) */}
          <div className="mt-1 mr-24">
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
