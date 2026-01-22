"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sb } from "@/lib/supabaseBrowser";
import Loading from "@/components/Loading";

/* =======================
   Types
   ======================= */

type Merchant = {
  id: string;
  name: string;
};

type RedemptionRow = {
  id: string;
  redeemed_at: string | null;
  user_id: string | null;
  offer_id: string | null;
};

type OfferLite = {
  id: string;
  title: string;
  savings_cents: number | null;
};

type ProfileLite = {
  user_id: string;
  email: string | null;
};

type EnrichedRedemption = {
  id: string;
  redeemed_at: string | null;
  customerEmail: string | null;
  offerTitle: string;
  savingsCents: number;
};

type MerchantApplication = {
  id: string;
  created_at: string;
  status: string;
  business_name: string;
};

type MerchantOffer = {
  id: string;
  title: string;
  description: string;
  price_cents: number;
  original_price_cents: number;
  savings_cents: number;
  valid_until: string | null;
  total_limit: number | null;
  recurring_schedule: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  redemptions: { count: number }[];
};

type State =
  | { status: "loading" }
  | { status: "not-logged-in" }
  | { status: "not-merchant" }
  | { status: "application-pending"; app: MerchantApplication }
  | {
    status: "ready";
    merchant: Merchant;
    totalRedemptions: number;
    uniqueCustomers: number;
    estimatedRevenueCents: number;
    redemptions: EnrichedRedemption[];
    merchantOffers: MerchantOffer[];
    error: string | null;
  };

/* =======================
   Helpers
   ======================= */

function formatMoneyAUD(cents: number) {
  const dollars = (cents || 0) / 100;
  return dollars.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatDateTime(dt: string | null) {
  if (!dt) return "-";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-AU", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/* =======================
   Page
   ======================= */

export default function MerchantDashboardPage() {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const {
        data: { session },
      } = await sb.auth.getSession();

      if (!session) {
        if (!cancelled) setState({ status: "not-logged-in" });
        return;
      }

      const userId = session.user.id;

      const { data: profile, error: profileErr } = await sb
        .from("profiles")
        .select("user_id, email, merchant_id, role")
        .eq("user_id", userId)
        .maybeSingle();

      if (profileErr) {
        if (!cancelled)
          setState({
            status: "ready",
            merchant: { id: "", name: "" },
            totalRedemptions: 0,
            uniqueCustomers: 0,
            estimatedRevenueCents: 0,
            redemptions: [],
            merchantOffers: [],
            error: "Failed to load profile/merchant data.",
          });
        console.error("profiles query error:", profileErr);
        return;
      }

      // If not a merchant, check if they have a PENDING application
      if (!profile || !profile.merchant_id || profile.role !== "merchant") {

        // Check for application
        const { data: appData } = await sb
          .from("applications")
          .select("*")
          .eq("user_id", userId)
          // We might want to get the latest one
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (appData) {
          // User has an application
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (!cancelled) setState({ status: "application-pending", app: appData as any });
          return;
        }

        if (!cancelled) setState({ status: "not-merchant" });
        return;
      }

      const merchantId = String(profile.merchant_id);

      const { data: merchantRow, error: merchantErr } = await sb
        .from("merchants")
        .select("id, name")
        .eq("id", merchantId)
        .maybeSingle();

      if (merchantErr || !merchantRow) {
        if (!cancelled)
          setState({
            status: "ready",
            merchant: { id: merchantId, name: merchantRow?.name ?? "" },
            totalRedemptions: 0,
            uniqueCustomers: 0,
            estimatedRevenueCents: 0,
            redemptions: [],
            merchantOffers: [],
            error: "Failed to load merchant data.",
          });
        console.error("merchants query error:", merchantErr);
        return;
      }

      // Fetch offers
      const { data: offersData, error: offersFetchErr } = await sb
        .from('offers')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false });

      if (offersFetchErr) {
        console.error("Error fetching offers with count:", offersFetchErr);
      }

      const merchant: Merchant = {
        id: merchantRow.id,
        name: merchantRow.name ?? "Your venue",
      };

      const {
        data: redemptionRows,
        error: redErr,
        status: redStatus,
      } = await sb
        .from("redemptions")
        .select("id, redeemed_at, user_id, offer_id, merchant_id")
        .eq("merchant_id", merchant.id)
        .order("redeemed_at", { ascending: false })
        .limit(50);

      if (redErr && redStatus !== 406) {
        if (!cancelled)
          setState({
            status: "ready",
            merchant,
            totalRedemptions: 0,
            uniqueCustomers: 0,
            estimatedRevenueCents: 0,
            redemptions: [],
            merchantOffers: [],
            error: "Failed to load redemptions.",
          });
        console.error("redemptions query error:", redErr);
        return;
      }

      const redRows: RedemptionRow[] = redemptionRows ?? [];

      if (redRows.length === 0) {
        if (!cancelled)
          setState({
            status: "ready",
            merchant,
            totalRedemptions: 0,
            uniqueCustomers: 0,
            estimatedRevenueCents: 0,
            redemptions: [],
            merchantOffers: [],
            error: null,
          });
        return;
      }

      const offerIds = Array.from(
        new Set(
          redRows
            .map((r) => r.offer_id)
            .filter((v): v is string => Boolean(v && v.length))
        )
      );

      const offersMap = new Map<string, OfferLite>();
      if (offerIds.length > 0) {
        const { data: offers, error: offersErr } = await sb
          .from("offers")
          .select("id, title, savings_cents")
          .in("id", offerIds);

        if (offersErr) {
          console.error("offers query error:", offersErr);
        } else if (offers) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const o of offers as any[]) {
            offersMap.set(String(o.id), {
              id: String(o.id),
              title: String(o.title ?? ""),
              savings_cents:
                typeof o.savings_cents === "number" ? o.savings_cents : 0,
            });
          }
        }
      }

      const userIds = Array.from(
        new Set(
          redRows
            .map((r) => r.user_id)
            .filter((v): v is string => Boolean(v && v.length))
        )
      );

      const profileMap = new Map<string, ProfileLite>();
      if (userIds.length > 0) {
        const { data: profiles, error: profErr } = await sb
          .from("profiles")
          .select("user_id, email")
          .in("user_id", userIds);

        if (profErr) {
          console.error("profiles (for customers) query error:", profErr);
        } else if (profiles) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const p of profiles as any[]) {
            profileMap.set(String(p.user_id), {
              user_id: String(p.user_id),
              email: p.email ? String(p.email) : null,
            });
          }
        }
      }

      const enriched: EnrichedRedemption[] = redRows.map((r) => {
        const offer = r.offer_id ? offersMap.get(r.offer_id) : undefined;
        const prof = r.user_id ? profileMap.get(r.user_id) : undefined;

        return {
          id: r.id,
          redeemed_at: r.redeemed_at,
          customerEmail: prof?.email ?? null,
          offerTitle: offer?.title ?? "Offer",
          savingsCents: offer?.savings_cents ?? 0,
        };
      });

      const totalRedemptions = enriched.length;
      const uniqueCustomers = new Set(
        redRows.map((r) => r.user_id).filter(Boolean)
      ).size;

      const estimatedRevenueCents = enriched.reduce(
        (sum, r) => sum + (r.savingsCents || 0),
        0
      );

      if (!cancelled)
        setState({
          status: "ready",
          merchant,
          totalRedemptions,
          uniqueCustomers,
          estimatedRevenueCents,
          redemptions: enriched,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          merchantOffers: (offersData ?? []) as any[],
          error: null,
        });
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [router]);

  /* =======================
     Render
     ======================= */

  if (state.status === "loading") {
    return <Loading message="Loading Merchant Dashboard..." />;
  }

  if (state.status === "not-logged-in") {
    return (
      <main className="min-h-screen bg-[#05070A] text-white">
        <section className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
          <h1 className="text-2xl font-bold mb-2">Merchant dashboard</h1>
          <p className="text-sm text-white/70">
            Please sign in to access the merchant dashboard.
          </p>
          <button
            type="button"
            onClick={() => router.push("/signin?next=/merchant-dashboard")}
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400"
          >
            Go to sign-in
          </button>
        </section>
      </main>
    );
  }

  // ✅ NEW: Pending Application View
  if (state.status === "application-pending") {
    const { app } = state;
    const status = app.status || "pending";
    const isDenied = status === 'denied';
    const isApproved = status === 'approved'; // Should rarely hit this if role update worked, but possible sync issue

    return (
      <main className="min-h-screen bg-[#05070A] text-white">
        <section className="max-w-xl mx-auto px-4 py-20">
          <div className={`rounded-2xl border ${isDenied ? 'border-red-500/30' : 'border-emerald-500/30'} bg-[#101822] p-8 space-y-6 text-center`}>
            <div className="flex justify-center text-4xl mb-4">
              {isDenied ? '❌' : (isApproved ? '✅' : '⏳')}
            </div>

            <h1 className="text-2xl font-bold">
              {isDenied ? 'Application Denied' : (isApproved ? 'Application Approved' : 'Application Received')}
            </h1>

            <p className="text-white/70">
              {isDenied
                ? "Sorry, your merchant application was not approved at this time."
                : "Thanks for registering! We've received your details and our team is reviewing them."}
            </p>

            <div className="bg-white/5 rounded-xl p-4 text-left space-y-3 text-sm mt-6">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-white/50">Business Name</span>
                <span className="font-medium">{app.business_name}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-white/50">Status</span>
                <span className={`font-medium px-2 py-0.5 rounded text-xs ${status === 'denied' ? 'bg-red-500/20 text-red-400' :
                  status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                    'bg-amber-500/20 text-amber-400'
                  }`}>
                  {status.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Submitted</span>
                <span>{formatDateTime(app.created_at)}</span>
              </div>
            </div>

            {isDenied && (
              <button
                onClick={() => router.push('/venue-register')}
                className="w-full bg-white/10 hover:bg-white/20 text-white rounded-xl py-3 font-semibold transition"
              >
                Submit New Application
              </button>
            )}

            {!isDenied && !isApproved && (
               <button
                 onClick={() => router.push('/contactsupport')}
                 className="w-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl py-3 text-sm transition"
               >
                 Contact Support / Request Edit
               </button>
            )}
          </div>
        </section>
      </main>
    )
  }

  if (state.status === "not-merchant") {
    return (
      <main className="min-h-screen bg-[#05070A] text-white">
        <section className="max-w-lg mx-auto px-4 py-20">
          <div className="rounded-2xl bg-[#101822] border border-amber-500/40 p-6 space-y-4">
            <h1 className="text-xl font-semibold">You&apos;re not a merchant</h1>
            <p className="text-sm text-white/75">
              This dashboard is only for businesses that partner with Today&apos;s
              Stash.
            </p>
            <p className="text-sm text-white/70">
              Want to become a merchant? Register your business below and we&apos;ll
              walk you through how Today&apos;s Stash can bring you more customers
              and repeat visits.
            </p>

            {/* Updated button */}
            <button
              type="button"
              onClick={() => router.push("/venue-register")}
              className="mt-2 inline-flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400"
            >
              Register as a business
            </button>
          </div>
        </section>
      </main>
    );
  }


  const {
    merchant,
    totalRedemptions,
    uniqueCustomers,
    estimatedRevenueCents,
    redemptions,
    error,
  } = state;

  // Split offers into active and expired
  const now = new Date();
  const activeOffers = state.merchantOffers.filter((o: MerchantOffer) => {
    if (!o.valid_until) return true; // Assume active if no expiry? Or maybe hidden.
    return new Date(o.valid_until) > now;
  });
  const expiredOffers = state.merchantOffers.filter((o: MerchantOffer) => {
    if (!o.valid_until) return false;
    return new Date(o.valid_until) <= now;
  });

  return (
    <main className="min-h-screen bg-[#05070A] text-white">
      <section className="max-w-6xl mx-auto px-4 pb-16 pt-10">
        {/* Top heading row */}
        <header className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-10">
          <div className="max-w-xl">
            <p className="text-xs uppercase tracking-[0.22em] text-emerald-400/80 mb-1">
              Merchant dashboard
            </p>
            <h1 className="text-3xl font-bold">{merchant.name}</h1>
            <p className="text-sm text-white/70 mt-2">
              Live view of how Today&apos;s Stash is performing for your business.
              Track redemptions, new customers, and revenue generated through
              your in-store deals.
            </p>
          </div>

          {/* QR poster info + button */}
          <div className="w-full lg:w-auto">
            <div className="rounded-2xl border border-white/10 bg-[#0B1118] px-5 py-4 max-w-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60 mb-1">
                In-store QR poster
              </p>
              <p className="text-[12px] text-white/65 mb-3">
                Print a single QR code for your counter. Members scan to redeem
                any Today&apos;s Stash deal at your venue. No PINs, no staff
                interaction, zero friction.
              </p>
              <button
                type="button"
                onClick={() => router.push(`/merchant-qr-poster?merchantId=${merchant.id}`)}
                className="mt-2 mb-2 w-full rounded-lg bg-white/10 py-2 text-xs font-medium text-white hover:bg-white/15 transition"
              >
                Generate QR poster (A4)
              </button>

              <button
                type="button"
                onClick={() => router.push("/merchant-dashboard/ai-deal")}
                className="mt-2 mb-2 w-full rounded-lg bg-emerald-500/10 py-2 text-xs font-medium text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition flex items-center justify-center gap-1"
              >
                <span>✨</span> New Deal (AI)
              </button>

              <button
                type="button"
                onClick={() => router.push("/merchant-dashboard/create-deal")}
                className="mt-3 inline-flex items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.45)] hover:bg-blue-500 whitespace-nowrap w-full"
              >
                + Create New Deal
              </button>

              <button
                type="button"
                onClick={() => router.push("/merchant-dashboard/settings")}
                className="mt-2 w-full rounded-lg bg-white/5 py-2 text-xs font-medium text-white hover:bg-white/10 transition flex items-center justify-center gap-1 border border-white/5"
              >
                ⚙️ Venue Settings
              </button>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-5 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-xs text-red-100">
            {error}
          </div>
        )}

        {/* Stats row */}
        <div className="grid gap-4 md:gap-6 md:grid-cols-3 mb-8">
          <StatCard
            label="Total redemptions"
            value={totalRedemptions.toString()}
            helper="Number of offers redeemed through Today’s Stash."
          />
          <StatCard
            label="Unique customers"
            value={uniqueCustomers.toString()}
            helper="Distinct members who have redeemed at your venue."
          />
          <StatCard
            label="Estimated revenue driven"
            value={formatMoneyAUD(estimatedRevenueCents)}
            helper="Based on the value of redeemed offers. Does not include upsell spend on the day."
          />
        </div>

        {/* My Active Deals */}
        <section className="rounded-2xl border border-white/10 bg-[#0B1118] overflow-hidden mb-8">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-emerald-500/5">
            <div>
              <h2 className="text-sm font-semibold text-emerald-400">Active Deals</h2>
              <p className="text-[11px] text-white/45 mt-0.5">
                Currently live and visible to customers.
              </p>
            </div>
            <div className="text-[11px] text-emerald-400/70 font-medium bg-emerald-500/10 px-2 py-1 rounded-full">
              {activeOffers.length} active
            </div>
          </div>

          {activeOffers.length === 0 ? (
            <div className="px-5 py-6 text-sm text-white/65">
              No active deals. Create one to get started!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
              {activeOffers.map((offer: MerchantOffer) => {
                const isRecurring = offer.recurring_schedule && offer.recurring_schedule.length > 0;
                const expiry = offer.valid_until ? new Date(offer.valid_until) : null;

                // Calculate Remaining
                const totalLimit = offer.total_limit || 0;
                const redeemedCount = offer.redemptions?.[0]?.count || 0;
                const remaining = Math.max(0, totalLimit - redeemedCount);

                // Format Recurring Days
                let recurringDays = "";
                if (isRecurring) {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const days = offer.recurring_schedule.map((s: any) => s.day.substring(0, 3));
                  // Capitalize first letter
                  const formattedDays = days.map((d: string) => d.charAt(0).toUpperCase() + d.slice(1));
                  recurringDays = formattedDays.join(", ");
                }

                return (
                  <div key={offer.id} className="bg-white/5 rounded-xl p-4 border border-white/5 flex flex-col justify-between group hover:border-white/10 transition-colors">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-white text-sm">{offer.title}</h3>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${isRecurring ? 'border-blue-500/30 text-blue-300 bg-blue-500/10' : 'border-purple-500/30 text-purple-300 bg-purple-500/10'}`}>
                          {isRecurring ? 'Recurring' : 'Today Only'}
                        </span>
                      </div>

                      {isRecurring && (
                        <p className="text-[10px] text-blue-200/70 mb-2 truncate">
                          Runs on: {recurringDays}
                        </p>
                      )}

                      <p className="text-xs text-white/60 line-clamp-2 mb-3 min-h-[2.5em]">{offer.description}</p>

                      <div className="flex items-center gap-3 mb-3 text-sm">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-white/40 uppercase">Deal Price</span>
                          <span className="font-bold text-emerald-400">{formatMoneyAUD(offer.price_cents)}</span>
                        </div>
                        <div className="w-px h-6 bg-white/10"></div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-white/40 uppercase">Original</span>
                          <span className="text-white/60 line-through decoration-white/30">{formatMoneyAUD(offer.original_price_cents)}</span>
                        </div>
                      </div>

                      {expiry && (
                        <div className="text-[10px] text-white/40 flex items-center gap-1.5 bg-white/5 px-2 py-1.5 rounded-lg mb-3">
                          <span>🕒</span>
                          <span>Expires: {formatDateTime(offer.valid_until)}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 text-[10px] text-emerald-400/80 bg-emerald-500/5 px-2 py-1.5 rounded-lg border border-emerald-500/10 mb-1 w-fit">
                        <span>🔥</span>
                        <span>{remaining} left of {totalLimit}</span>
                      </div>
                    </div>
                    <div className="flex justify-end pt-3 border-t border-white/5">
                      <button
                        onClick={() => router.push(`/merchant-dashboard/create-deal?id=${offer.id}`)}
                        className="text-xs font-medium text-white/70 hover:text-white transition flex items-center gap-1"
                      >
                        <span>✏️</span> Edit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Expired Deals */}
        <section className="rounded-2xl border border-white/10 bg-[#0B1118] overflow-hidden mb-8 opacity-80 hover:opacity-100 transition-opacity">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-white/5">
            <div>
              <h2 className="text-sm font-semibold text-gray-400">Expired / Past Deals</h2>
              <p className="text-[11px] text-white/30 mt-0.5">
                Deals that have ended. Re-use them to save time.
              </p>
            </div>
            <div className="text-[11px] text-white/30">
              {expiredOffers.length} expired
            </div>
          </div>

          {expiredOffers.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
              {expiredOffers.map((offer: MerchantOffer) => (
                <div key={offer.id} className="bg-black/20 rounded-xl p-4 border border-white/5 flex flex-col justify-between grayscale-[0.3] hover:grayscale-0 transition-all">
                  <div>
                    <h3 className="font-semibold text-gray-300 text-sm mb-1">{offer.title}</h3>
                    <div className="flex gap-3 text-xs text-gray-500 mb-2">
                      <span>{formatMoneyAUD(offer.price_cents)}</span>
                      <span className="line-through opacity-50">{formatMoneyAUD(offer.original_price_cents)}</span>
                    </div>
                  </div>
                  <div className="flex justify-end pt-2 border-t border-white/5 mt-2">
                    <button
                      onClick={() => router.push(`/merchant-dashboard/create-deal?id=${offer.id}`)}
                      className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
                    >
                      Re-use Deal
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {expiredOffers.length === 0 && (
            <div className="px-5 py-6 text-sm text-white/30 italic">
              No expired deals yet.
            </div>
          )}
        </section>

        {/* Recent redemptions */}
        <section className="rounded-2xl border border-white/10 bg-[#0B1118] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
            <div>
              <h2 className="text-sm font-semibold">Recent redemptions</h2>
              <p className="text-[11px] text-white/45 mt-0.5">
                Latest activity from Today&apos;s Stash members at your venue.
              </p>
            </div>
            <p className="text-[11px] text-white/50">
              Showing last {redemptions.length} redemptions
            </p>
          </div>

          {redemptions.length === 0 ? (
            <div className="px-5 py-6 text-sm text-white/65">
              No redemptions yet. Once members start scanning your QR code,
              they&apos;ll appear here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs text-white/80">
                <thead className="bg-white/5 text-[11px] uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Customer</th>
                    <th className="px-4 py-3 font-semibold">Offer</th>
                    <th className="px-4 py-3 font-semibold text-right">
                      Savings
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {redemptions.map((r) => (
                    <tr
                      key={r.id}
                      className="border-t border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {formatDateTime(r.redeemed_at)}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {r.customerEmail ? (
                          <span className="font-medium text-white">
                            {r.customerEmail}
                          </span>
                        ) : (
                          <span className="text-white/50">Member</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-white">{r.offerTitle}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <span className="font-semibold">
                          {formatMoneyAUD(r.savingsCents)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </main >
  );
}

/* =======================
   Small components
   ======================= */

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0B1118] px-5 py-4 flex flex-col justify-between min-h-[130px]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60 mb-2">
        {label}
      </p>
      <p className="text-2xl font-bold mb-1">{value}</p>
      <p className="text-[11px] text-white/55 leading-relaxed">{helper}</p>
    </div>
  );
}
