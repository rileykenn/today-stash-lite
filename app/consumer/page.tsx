/* eslint-disable @next/next/no-img-element */
"use client";

import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { sb } from "@/lib/supabaseBrowser";
import { useRouter } from "next/navigation";
import Gold3DBanner from "@/components/Gold3DBanner";
import jsQR from "jsqr";

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

  usedCount: number; // from offers.redeemed_count
  totalLimit: number | null; // from offers.total_limit (null = unlimited)

  areaKey: string; // internal key for area/town, e.g. "greater-jervis-bay-area"
  areaLabel: string; // human label

  daysLeft?: number | null;
};

type Town = {
  id: string;
  name: string;
  slug: string;
  access_code: string | null;
  is_free: boolean | null;
};

type Step = "instructions" | "success";

/* =======================
   Helpers
   ======================= */

function isAbsoluteUrl(u: string) {
  return /^https?:\/\//i.test(u);
}

function resolvePublicUrl(
  maybePath: string | null,
  bucket = "offer-media"
): string | null {
  if (!maybePath) return null;
  const trimmed = String(maybePath).trim();
  if (!trimmed) return null;
  if (isAbsoluteUrl(trimmed)) return trimmed;
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/${bucket}/${trimmed.replace(
    /^\/+/,
    ""
  )}`;
}

function firstOrNull<T>(val: T | T[] | null | undefined): T | null {
  if (!val) return null as any;
  return Array.isArray(val) ? (val[0] ?? null) : (val as any);
}

function getMerchantName(m: unknown): string {
  const mm = m as Record<string, unknown>;
  return (mm?.name ?? mm?.display_name ?? mm?.title ?? "") as string;
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
  return (mm?.address_text ?? mm?.address ?? mm?.location ?? null) as
    | string
    | null;
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

// Convert a Date to the Sydney calendar date at UTC midnight
function getSydneyDateUTC(d: Date): Date {
  const fmt = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = fmt.formatToParts(d);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);

  return new Date(Date.UTC(year, month - 1, day));
}

function getSydneyToday(): Date {
  return getSydneyDateUTC(new Date());
}

/* =======================
   Page
   ======================= */

export default function ConsumerDealsPage() {
  const router = useRouter();

  // Deals
  const [deals, setDeals] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Towns
  const [towns, setTowns] = useState<Town[]>([]);
  const [selectedArea, setSelectedArea] = useState<string | null>(null); // town.slug

  // Area access gate
  const [accessCode, setAccessCode] = useState("");
  const [areaUnlocked, setAreaUnlocked] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlockLoading, setUnlockLoading] = useState(false);

  // Redemption modal
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<Step>("instructions");
  const [activeDeal, setActiveDeal] = useState<Coupon | null>(null);

  // Flyer code (6-digit code printed under the QR)
  const [flyerCode, setFlyerCode] = useState("");
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /* -----------------------
     Fetch towns
     ----------------------- */

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data, error } = await sb
        .from("towns")
        .select("id, name, slug, access_code, is_free")
        .order("name", { ascending: true });

      if (!mounted) return;
      if (error) {
        console.error("Error loading towns", error);
        setTowns([]);
        return;
      }

      const mapped: Town[] =
        (data ?? []).map((t: any) => ({
          id: String(t.id),
          name: String(t.name ?? ""),
          slug: String(t.slug ?? "").toLowerCase().trim(),
          access_code:
            t.access_code === null || t.access_code === undefined
              ? null
              : String(t.access_code),
          is_free: Boolean(t.is_free),
        })) ?? [];

      setTowns(mapped);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  /* -----------------------
     Fetch deals
     ----------------------- */

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setErr(null);

      const { data, error } = await sb
        .from("offers")
        .select(
          `
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
          exp_date,
          merchant:merchants(*)
        `
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (!mounted) return;

      if (error) {
        console.error("Error loading offers", error);
        setErr(error.message);
        setDeals([]);
        setLoading(false);
        return;
      }

      const todaySydney = getSydneyToday();

      const mappedRaw = (data ?? []).map((r: any) => {
        const img = resolvePublicUrl(
          r?.image_url ?? null,
          process.env.NEXT_PUBLIC_OFFER_BUCKET || "offer-media"
        );
        const mRaw = firstOrNull<any>(r?.merchant);
        const logoPath = getMerchantLogo(mRaw);
        const logoUrl = resolvePublicUrl(
          logoPath,
          process.env.NEXT_PUBLIC_MERCHANT_BUCKET || "merchant-media"
        );
        const dollars =
          typeof r?.savings_cents === "number" &&
          Number.isFinite(r.savings_cents)
            ? Math.max(0, Math.round(r.savings_cents) / 100)
            : 0;

        const areaKey: string = String(
          r?.area_key ?? r?.area_slug ?? r?.area ?? r?.area_name ?? "default"
        )
          .toLowerCase()
          .trim();

        const areaLabel: string = String(
          r?.area_name ?? r?.area_label ?? r?.area ?? "Local deals"
        );

        let daysLeft: number | null = null;
        if (r?.exp_date) {
          const expSydney = getSydneyDateUTC(new Date(r.exp_date));
          const diffMs = expSydney.getTime() - todaySydney.getTime();
          daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

          // If the offer is already expired, don't include it at all
          if (daysLeft < 0) {
            return null;
          }
        }

        return {
          id: String(r.id),
          title: String(r.title ?? ""),
          terms: String(r.terms ?? r.description ?? ""),
          totalValue: dollars,
          imageUrl: img,
          merchant: mRaw
            ? {
                name: getMerchantName(mRaw),
                logoUrl,
                addressText: getMerchantAddress(mRaw),
              }
            : null,
          usedCount: Number.isFinite(r?.redeemed_count)
            ? Number(r.redeemed_count)
            : 0,
          totalLimit:
            r?.total_limit === null || r?.total_limit === undefined
              ? null
              : Number(r.total_limit),
          areaKey,
          areaLabel,
          daysLeft,
        } as Coupon;
      });

      const mapped: Coupon[] = mappedRaw.filter(
        (c): c is Coupon => c !== null
      );

      setDeals(mapped);
      setLoading(false);
    })();

    return () => {
      mounted = false;
      document.documentElement.style.overflow = "";
    };
  }, []);

  /* -----------------------
     Derived data
     ----------------------- */

  const areaOptions = useMemo(
    () =>
      towns.map((t) => ({
        key: t.slug,
        label: t.name,
      })),
    [towns]
  );

  useEffect(() => {
    if (!selectedArea && areaOptions.length > 0) {
      setSelectedArea(areaOptions[0].key);
    }
  }, [areaOptions, selectedArea]);

  useEffect(() => {
    setAreaUnlocked(false);
    setAccessCode("");
    setUnlockError(null);
  }, [selectedArea]);

  const visibleDeals = useMemo(() => {
    if (!selectedArea) return [];
    return deals.filter((d) => d.areaKey === selectedArea);
  }, [deals, selectedArea]);

  const currentTown: Town | undefined = useMemo(
    () => towns.find((t) => t.slug === (selectedArea ?? "")),
    [towns, selectedArea]
  );

  /* -----------------------
     Area unlock
     ----------------------- */

  async function handleUnlockArea(e?: React.FormEvent) {
    if (e) e.preventDefault();

    if (!selectedArea) {
      setUnlockError("Please select a town/area first.");
      return;
    }

    const town = towns.find((t) => t.slug === selectedArea);
    if (!town) {
      setUnlockError("Unknown town. Please try again.");
      return;
    }

    if (!accessCode || accessCode.trim().length < 4) {
      setUnlockError("Enter your 4-digit access code.");
      return;
    }

    setUnlockLoading(true);
    setUnlockError(null);

    try {
      const expected = (town.access_code ?? "").trim();
      if (!expected) {
        setAreaUnlocked(true);
      } else if (expected === accessCode.trim()) {
        setAreaUnlocked(true);
      } else {
        setUnlockError("Invalid code. Please double-check and try again.");
        setAreaUnlocked(false);
      }
    } finally {
      setUnlockLoading(false);
    }
  }

  /* -----------------------
     Redemption flow
     ----------------------- */

  const openModal = (deal: Coupon) => {
    setActiveDeal(deal);
    setStep("instructions");
    setFlyerCode("");
    setLastScanned(null);
    setSubmitError(null);
    setSubmitting(false);
    setModalOpen(true);
    document.documentElement.style.overflow = "hidden";
  };

  const closeModal = () => {
    setModalOpen(false);
    setActiveDeal(null);
    setFlyerCode("");
    setLastScanned(null);
    setSubmitError(null);
    setSubmitting(false);
    document.documentElement.style.overflow = "";
  };

  // Accepts optional override code so QR scan can auto-confirm.
  async function handleConfirmRedemption(codeOverride?: string) {
    if (!activeDeal) return;

    const pin = (codeOverride ?? flyerCode).trim();

    if (!pin || pin.length < 6) {
      setSubmitError("Enter the 6-digit code from the flyer to confirm.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const { error } = await sb.rpc("redeem_offer_with_pin", {
        p_offer_id: activeDeal.id,
        p_pin: pin,
      });

      if (error) {
        console.error("redeem_offer_with_pin failed", error);
        setSubmitError(
          "Code incorrect or redemption not allowed. Please check the flyer and try again."
        );
        setSubmitting(false);
        return;
      }

      setStep("success");
    } catch (e) {
      console.error(e);
      setSubmitError("Something went wrong. Please try again.");
      setSubmitting(false);
    } finally {
      if (step !== "success") setSubmitting(false);
    }
  }

  // When QR is scanned we now auto-confirm redemption.
  function handleQrDetected(value: string) {
    if (step !== "instructions") return;
    const digits = value.replace(/[^\d]/g, "").slice(0, 6);
    if (!digits) return;
    setFlyerCode(digits);
    setLastScanned(digits);
    setSubmitError(null);

    // Auto-confirm the redemption using the scanned code
    void handleConfirmRedemption(digits);
  }

  /**
   * When user taps "Redeem in store":
   * - If not logged in -> /signup
   * - If town is free (is_free = true) -> open modal directly
   * - Else -> send them to /payment?town=slug&deal=id
   */
  async function handleShowGate(deal: Coupon) {
    const {
      data: { session },
    } = await sb.auth.getSession();

    if (!session) {
      router.push(`/signup?next=${encodeURIComponent("/consumer")}`);
      return;
    }

    const town = towns.find((t) => t.slug === (selectedArea ?? ""));
    const isFreeTown = town?.is_free ?? false;

    if (isFreeTown) {
      openModal(deal);
      return;
    }

    const params = new URLSearchParams();
    if (selectedArea) params.set("town", selectedArea);
    params.set("deal", deal.id);
    router.push(`/payment?${params.toString()}`);
  }

  /* -----------------------
     Body content
     ----------------------- */

  const body = useMemo(() => {
    if (loading) return <p className="text-gray-300/80 text-sm">Loading deals…</p>;

    if (err)
      return (
        <p className="text-red-300 text-sm">
          Error loading deals: <span className="font-semibold">{err}</span>
        </p>
      );

    if (!areaOptions.length)
      return <p className="text-gray-300/80 text-sm">No active towns yet.</p>;

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
                value={selectedArea ?? ""}
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
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={accessCode}
                onChange={(e) =>
                  setAccessCode(
                    e.target.value.replace(/[^\d]/g, "").slice(0, 6)
                  )
                }
                className="w-full h-11 rounded-xl bg:white/5 bg-white/5 px-3 text-base tracking-[0.25em] text-center font-semibold outline-none ring-1 ring-white/15 placeholder:text-white/30 focus:ring-2 focus:ring-emerald-400/70"
                placeholder="0000"
              />
            </div>
          </div>

          {currentTown && (
            <p className="text-[11px] text-white/55">
              {currentTown.is_free
                ? "This town is part of our free beta program – you won’t be charged to redeem deals."
                : "This town requires an active membership to redeem deals."}
            </p>
          )}

          {unlockError && <p className="text-xs text-red-400">{unlockError}</p>}

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              type="submit"
              disabled={unlockLoading}
              className="
                h-11 rounded-xl
                bg-emerald-500 hover:bg-emerald-400
                disabled:opacity-60 disabled:cursor-not-allowed
                px-4
                text-sm font-semibold text-white
                whitespace-nowrap
              "
            >
              {unlockLoading ? "Checking code…" : "Unlock deals for this town"}
            </button>
          </div>
        </form>

        {/* Deals grid */}
        {!areaUnlocked ? (
          <p className="text-gray-300/80 text-sm">
            Enter your access code above to view the available deals in this
            town.
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
    currentTown,
  ]);

  /* -----------------------
     Render
     ----------------------- */

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

      {/* ===== Bottom Sheet Modal (QR + code redemption) ===== */}
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
              bg-[#070F18] text-white shadow-2xl ring-1 ring-white/10
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
                  alt={activeDeal.merchant.name || "Merchant"}
                  className="h-10 w-10 rounded-md object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-white/60 truncate">
                  {activeDeal?.merchant?.name ?? "Merchant"}
                </p>
                <h3 className="text-base font-semibold leading-tight truncate">
                  {activeDeal?.title ?? "Deal"}
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
            {step === "instructions" ? (
              <div className="pt-4 space-y-5">
                <h4 className="text-lg font-semibold">
                  Redeem this deal at the counter
                </h4>

                <p className="text-sm text-white/80">
                  When you&apos;re ready to pay,{" "}
                  <span className="font-semibold text-emerald-300">
                    scan the Today&apos;s Stash QR flyer
                  </span>{" "}
                  at the checkout. This confirms you&apos;re in the right store and
                  marks this deal as used on your account.
                </p>

                {/* QR Scanner */}
                <QRScanner onDetected={handleQrDetected} />

                {lastScanned && (
                  <p className="text-[11px] text-emerald-300 text-center pt-1">
                    QR detected · code filled automatically ({lastScanned})
                  </p>
                )}

                {/* Divider */}
                <div className="flex items-center gap-3 pt-2">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                    or
                  </span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                {/* Manual code entry */}
                <div className="space-y-2">
                  <p className="text-xs text-white/75">
                    Having trouble scanning?{" "}
                    <span className="font-semibold">
                      Enter the 6-digit code printed under the QR instead.
                    </span>
                  </p>

                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-white/70 mb-1.5">
                        6-digit flyer code
                      </label>
                      <input
                        inputMode="numeric"
                        maxLength={6}
                        value={flyerCode}
                        onChange={(e) =>
                          setFlyerCode(
                            e.target.value.replace(/[^\d]/g, "").slice(0, 6)
                          )
                        }
                        className="
                          w-full h-11 rounded-xl bg-white/5 px-3
                          text-base tracking-[0.25em] text-center font-semibold
                          outline-none ring-1 ring-white/15
                          placeholder:text-white/30
                          focus:ring-2 focus:ring-emerald-400/70
                        "
                        placeholder="000000"
                      />
                    </div>
                  </div>

                  {submitError && (
                    <p className="text-xs text-red-400 pt-1">{submitError}</p>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <button
                      onClick={() => handleConfirmRedemption()}
                      disabled={submitting}
                      className="
                        h-12 rounded-xl
                        bg-emerald-500 hover:bg-emerald-400
                        disabled:opacity-60 disabled:cursor-not-allowed
                        px-4
                        font-semibold text-white text-sm
                        whitespace-nowrap
                        shadow-[0_0_18px_rgba(16,185,129,0.55)]
                      "
                    >
                      {submitting ? "Confirming…" : "Confirm redemption"}
                    </button>
                    <button
                      onClick={closeModal}
                      className="h-12 rounded-xl bg-white/10 hover:bg-white/15 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="pt-6 pb-2 space-y-4 text-center relative overflow-hidden">
                {/* Confetti */}
                <ConfettiBurst />

                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-400/40">
                  <span className="text-2xl">✅</span>
                </div>

                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                  Show this screen to the staff
                </p>

                {/* Validated offer block for staff to read */}
                <div className="mx-auto mt-2 max-w-sm rounded-xl border border-emerald-400/60 bg-emerald-500/5 px-4 py-3 text-left">
                  <p className="text-[11px] font-semibold text-emerald-300 mb-1">
                    Offer validated
                  </p>
                  <p className="text-sm font-semibold text-white">
                    {activeDeal?.title ?? "Deal"}
                  </p>
                  <p className="text-xs text-white/70 mt-0.5">
                    at{" "}
                    <span className="font-medium">
                      {activeDeal?.merchant?.name ?? "the business"}
                    </span>
                  </p>
                </div>

                <p className="text-sm text-white/75 px-1">
                  This deal has been marked as redeemed on your account. Staff
                  can use this screen to confirm which offer you&apos;re using.
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

  const daysLeft = (deal as any).daysLeft as number | null | undefined;

  let daysLabel: string | null = null;
  if (typeof daysLeft === "number") {
    if (daysLeft > 0) {
      daysLabel = `${daysLeft} days left`;
    } else if (daysLeft === 0) {
      daysLabel = "Expires today";
    } else {
      daysLabel = "Expired";
    }
  }

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
                expanded ? "whitespace-normal" : "truncate"
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
                  className={`w-3 h-3 ${
                    expanded ? "rotate-180" : "rotate-0"
                  } transition-transform duration-300`}
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

          {/* Usage + progress bar + days left */}
          <div className="mt-1 mr-[140px]">
            <p className="text-[12px] text-white/60">
              Used: {used} • Left: {left}
              {daysLabel && <> • {daysLabel}</>}
            </p>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${usedPct}%`,
                  backgroundImage:
                    "linear-gradient(to right, #10B981 0%, #84CC16 35%, #F59E0B 60%, #FB923C 80%, #EF4444 100%)",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

/* =======================
   QR Scanner Component
   ======================= */

function QRScanner({ onDetected }: { onDetected: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    let animationId: number;
    let stream: MediaStream | null = null;
    let stopped = false;

    async function start() {
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        stream = media;
        if (videoRef.current) {
          videoRef.current.srcObject = media;
          await videoRef.current.play();
          setActive(true);
          tick();
        }
      } catch (e) {
        console.error(e);
        setPermissionError("Camera access blocked. Enter the code instead.");
      }
    }

    function tick() {
      if (stopped) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) {
        animationId = requestAnimationFrame(tick);
        return;
      }

      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) {
        animationId = requestAnimationFrame(tick);
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        animationId = requestAnimationFrame(tick);
        return;
      }

      const size = Math.min(w, h);
      const sx = (w - size) / 2;
      const sy = (h - size) / 2;

      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);

      const imageData = ctx.getImageData(0, 0, size, size);
      const qr = jsQR(imageData.data, size, size);
      if (qr && qr.data) {
        onDetected(qr.data);
        // small pause to avoid spamming
        stopped = true;
        setTimeout(() => {
          stopped = false;
          animationId = requestAnimationFrame(tick);
        }, 1500);
      } else {
        animationId = requestAnimationFrame(tick);
      }
    }

    if (typeof navigator !== "undefined" && navigator.mediaDevices) {
      start();
    } else {
      setPermissionError("Camera not available in this browser.");
    }

    return () => {
      stopped = true;
      if (animationId) cancelAnimationFrame(animationId);
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [onDetected]);

  return (
    <div className="w-full flex flex-col items-center gap-2">
      <div className="relative w-64 h-64 max-w-full rounded-3xl overflow-hidden bg-black/60 ring-2 ring-emerald-400/60 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          playsInline
        />
        <canvas ref={canvasRef} className="absolute inset-0 opacity-0" />

        {/* Overlay corners */}
        <div className="absolute inset-3 pointer-events-none">
          <div className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-emerald-400 rounded-tl-xl" />
          <div className="absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-emerald-400 rounded-tr-xl" />
          <div className="absolute left-0 bottom-0 h-6 w-6 border-l-2 border-b-2 border-emerald-400 rounded-bl-xl" />
          <div className="absolute right-0 bottom-0 h-6 w-6 border-r-2 border-b-2 border-emerald-400 rounded-br-xl" />
        </div>
      </div>

      {permissionError ? (
        <p className="text-[11px] text-red-300 text-center">{permissionError}</p>
      ) : (
        <p className="text-[11px] text-white/60 text-center">
          {active
            ? "Align the QR code inside the square."
            : "Starting camera…"}
        </p>
      )}
    </div>
  );
}

/* =======================
   Confetti component
   ======================= */

function ConfettiBurst() {
  const pieces = useMemo(
    () => Array.from({ length: 70 }, (_, i) => i),
    []
  );

  return (
    <>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {pieces.map((i) => {
          const left = Math.random() * 100;
          const delay = Math.random() * 0.4;
          const duration = 0.9 + Math.random() * 0.6;
          const size = 6 + Math.random() * 6;
          const rotate = Math.random() * 360;

          return (
            <span
              key={i}
              className="confetti-piece"
              style={{
                left: `${left}%`,
                animationDelay: `${delay}s`,
                animationDuration: `${duration}s`,
                width: `${size}px`,
                height: `${size}px`,
                transform: `rotate(${rotate}deg)`,
              }}
            />
          );
        })}
      </div>
      <style jsx>{`
        .confetti-piece {
          position: absolute;
          top: -10px;
          border-radius: 999px;
          background: linear-gradient(
            135deg,
            #22c55e,
            #4ade80,
            #bbf7d0
          );
          opacity: 0.9;
          animation-name: confetti-fall;
          animation-timing-function: cubic-bezier(0.25, 0.7, 0.25, 1);
          animation-fill-mode: forwards;
        }

        @keyframes confetti-fall {
          0% {
            transform: translate3d(0, -20px, 0) scale(1) rotate(0deg);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          100% {
            transform: translate3d(0, 260px, 0) scale(0.9) rotate(260deg);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
}
