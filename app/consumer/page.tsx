/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { sb } from "@/lib/supabaseBrowser";
import { useRouter } from "next/navigation";
import Gold3DBanner from "@/components/Gold3DBanner";
import Link from "next/link";

import type { Coupon, Town, Step } from "./components/types";
import {
  resolvePublicUrl,
  firstOrNull,
  getMerchantName,
  getMerchantLogo,
  getMerchantBanner,
  getMerchantAddress,
  getSydneyDateUTC,
  getSydneyToday,
} from "./components/helpers";
import { getMerchantStatus } from "./components/merchantStatus";

import DealsGrid from "./components/DealsGrid";
import RedeemModal from "./components/RedeemModal";
import Loading from "@/components/Loading";

// Helper components for Filters
import { MagnifyingGlassIcon, FunnelIcon } from "@heroicons/react/24/outline";

export default function ConsumerDealsPage() {
  const router = useRouter();

  // Deals & Data
  const [deals, setDeals] = useState<Coupon[]>([]);
  const [towns, setTowns] = useState<Town[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // User State
  const [userSession, setUserSession] = useState<any>(null);
  const [subscribedTownSlugs, setSubscribedTownSlugs] = useState<string[]>([]);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTown, setFilterTown] = useState<string>("all"); // 'all' | 'subscribed' | town_slug
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  // Redemption modal
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<Step>("instructions");
  const [activeDeal, setActiveDeal] = useState<Coupon | null>(null);

  // Flyer code confirmation
  const [flyerCode, setFlyerCode] = useState("");
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /* -----------------------
     1. Init Data Loading
     ----------------------- */
  useEffect(() => {
    let mounted = true;

    async function init() {
      // A. Check Auth & Subscriptions
      const { data: { session } } = await sb.auth.getSession();

      if (mounted) {
        setUserSession(session);
        if (session) {
          const { data: profile } = await sb
            .from("profiles")
            .select("subscribed_towns")
            .eq("user_id", session.user.id)
            .single();

          if (profile?.subscribed_towns && Array.isArray(profile.subscribed_towns)) {
            setSubscribedTownSlugs(profile.subscribed_towns);
            // Default filter: if user has subscriptions, maybe show "My Towns"? 
            // User Request: "show all of deals available that they are subscribed to... actually we want users to be able to see all of the deals"
            // Let's default to "All" but highlight the subscription option.
          }
        }
        setCheckingAuth(false);
      }

      // B. Fetch Towns
      const { data: townsData } = await sb
        .from("towns")
        .select("id, name, slug, is_free")
        .order("name");

      if (mounted && townsData) {
        setTowns(townsData.map((t: any) => ({
          ...t,
          slug: (t.slug ?? "").toLowerCase().trim()
        })));
      }

      // C. Fetch Deals (All active deals)
      const { data: offersData, error: offersError } = await sb
        .from("offers")
        .select(`
          id, merchant_id, title, description, terms, image_url, savings_cents,
          total_limit, redeemed_count, is_active, created_at, area_key, area_name, exp_date,
          price_cents, original_price_cents, valid_from, valid_until, recurring_schedule,
          merchant:merchants(id, name, logo_url, banner_url, street_address, operating_hours)
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (mounted) {
        if (offersError) {
          console.error("Error fetching deals", offersError);
          setErr("Failed to load deals.");
        } else {
          const todaySydney = getSydneyToday();
          const mapped = (offersData ?? []).map((r: any) => {
            // Expiration Check
            let daysLeft: number | null = null;
            if (r?.exp_date) {
              const expSydney = getSydneyDateUTC(new Date(r.exp_date));
              const diffMs = expSydney.getTime() - todaySydney.getTime();
              daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
              // if (daysLeft < 0) return null; // User requested to show expired deals

            }

            const townSlug = String(r?.area_key ?? "").toLowerCase().trim();

            // 1. Check Merchant Operating Hours (via helper)
            // This helper (from merchantStatus.ts) handles overnight shifts and spillovers correctly
            const status = getMerchantStatus(r.merchant);
            const isMerchantClosed = !status.isOpen;

            // 2. Check Deal Specific Schedule
            let isDealClosed = false;
            let todayStartStr: string | null = null;
            let todayEndStr: string | null = null;
            const now = new Date();

            // A. Global Validity Range
            if (r.valid_from && new Date(r.valid_from) > now) {
              // Check if it's strictly a future date (tomorrow+)
              const vDate = new Date(r.valid_from);
              const isSameDay = vDate.getDate() === now.getDate() &&
                vDate.getMonth() === now.getMonth() &&
                vDate.getFullYear() === now.getFullYear();

              if (!isSameDay) {
                isDealClosed = true;
              }
              // If same day, we treat it as Open (Upcoming) so it sorts correctly.
              // NOTE: We must ensure todayStartStr is populated later if recurring logic is skipped.
            }
            if (r.valid_until && new Date(r.valid_until) < now) {
              isDealClosed = true;
            }

            // B. Recurring Schedule
            if (!isDealClosed && r.recurring_schedule && Array.isArray(r.recurring_schedule)) {
              const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
              const dayName = days[now.getDay()];
              const todayRule = r.recurring_schedule.find((s: any) => s.day?.toLowerCase() === dayName);

              if (!todayRule) {
                isDealClosed = true; // Not scheduled for today
              } else if (todayRule.start && todayRule.end) {
                const currentMins = now.getHours() * 60 + now.getMinutes();
                const [sH, sM] = todayRule.start.split(':').map(Number);
                const [eH, eM] = todayRule.end.split(':').map(Number);

                // Create Date objects for start/end
                const sDate = new Date(now);
                sDate.setHours(sH, sM, 0, 0);

                const eDate = new Date(now);
                eDate.setHours(eH, eM, 0, 0);

                // Handle overnight
                if (eDate <= sDate) {
                  eDate.setDate(eDate.getDate() + 1);
                }

                todayStartStr = sDate.toISOString();
                todayEndStr = eDate.toISOString();

                const startMins = sH * 60 + sM;
                const endMins = eH * 60 + eM;

                if (endMins < startMins) {
                  // Overnight logic - treat as open/upcoming unless strictly invalid? 
                  // For now, let's just leave it open as it covers both shifts.
                  isDealClosed = false;
                } else {
                  if (currentMins >= endMins) {
                    isDealClosed = true; // Expired
                  }
                  // Upcoming (currentMins < startMins) remains False (Open) for sort
                }
              }
            } else if (!isDealClosed && !r.recurring_schedule && r.valid_from && r.valid_until) {
              // If not recurring, it's a fixed date/time range.
              // If we are here, isDealClosed is false (so it's valid today or upcoming today).
              todayStartStr = r.valid_from;
              todayEndStr = r.valid_until;
            }

            const isClosed = isMerchantClosed || isDealClosed;

            // 3. Compute Collection Window Text
            const dayName = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date().getDay()];
            let windowText: string | null = null;

            // Try recurring schedule first
            if (r.recurring_schedule && Array.isArray(r.recurring_schedule)) {
              const todayRule = r.recurring_schedule.find((s: any) => s.day === dayName);
              if (todayRule && todayRule.start && todayRule.end) {
                // Format HH:MM to am/pm
                const fmtTime = (t: string) => {
                  const [h, m] = t.split(':').map(Number);
                  const ampm = h >= 12 ? 'pm' : 'am';
                  const h12 = h % 12 || 12;
                  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
                };
                windowText = `Collect today ${fmtTime(todayRule.start)} - ${fmtTime(todayRule.end)}`;
              }
            }

            // Fallback to Merchant Hours if deal is valid today but no specific recurring time
            if (!windowText && !isDealClosed && (r.merchant as any)?.operating_hours) {
              const sched = (r.merchant as any).operating_hours[dayName];
              if (sched?.isOpen && sched.open && sched.close) {
                const fmtTime = (t: string) => {
                  const [h, m] = t.split(':').map(Number);
                  const ampm = h >= 12 ? 'pm' : 'am';
                  const h12 = h % 12 || 12;
                  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
                };
                windowText = `Collect today ${fmtTime(sched.open)} - ${fmtTime(sched.close)}`;
              }
            }

            return {
              id: String(r.id),
              title: String(r.title ?? ""),
              terms: String(r.terms ?? r.description ?? ""),
              totalValue: (r.savings_cents ?? 0) / 100,
              imageUrl: resolvePublicUrl(r.image_url, process.env.NEXT_PUBLIC_OFFER_BUCKET || "offer-media"),
              merchant: {
                name: getMerchantName(r.merchant),
                logoUrl: getMerchantLogo(r.merchant),
                bannerUrl: getMerchantBanner(r.merchant),
                addressText: getMerchantAddress(r.merchant),
                isClosed, // This is the combined status
                nextOpen: status.nextOpenText ?? undefined,
                closesAt: status.closesAt,
              },
              usedCount: r.redeemed_count ?? 0,
              totalLimit: r.total_limit,
              areaKey: townSlug,
              areaLabel: r.area_name ?? "Local",
              townSlug: townSlug,
              daysLeft,

              // New Fields
              price: r.price_cents ? r.price_cents / 100 : null,
              originalPrice: r.original_price_cents ? r.original_price_cents / 100 : null,
              descriptionMerchant: null,
              validFrom: r.valid_from,
              validUntil: r.valid_until,
              collectionWindow: windowText,
              todayStart: todayStartStr,
              todayEnd: todayEndStr,
            } as Coupon;
          }).filter(Boolean) as Coupon[];

          // Sort: Open merchants first, then by creation (preserved)
          mapped.sort((a, b) => {
            const aDesc = a.merchant?.isClosed ? 1 : 0;
            const bDesc = b.merchant?.isClosed ? 1 : 0;
            return aDesc - bDesc;
          });

          setDeals(mapped);
        }
        setLoading(false);
      }
    }

    init();
    return () => { mounted = false; };
  }, []);


  /* -----------------------
     2. Derived State (Filtering)
     ----------------------- */
  const visibleDeals = useMemo(() => {
    let result = deals;

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d =>
        d.title.toLowerCase().includes(q) ||
        d.merchant?.name.toLowerCase().includes(q) ||
        d.areaLabel.toLowerCase().includes(q)
      );
    }

    // Town Filter
    if (filterTown === "subscribed") {
      if (subscribedTownSlugs.length > 0) {
        result = result.filter(d => subscribedTownSlugs.includes(d.townSlug));
      } else {
        // User chose "My Subscribed Towns" but has none. Shows empty or handled in UI.
        result = [];
      }
    } else if (filterTown !== "all") {
      result = result.filter(d => d.townSlug === filterTown);
    }

    // Future: Category Filter

    return result;
  }, [deals, searchQuery, filterTown, subscribedTownSlugs]);


  /* -----------------------
     3. Handlers
     ----------------------- */

  const handleRedeemClick = (deal: Coupon) => {
    // 1. Check Auth
    if (!userSession) {
      // Redirect to Signup (with return path)
      router.push(`/signup?next=${encodeURIComponent("/consumer")}`);
      return;
    }

    // 2. Check Subscription
    // We assume `areaKey` or `townSlug` on deal matches the slugs in `subscribed_towns`
    const isSubscribed = subscribedTownSlugs.includes(deal.townSlug);

    // Also check if town is free (legacy support or promotional periods)
    const town = towns.find(t => t.slug === deal.townSlug);
    const isFree = town?.is_free;

    if (isSubscribed || isFree) {
      // OPEN MODAL
      setActiveDeal(deal);
      setStep("instructions");
      setModalOpen(true);
    } else {
      // REDIRECT TO TOWN PAGE TO SUBSCRIBE
      router.push(`/areas/${deal.townSlug}`);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setActiveDeal(null);
    setFlyerCode("");
    setSubmitError(null);
  };

  // Redemption Confirmation logic (same as before)
  const handleConfirmRedemption = async (codeOverride?: string) => {
    if (!activeDeal) return;
    const pin = (codeOverride ?? flyerCode).trim();
    if (!pin || pin.length < 6) {
      setSubmitError("Invalid code.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const { error } = await sb.rpc("redeem_offer_with_pin", {
        p_offer_id: activeDeal.id,
        p_pin: pin
      });

      if (error) throw error;
      setStep("success");
    } catch (e) {
      setSubmitError("Code incorrect or redemption failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleQrDetected = (val: string) => {
    if (step !== "instructions") return;
    const digits = val.replace(/[^\d]/g, "").slice(0, 6);
    if (digits) handleConfirmRedemption(digits);
  };


  /* -----------------------
     Render
     ----------------------- */
  if (loading) return <Loading message="Loading Deals..." />;

  return (
    <main className="min-h-screen bg-[#0A0F13] text-white">
      {/* Background FX (Blue/Emerald) */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-emerald-500/5 blur-[100px]" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full bg-blue-600/5 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8">

        {/* Banner */}
        <div className="flex justify-center mb-10">
          <Gold3DBanner />
        </div>

        {/* --- Header: User Status --- */}
        <section className="mb-8 bg-[#111821] border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">Explore Local Deals</h1>
            {subscribedTownSlugs.length > 0 ? (
              <p className="text-sm text-gray-400">
                You are subscribed to: <span className="text-emerald-400 font-medium">
                  {towns
                    .filter(t => subscribedTownSlugs.includes(t.slug))
                    .map(t => t.name)
                    .join(", ")}
                </span>
              </p>
            ) : (
              <p className="text-sm text-gray-400">
                You aren&apos;t subscribed to any areas yet.
                <Link href="/areas" className="text-emerald-400 hover:text-emerald-300 ml-1 underline">
                  Find towns to join.
                </Link>
              </p>
            )}
          </div>
          <Link
            href="/areas"
            className="px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium transition-colors whitespace-nowrap"
          >
            Browse All Areas
          </Link>
        </section>

        {/* --- Controls: Search & Filters --- */}
        <div className="sticky top-[60px] z-30 bg-[#0A0F13]/95 backdrop-blur-md py-4 mb-6 border-b border-white/5">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search deals, merchants, towns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#111821] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>

            {/* Desktop Filter Toggles */}
            <div className="hidden md:flex items-center gap-2 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setFilterTown("all")}
                className={`px-4 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${filterTown === "all"
                  ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
                  : "bg-[#111821] border-white/10 text-gray-400 hover:bg-white/5"
                  }`}
              >
                All Deals
              </button>

              {userSession && (
                <button
                  onClick={() => setFilterTown("subscribed")}
                  className={`px-4 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${filterTown === "subscribed"
                    ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
                    : "bg-[#111821] border-white/10 text-gray-400 hover:bg-white/5"
                    }`}
                >
                  My Towns ({subscribedTownSlugs.length})
                </button>
              )}

              {/* Specific Town Dropdown (Simplified as list for now) */}
              <select
                value={filterTown === "subscribed" || filterTown === "all" ? "" : filterTown}
                onChange={(e) => setFilterTown(e.target.value || "all")}
                className="bg-[#111821] border border-white/10 text-gray-300 text-xs rounded-full px-4 py-2.5 focus:outline-none focus:border-emerald-500/30"
              >
                <option value="">Specific Town...</option>
                {towns.map(t => (
                  <option key={t.id} value={t.slug}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Mobile Filter Toggle */}
            <button
              className="md:hidden p-3 rounded-xl bg-[#111821] border border-white/10 text-gray-300"
              onClick={() => setShowFiltersMobile(!showFiltersMobile)}
            >
              <FunnelIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Filters Expanded */}
          {showFiltersMobile && (
            <div className="md:hidden mt-4 grid grid-cols-2 gap-2 animate-in slide-in-from-top-2">
              <button
                onClick={() => setFilterTown("all")}
                className={`p-2 rounded-lg text-xs font-medium border ${filterTown === "all" ? "bg-emerald-900/20 border-emerald-500 text-emerald-400" : "bg-[#161e29] border-white/5 text-gray-400"
                  }`}
              >
                All Deals
              </button>
              {userSession && (
                <button
                  onClick={() => setFilterTown("subscribed")}
                  className={`p-2 rounded-lg text-xs font-medium border ${filterTown === "subscribed" ? "bg-emerald-900/20 border-emerald-500 text-emerald-400" : "bg-[#161e29] border-white/5 text-gray-400"
                    }`}
                >
                  My Subscriptions
                </button>
              )}
              <select
                onChange={(e) => setFilterTown(e.target.value)}
                className="col-span-2 bg-[#161e29] border border-white/5 text-gray-300 text-xs rounded-lg p-2"
              >
                <option value="all">Filter by Town...</option>
                {towns.map(t => (
                  <option key={t.id} value={t.slug}>{t.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* --- Content: Grid --- */}
        <p className="text-white/40 text-xs mb-4 uppercase tracking-wider font-semibold">
          Showing {visibleDeals.length} Result{visibleDeals.length !== 1 ? "s" : ""}
        </p>

        {/* We pass areaUnlocked=true because we handle locking at the card level now via onRedeem */}
        <DealsGrid
          areaUnlocked={true}
          visibleDeals={visibleDeals}
          onRedeem={handleRedeemClick}
        />

        {visibleDeals.length === 0 && (
          <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
            <p className="text-gray-500 mb-4">No deals found matching your criteria.</p>
            <button onClick={() => { setFilterTown("all"); setSearchQuery(""); }} className="text-emerald-400 text-sm font-medium hover:underline">
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* --- Modals --- */}
      <RedeemModal
        open={modalOpen}
        onClose={closeModal}
        activeDeal={activeDeal}
        step={step}
        lastScanned={lastScanned}
        flyerCode={flyerCode}
        setFlyerCode={setFlyerCode}
        submitting={submitting}
        submitError={submitError}
        onConfirm={handleConfirmRedemption}
        onQrDetected={handleQrDetected}
      />
    </main>
  );
}
