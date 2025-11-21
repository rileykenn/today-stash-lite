/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sb } from "@/lib/supabaseBrowser";

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

type State =
  | { status: "loading" }
  | { status: "not-logged-in" }
  | { status: "not-merchant" }
  | {
      status: "ready";
      merchant: Merchant;
      totalRedemptions: number;
      uniqueCustomers: number;
      estimatedRevenueCents: number;
      redemptions: EnrichedRedemption[];
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

      const { data: profile, error: profileErr } = await sb
        .from("profiles")
        .select("user_id, email, merchant_id")
        .eq("user_id", session.user.id)
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
            error: "Failed to load profile/merchant data.",
          });
        console.error("profiles query error:", profileErr);
        return;
      }

      if (!profile || !profile.merchant_id) {
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
            error: "Failed to load merchant data.",
          });
        console.error("merchants query error:", merchantErr);
        return;
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
    return (
      <main className="min-h-screen bg-[#05070A] text-white">
        <section className="max-w-6xl mx-auto px-4 py-10">
          <p className="text-sm text-white/70">Loading merchant dashboard…</p>
        </section>
      </main>
    );
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
            onClick={() => router.push("/profile")}
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400"
          >
            Go to sign-in
          </button>
        </section>
      </main>
    );
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
                onClick={() =>
                  window.open(
                    `/merchant-qr-poster?merchantId=${merchant.id}`,
                    "_blank"
                  )
                }
                className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-[0_0_20px_rgba(16,185,129,0.45)] hover:bg-emerald-400 whitespace-nowrap w-full"
              >
                Generate QR poster (A4)
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
    </main>
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
