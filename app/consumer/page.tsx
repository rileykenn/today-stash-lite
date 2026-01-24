/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { sb } from "@/lib/supabaseBrowser";
import { useRouter } from "next/navigation";
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
import { getNextRecurringSlot } from "./components/scheduler";

import DealsGrid from "./components/DealsGrid";
import RedeemModal from "./components/RedeemModal";
import NotificationModal from "./components/NotificationModal";
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
  const [profileFirstName, setProfileFirstName] = useState<string>("");
  const [subscribedTownSlugs, setSubscribedTownSlugs] = useState<string[]>([]);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Notification Logic
  const [userNotificationMethod, setUserNotificationMethod] = useState<string | null>(null);
  const [enabledMerchantIds, setEnabledMerchantIds] = useState<Set<string>>(new Set());
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [notificationTargetDeal, setNotificationTargetDeal] = useState<Coupon | null>(null);
  const [notificationLoading, setNotificationLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTown, setFilterTown] = useState<string>("all"); // 'all' | 'subscribed' | town_slug
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  // Constants
  const merchantCategories = [
    'Cafe & Bakery',
    'Financial',
    'Fitness',
    'Hair & Beauty',
    'Mechanical',
    'Miscellaneous',
    'Pet Care',
    'Photography',
    'Recreation',
  ];

  // Redemption modal
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<Step>("instructions");
  const [activeDeal, setActiveDeal] = useState<Coupon | null>(null);

  // Flyer code confirmation
  const [flyerCode, setFlyerCode] = useState("");
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Time state for Sorting
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // Today's redeemed deals
  const [todayRedeemedOfferIds, setTodayRedeemedOfferIds] = useState<Set<string>>(new Set());

  /* -----------------------
     1. Init Data Loading & Sync
     ----------------------- */
  const fetchProfile = async () => {
    const { data: { session } } = await sb.auth.getSession();

    // Always update session state first
    if (session?.user?.id !== userSession?.user?.id) {
      setUserSession(session);
    }

    if (session) {
      const { data: profile } = await sb
        .from("profiles")
        .select("subscribed_towns, first_name")
        .eq("user_id", session.user.id)
        .single();

      if (profile) {
        // Only update if changed to avoid unnecessary re-renders,
        // but for array/string simple comparison is often enough or just set it.
        setSubscribedTownSlugs(profile.subscribed_towns || []);
        if (profile.first_name) {
          setProfileFirstName(profile.first_name);
        }
      }

      // Fetch Notification Status
      const { data: fullProfile } = await sb
        .from("profiles")
        .select("notification_method, notifications_enabled")
        .eq("user_id", session.user.id)
        .single();

      if (fullProfile) {
        if (fullProfile.notifications_enabled && fullProfile.notification_method) {
          setUserNotificationMethod(fullProfile.notification_method);
        } else {
          setUserNotificationMethod(null);
        }
      }

      // Fetch Merchant Preferences
      const { data: existingPrefs } = await sb
        .from('notification_preferences')
        .select('merchant_id')
        .eq('user_id', session.user.id)
        .eq('enabled', true);

      if (existingPrefs) {
        const ids = new Set(existingPrefs.map((p: any) => p.merchant_id));
        setEnabledMerchantIds(ids);
      }
    }
    setCheckingAuth(false);
  };

  useEffect(() => {
    let mounted = true;

    async function init() {
      await fetchProfile();

      // B. Fetch Towns (only once on mount is fine usually, or can move to separate effect if needed)
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

      // D. Fetch today's redemptions for current user (if logged in)
      const { data: { session } } = await sb.auth.getSession();
      if (session && mounted) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0); // Midnight today (browser local time)

        const { data: redemptionsData } = await sb
          .from("redemptions")
          .select("offer_id")
          .eq("user_id", session.user.id)
          .gte("redeemed_at", todayStart.toISOString());

        if (redemptionsData) {
          const redeemedIds = new Set(
            redemptionsData.map((r: any) => r.offer_id)
          );
          setTodayRedeemedOfferIds(redeemedIds);
        }
      }


      // C. Fetch Deals (All active deals)
      // Updated: fetch category
      const { data: offersData, error: offersError } = await sb
        .from("offers")
        .select(`
          id, merchant_id, title, description, terms, image_url, savings_cents,
          total_limit, redeemed_count, is_active, created_at, area_key, area_name, exp_date,
          price_cents, original_price_cents, valid_from, valid_until, recurring_schedule,
          merchant:merchants(id, name, logo_url, banner_url, street_address, operating_hours, town_id, category)
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


            // 4. Calculate Next Available Slot (if closed)
            let nextStart: Date | null = null;
            let nextEnd: Date | null = null;
            if (isDealClosed && r.recurring_schedule && Array.isArray(r.recurring_schedule)) {
              const slot = getNextRecurringSlot(r.recurring_schedule, now);
              if (slot) {
                nextStart = slot.start;
                nextEnd = slot.end;
              }
            }

            return {
              id: String(r.id),
              title: String(r.title ?? ""),
              terms: String(r.terms ?? r.description ?? ""),
              totalValue: (r.savings_cents ?? 0) / 100,
              imageUrl: resolvePublicUrl(r.image_url, process.env.NEXT_PUBLIC_OFFER_BUCKET || "offer-media"),
              merchant: {
                id: r.merchant?.id,
                name: getMerchantName(r.merchant),
                logoUrl: getMerchantLogo(r.merchant),
                bannerUrl: getMerchantBanner(r.merchant),
                addressText: getMerchantAddress(r.merchant),
                townId: r.merchant?.town_id,
                category: r.merchant?.category, // Added
                isClosed: isMerchantClosed, // ONLY merchant business hours, NOT deal expiration
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
              nextAvailableStart: nextStart ? nextStart.toISOString() : null,
              nextAvailableEnd: nextEnd ? nextEnd.toISOString() : null,
            } as Coupon;
          }).filter((d) => {
            if (!d) return false;
            // Always keep if recurring/next available is set
            if (d.nextAvailableStart) {
              const next = new Date(d.nextAvailableStart);
              const today = new Date();
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);

              const isToday = next.getDate() === today.getDate() && next.getMonth() === today.getMonth();
              const isTomorrow = next.getDate() === tomorrow.getDate() && next.getMonth() === tomorrow.getMonth();

              // Only show if active/starts Today or Tomorrow
              if (isToday || isTomorrow) return true;
              return false;
            }
            // If manual expiry (daysLeft), keep if not expired > 1 day ago
            // daysLeft < 0 means expired. < -1 means more than 1 day ago.
            if (d.daysLeft !== null && d.daysLeft !== undefined && d.daysLeft < -1) return false;
            return true;
          }) as Coupon[];

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

    const onFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchProfile();
      }
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("visibilitychange", onFocus);

    return () => {
      mounted = false;
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("visibilitychange", onFocus);
    };
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

    // Category Filter
    if (filterCategory !== "all") {
      result = result.filter(d => d.merchant?.category === filterCategory);
    }

    // Sort by Availability Priority
    if (now) {
      result.sort((a, b) => {
        const getRank = (d: Coupon) => {
          // 0. Closed Business (Always Bottom)
          if (d.merchant?.isClosed) return 10;

          // 4. Sold Out
          const rem = (d.totalLimit ?? 999999) - d.usedCount;
          if (d.totalLimit !== null && rem <= 0) return 4;

          // Schedule logic
          if (d.todayStart && d.todayEnd) {
            const s = new Date(d.todayStart);
            const e = new Date(d.todayEnd);
            if (now > e) return 5; // Expired
            if (now < s) return 2; // Active In

            // Inside Window / Available
            return 1;
          }

          if (d.nextAvailableStart) return 3; // Available Tomorrow

          if (d.daysLeft != null && d.daysLeft < 0) return 5; // Expired

          // Fallback
          return 1;
        };

        const rA = getRank(a);
        const rB = getRank(b);
        return rA - rB;
      });
    }

    return result;
  }, [deals, searchQuery, filterTown, filterCategory, subscribedTownSlugs, now]);


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

    console.log("Attempting redemption with:", { p_offer_id: activeDeal.id, p_pin: pin });

    try {
      const response = await sb.rpc("redeem_offer_with_pin", {
        p_offer_id: activeDeal.id,
        p_pin: pin
      });
      console.log("RPC Response:", response);

      const { error } = response;
      if (error) throw error;

      setStep("success");
    } catch (e: any) {
      console.error("Redemption error object:", e);
      // Force visibility with alert
      const errString = `Debug Error:\nMessage: ${e.message}\nCode: ${e.code}\nDetails: ${e.details}\nHint: ${e.hint}`;
      alert(errString);
      setSubmitError(errString);
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
     4. Notification Handlers
     ----------------------- */
  const handleBellClick = (deal: Coupon) => {
    if (!userSession) {
      router.push('/signin');
      return;
    }

    // If already enabled, maybe we warn "disable?" or just allow toggle.
    // Requirement: "Enable notifs from this merchant..." - usually implies enabling.
    // If user wants to disable, logic should likely handle that too or just toggle.
    // But user prompt specifically detailed the flow for ENABLE.
    // We will open modal. If already enabled, maybe we confirm disable?
    // For now, let's open modal to ENABLE if not enabled.
    // If already enabled, we can just disable immediately or confirm.
    // Logic: If enabled -> Disable immediately (with visual feedback).
    // If disabled -> Open modal to Enable.

    if (!deal.merchant?.id) return;

    if (enabledMerchantIds.has(deal.merchant.id)) {
      // Disable immediately
      toggleMerchantNotification(deal, false);
    } else {
      // Open Modal
      setNotificationTargetDeal(deal);
      setNotificationModalOpen(true);
    }
  };

  const toggleMerchantNotification = async (deal: Coupon, enable: boolean) => {
    if (!userSession || !deal.merchant?.id) return;

    setNotificationLoading(true);
    try {
      // Get fresh session token to ensure validity
      const { data: { session } } = await sb.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error("No active session. Please sign in again.");
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      if (!enable) {
        // Disable
        const res = await fetch(`/api/notifications/preferences?merchant_id=${deal.merchant.id}`, {
          method: 'DELETE',
          headers: headers, // Pass auth header
        });
        if (!res.ok) {
          const errorData = await res.json();
          console.error("Failed to disable notification:", errorData);
          throw new Error(errorData.error || "Failed to disable notification");
        }

        setEnabledMerchantIds(prev => {
          const next = new Set(prev);
          if (deal.merchant?.id) next.delete(deal.merchant.id);
          return next;
        });
      } else {
        // Enable
        const res = await fetch('/api/notifications/preferences', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            merchant_id: deal.merchant.id,
            town_id: deal.merchant.townId,
            enabled: true,
          }),
        });
        if (!res.ok) {
          const errorData = await res.json();
          console.error("Failed to enable notification:", errorData);
          throw new Error(errorData.error || "Failed to enable notification");
        }

        setEnabledMerchantIds(prev => {
          const next = new Set(prev);
          if (deal.merchant?.id) next.add(deal.merchant.id);
          return next;
        });
        setNotificationModalOpen(false); // Close ONLY on success
      }
    } catch (err) {
      console.error("Failed to toggle notification", err);
      alert(`Failed to update notification: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setNotificationLoading(false);
    }
  };


  const handleNotificationConfirm = () => {
    if (!notificationTargetDeal) return;
    toggleMerchantNotification(notificationTargetDeal, true);
  };

  const closeNotificationModal = () => {
    setNotificationModalOpen(false);
    setNotificationTargetDeal(null);
  };


  /* -----------------------
     Render
     ----------------------- */
  if (loading) return <Loading message="Loading Deals..." />;

  // Dynamic Header Logic
  const displayName = profileFirstName ? profileFirstName : (userSession ? "there" : "Guest");

  let headerTitle = `Welcome ${displayName}`;
  let headerSubtitle: React.ReactNode = "";

  if (filterTown === "all") {
    // If not subscribed to anything, maybe prompt? or just show all
    if (subscribedTownSlugs.length === 0) {
      if (!userSession) {
        headerSubtitle = (
          <>
            <Link href="/signin" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4 decoration-emerald-500/30">Sign in</Link>
            {" and "}
            <Link href="/areas" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4 decoration-emerald-500/30">subscribe to a town</Link>
            {" to see local deals."}
          </>
        );
      } else {
        headerSubtitle = (
          <>
            You aren&apos;t subscribed to any towns yet. <Link href="/areas" className="text-emerald-400 hover:text-emerald-300 underline">Browse Areas</Link>
          </>
        );
      }
    } else {
      headerSubtitle = "Showing all deals from all the towns you are subscribed to.";
    }
  } else if (filterTown === "subscribed") {
    if (subscribedTownSlugs.length === 0) {
      headerSubtitle = "You aren't subscribed to any towns yet.";
    } else {
      headerSubtitle = "Showing deals from your subscribed towns.";
    }
  } else {
    // Specific town
    const t = towns.find(t => t.slug === filterTown);
    headerSubtitle = `Showing all deals from ${t?.name ?? "selected town"}.`;
  }

  return (
    <main className="min-h-screen bg-[#0A0F13] text-white">
      {/* Background FX (Blue/Emerald) */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-emerald-500/5 blur-[100px]" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full bg-blue-600/5 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8">

        {/* --- Dynamic Header --- */}
        {/* --- Dynamic Header --- */}
        <section className="mb-8 text-center max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight">
            <span className="bg-gradient-to-r from-[#2563EB] to-[#60A5FA] bg-clip-text text-transparent">Welcome</span>
            <span className="text-white"> {displayName}</span>
          </h1>
          <p className="text-gray-300 text-lg md:text-2xl font-light">
            {headerSubtitle}
          </p>
        </section>

        {/* --- Controls: Search & Filters --- */}
        <div className="relative z-10 py-4 mb-6 border-b border-white/5 -mx-4 px-4 md:mx-0 md:px-0 md:rounded-2xl md:border-none">
          <div className="flex flex-col gap-4">

            {/* Search Bar */}
            <div className="relative w-full">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search deals, merchants, towns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#111821] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>

            {/* Scrollable Pill Filters */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {/* 1. All Deals */}
              <button
                onClick={() => setFilterTown("all")}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${filterTown === "all"
                  ? "bg-emerald-500 text-white border-emerald-500"
                  : "bg-[#111821] border-white/10 text-gray-400 hover:bg-white/5 hover:text-white"
                  }`}
              >
                All Deals
              </button>

              {/* 2. My Subscribed Towns (Always Visible) */}
              <button
                onClick={() => setFilterTown("subscribed")}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${filterTown === "subscribed"
                  ? "bg-emerald-500 text-white border-emerald-500"
                  : "bg-[#111821] border-white/10 text-gray-400 hover:bg-white/5 hover:text-white"
                  }`}
              >
                My Towns
              </button>

              {/* 3. Divider */}
              <div className="w-px h-6 bg-white/10 mx-1 flex-shrink-0" />

              {/* 4. Town Selector Dropdown */}
              <select
                value={filterTown === "all" || filterTown === "subscribed" ? "" : filterTown}
                onChange={(e) => setFilterTown(e.target.value || "all")}
                className={`px-3 py-2 rounded-full text-xs font-semibold border transition-all appearance-none cursor-pointer focus:outline-none ${filterTown !== "all" && filterTown !== "subscribed"
                  ? "bg-emerald-500 text-white border-emerald-500"
                  : "bg-[#111821] border-white/10 text-gray-400 hover:bg-white/5 hover:text-white"
                  }`}
              >
                <option value="" className="bg-[#111821] text-gray-400">Select Town...</option>
                {towns.map(t => (
                  <option key={t.id} value={t.slug} className="bg-[#111821] text-white">
                    {t.name}
                  </option>
                ))}
              </select>

              {/* 5. Category Selector Dropdown */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className={`px-3 py-2 rounded-full text-xs font-semibold border transition-all appearance-none cursor-pointer focus:outline-none ${filterCategory !== "all"
                  ? "bg-emerald-500 text-white border-emerald-500"
                  : "bg-[#111821] border-white/10 text-gray-400 hover:bg-white/5 hover:text-white"
                  }`}
              >
                <option value="all" className="bg-[#111821] text-gray-400">All Categories</option>
                {merchantCategories.map(cat => (
                  <option key={cat} value={cat} className="bg-[#111821] text-white">
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
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
          onBellClick={handleBellClick}
          enabledMerchantIds={enabledMerchantIds}
          isDealUnlocked={(d) => {
            return subscribedTownSlugs.includes(d.townSlug);
          }}
          todayRedeemedOfferIds={todayRedeemedOfferIds}
        />

        {visibleDeals.length === 0 && (
          <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
            {filterTown === "subscribed" && subscribedTownSlugs.length === 0 ? (
              // Empty Subscriptions State
              <>
                <p className="text-gray-400 mb-4 text-base">
                  You aren&apos;t subscribed to any towns yet.
                </p>
                <Link
                  href="/areas"
                  className="px-6 py-3 rounded-full bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors inline-block"
                >
                  View Towns to Join
                </Link>
              </>
            ) : (
              // Generic Empty State
              <>
                <p className="text-gray-500 mb-4">No deals found matching your criteria.</p>
                <button onClick={() => { setFilterTown("all"); setFilterCategory("all"); setSearchQuery(""); }} className="text-emerald-400 text-sm font-medium hover:underline">
                  Clear Filters
                </button>
              </>
            )}
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

      <NotificationModal
        open={notificationModalOpen}
        onClose={closeNotificationModal}
        merchantName={notificationTargetDeal?.merchant?.name || "Merchant"}
        isConfigured={!!userNotificationMethod}
        onConfirm={handleNotificationConfirm}
        loading={notificationLoading}
      />
    </main>
  );
}
