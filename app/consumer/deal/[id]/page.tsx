/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { sb } from "@/lib/supabaseBrowser";
import type { Coupon, Step } from "../../components/types";
import {
    resolvePublicUrl,
    getMerchantName,
    getMerchantLogo,
    getMerchantBanner,
    getMerchantAddress,
    getSydneyDateUTC,
    getSydneyToday,
    fmtMoney
} from "../../components/helpers";
import RedeemModal from "../../components/RedeemModal";
import NotificationModal from "../../components/NotificationModal"; // Import Notification Modal
import { BusinessHours } from "../../components/BusinessHours"; // Import Business Hours
import { ArrowLeftIcon, MapPinIcon, BellIcon, ShareIcon, ClockIcon, CalendarIcon, HashtagIcon } from "@heroicons/react/24/outline";
import { BellIcon as BellIconSolid } from "@heroicons/react/24/solid";
import { getMerchantStatus, type MerchantStatus } from "../../components/merchantStatus";
import { getNextRecurringSlot } from "../../components/scheduler";
import Loading from "@/components/Loading";

export default function DealDetailsPage() {
    const { id } = useParams();
    const router = useRouter();

    const [deal, setDeal] = useState<Coupon | null>(null);
    const [status, setStatus] = useState<MerchantStatus>({ isOpen: false, nextOpenText: null, closesAt: null, isManualClose: false });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Time state
    const [now, setNow] = useState<Date | null>(null);
    useEffect(() => {
        setNow(new Date());
        const t = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(t);
    }, []);

    // Auth & Subscription
    const [userSession, setUserSession] = useState<any>(null);
    const [subscribedTownSlugs, setSubscribedTownSlugs] = useState<string[]>([]);

    // Notification State
    const [isNotificationEnabled, setIsNotificationEnabled] = useState(false);
    const [notificationModalOpen, setNotificationModalOpen] = useState(false);
    const [notificationLoading, setNotificationLoading] = useState(false);
    const [isConfigured, setIsConfigured] = useState(false); // If user has notification method set

    // Redemption
    const [modalOpen, setModalOpen] = useState(false);
    const [step, setStep] = useState<Step>("instructions");
    const [flyerCode, setFlyerCode] = useState("");
    const [lastScanned, setLastScanned] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    useEffect(() => {
        async function init() {
            const { data: { session } } = await sb.auth.getSession();
            setUserSession(session);

            if (session) {
                // Fetch Profile for Subscriptions & Notification Config
                const { data: profile } = await sb
                    .from("profiles")
                    .select("subscribed_towns, notification_method, notifications_enabled")
                    .eq("user_id", session.user.id)
                    .single();

                if (profile) {
                    if (profile.subscribed_towns) setSubscribedTownSlugs(profile.subscribed_towns);
                    // Check if global notifications are configured
                    if (profile.notifications_enabled && profile.notification_method) {
                        setIsConfigured(true);
                    }
                }
            }

            if (!id) return;

            // Fetch Deal + Merchant with Operating Hours
            const { data: r, error: fetchError } = await sb
                .from("offers")
                .select(`
                id, merchant_id, title, description, terms, image_url, savings_cents,
                total_limit, redeemed_count, is_active, created_at, area_key, area_name, exp_date,
                price_cents, original_price_cents, valid_from, valid_until, recurring_schedule,
                merchant:merchants(*)
            `)
                .eq("id", id)
                .single();

            if (fetchError || !r) {
                setError("Deal not found");
                setLoading(false);
                return;
            }

            // Check if notification enabled for this merchant
            if (session && r.merchant_id) {
                const { data: pref } = await sb
                    .from('notification_preferences')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .eq('merchant_id', r.merchant_id)
                    .eq('enabled', true)
                    .maybeSingle();
                if (pref) setIsNotificationEnabled(true);
            }

            // Map to Coupon
            const townSlug = String(r?.area_key ?? "").toLowerCase().trim();
            const merch = Array.isArray(r.merchant) ? r.merchant[0] : r.merchant;
            const statusResult = getMerchantStatus(merch);
            setStatus(statusResult);

            // --- Schedule Logic ---
            let isDealClosed = false;
            let todayStartStr: string | null = null;
            let todayEndStr: string | null = null;
            const now = new Date();

            // A. Global Validity Range
            if (r.valid_from && new Date(r.valid_from) > now) {
                const vDate = new Date(r.valid_from);
                const isSameDay = vDate.getDate() === now.getDate() &&
                    vDate.getMonth() === now.getMonth() &&
                    vDate.getFullYear() === now.getFullYear();

                if (!isSameDay) isDealClosed = true;
                // If same day, likely handled by recurring logic or explicit start?
                // For simplicity, if not recurring, it might be open.
            }
            if (r.valid_until && new Date(r.valid_until) < now) isDealClosed = true;

            // B. Recurring Schedule
            if (!isDealClosed && r.recurring_schedule && Array.isArray(r.recurring_schedule)) {
                const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
                const dayName = days[now.getDay()];
                const todayRule = r.recurring_schedule.find((s: any) => s.day?.toLowerCase() === dayName);

                if (!todayRule) {
                    isDealClosed = true;
                } else if (todayRule.start && todayRule.end) {
                    const [sH, sM] = todayRule.start.split(':').map(Number);
                    const [eH, eM] = todayRule.end.split(':').map(Number);

                    const sDate = new Date(now);
                    sDate.setHours(sH, sM, 0, 0);

                    const eDate = new Date(now);
                    eDate.setHours(eH, eM, 0, 0);

                    if (eDate <= sDate) eDate.setDate(eDate.getDate() + 1);

                    const currentMins = now.getHours() * 60 + now.getMinutes();
                    const startMins = sH * 60 + sM;
                    const endMins = eH * 60 + eM;

                    // If overnight, next day handling is implied by date obj, 
                    // but for strict `isDealClosed` check:
                    // If eDate is tomorrow, we are open if now >= sDate.
                    // Simplification: just assume if we are inside the window defined by sDate/eDate
                    // But sDate/eDate are absolute.
                    if (now < sDate || now >= eDate) {
                        isDealClosed = true;
                    }

                    // Populate Strings
                    todayStartStr = sDate.toISOString();
                    todayEndStr = eDate.toISOString();
                }
            }

            // Calculate Next Available (if closed)
            let nextStart: Date | null = null;
            let nextEnd: Date | null = null;
            if (isDealClosed && r.recurring_schedule && Array.isArray(r.recurring_schedule)) {
                const slot = getNextRecurringSlot(r.recurring_schedule, now);
                if (slot) {
                    nextStart = slot.start;
                    nextEnd = slot.end;
                }
            }

            // Days left calc
            const todaySydney = getSydneyToday();
            let daysLeft: number | null = null;
            if (r?.exp_date) {
                const expSydney = getSydneyDateUTC(new Date(r.exp_date));
                const diffMs = expSydney.getTime() - todaySydney.getTime();
                daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            }

            const mapped: Coupon = {
                id: String(r.id),
                title: String(r.title ?? ""),
                description: r.description ?? null,
                terms: String(r.terms ?? ""),
                totalValue: (r.savings_cents ?? 0) / 100,
                imageUrl: resolvePublicUrl(r.image_url, process.env.NEXT_PUBLIC_OFFER_BUCKET || "offer-media"),
                merchant: {
                    id: merch.id,
                    name: getMerchantName(merch),
                    logoUrl: getMerchantLogo(merch),
                    bannerUrl: getMerchantBanner(merch),
                    townId: merch.town_id,
                    addressText: getMerchantAddress(merch),
                    isClosed: !statusResult.isOpen,
                    operating_hours: merch.operating_hours // Pass this through
                },
                usedCount: r.redeemed_count ?? 0,
                totalLimit: r.total_limit,
                areaKey: townSlug,
                areaLabel: r.area_name ?? "Local",
                townSlug: townSlug,
                daysLeft,
                price: r.price_cents ? r.price_cents / 100 : null,
                originalPrice: r.original_price_cents ? r.original_price_cents / 100 : null,
                descriptionMerchant: null,
                validFrom: r.valid_from,
                validUntil: r.valid_until,
                collectionWindow: null,
                nextAvailableStart: nextStart ? nextStart.toISOString() : null,
                nextAvailableEnd: nextEnd ? nextEnd.toISOString() : null,
                todayStart: todayStartStr,  // NEW
                todayEnd: todayEndStr,      // NEW
            };

            setDeal(mapped);
            setLoading(false);
        }
        init();
    }, [id]);

    /* --- Status Logic (Consolidated) --- */
    let statusText = "";
    let statusClasses = "bg-gray-100 text-gray-500";

    if (deal && now) {
        if (deal.todayStart && deal.todayEnd) {
            const start = new Date(deal.todayStart);
            const end = new Date(deal.todayEnd);

            if (now > end) {
                // Expired (earlier today)
                const diff = now.getTime() - end.getTime();
                const h = Math.floor(diff / (1000 * 60 * 60));
                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                statusText = `Expired ${h}h ${m}m ago`;
                statusClasses = "bg-red-50 text-red-600 border border-red-100";
            } else if (now < start) {
                // Scheduled for later today
                const diff = start.getTime() - now.getTime();
                const h = Math.floor(diff / (1000 * 60 * 60));
                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                statusText = `Active in ${h}h ${m}m`;
                statusClasses = "bg-amber-50 text-amber-600 border border-amber-100";
            } else {
                // Inside Window
                if (!deal.merchant?.isClosed) {
                    // Active & Open
                    const diff = end.getTime() - now.getTime();
                    const h = Math.floor(diff / (1000 * 60 * 60));
                    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    statusText = `Expires in ${h}h ${m}m`;
                    statusClasses = "bg-emerald-50 text-emerald-600 border border-emerald-100";
                } else {
                    // Active but Closed
                    statusText = "Business Closed";
                    statusClasses = "bg-gray-100 text-gray-500 border border-gray-200";
                }
            }
        } else if (deal.nextAvailableStart) {
            // Recurring/Scheduled for tomorrow
            statusText = "Available tomorrow";
            statusClasses = "bg-emerald-50 text-emerald-600 border border-emerald-100";
        } else if (deal.daysLeft != null && deal.daysLeft < 0) {
            // Long expired
            const days = Math.abs(deal.daysLeft);
            statusText = `Expired ${days} days ago`;
            statusClasses = "bg-red-50 text-red-600 border border-red-100";
        }
    }


    /* --- handlers --- */

    const handleShare = async () => {
        if (!deal) return;
        const url = window.location.href;
        const shareData = {
            title: deal.title,
            text: `Check out this deal from ${deal.merchant?.name} on Today's Stash!`,
            url: url
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.log('Error sharing:', err);
            }
        } else {
            // Fallback
            try {
                await navigator.clipboard.writeText(url);
                alert("Link copied to clipboard!");
            } catch (err) {
                alert("Could not share automatically. Please copy the URL.");
            }
        }
    };

    const handleBellClick = () => {
        if (!userSession) {
            router.push(`/signin?next=${encodeURIComponent(window.location.pathname)}`);
            return;
        }

        if (isNotificationEnabled) {
            // Disable immediately
            toggleNotification(false);
        } else {
            // Open Modal to Enable
            setNotificationModalOpen(true);
        }
    };

    const toggleNotification = async (enable: boolean) => {
        if (!userSession || !deal?.merchant?.id) return;
        setNotificationLoading(true);

        try {
            const { data: { session } } = await sb.auth.getSession();
            const token = session?.access_token;
            if (!token) throw new Error("No session");

            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            if (!enable) {
                // Disable
                await fetch(`/api/notifications/preferences?merchant_id=${deal.merchant.id}`, {
                    method: 'DELETE',
                    headers
                });
                setIsNotificationEnabled(false);
            } else {
                // Enable
                await fetch('/api/notifications/preferences', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        merchant_id: deal.merchant.id,
                        town_id: deal.merchant.townId,
                        enabled: true,
                    }),
                });
                setIsNotificationEnabled(true);
                setNotificationModalOpen(false);
            }
        } catch (err) {
            console.error(err);
            alert("Failed to update notification settings.");
        } finally {
            setNotificationLoading(false);
        }
    };

    const handleRedeemClick = () => {
        if (!deal) return;
        if (!userSession) {
            router.push(`/signup?next=${encodeURIComponent(window.location.pathname)}`);
            return;
        }

        const isSubscribed = subscribedTownSlugs.includes(deal.townSlug);
        // Also check if town is free
        // For simplicity reusing subscription check logic from main page would be best, 
        // but here we just check explicit subscription or if we want to allow it.
        // Assuming strict subscription for now or redirect.
        if (isSubscribed) {
            setStep("instructions");
            setModalOpen(true);
        } else {
            router.push(`/areas/${deal.townSlug}`);
        }
    };

    const closeModal = () => {
        setModalOpen(false);
        setFlyerCode("");
        setSubmitError(null);
    };

    const handleConfirmRedemption = async (codeOverride?: string) => {
        if (!deal) return;
        const pin = (codeOverride ?? flyerCode).trim();
        if (!pin || pin.length < 6) { return setSubmitError("Invalid code."); }

        setSubmitting(true);
        setSubmitError(null);

        try {
            const { error } = await sb.rpc("redeem_offer_with_pin", { p_offer_id: deal.id, p_pin: pin });
            if (error) throw error;
            setStep("success");
            setDeal(prev => prev ? ({ ...prev, usedCount: (prev.usedCount || 0) + 1 }) : null);
        } catch (e: any) {
            alert(e.message);
            setSubmitError(e.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleQrDetected = (val: string) => {
        if (step !== "instructions") return;
        const digits = val.replace(/[^\d]/g, "").slice(0, 6);
        if (digits) handleConfirmRedemption(digits);
    };

    if (loading) return <Loading message="Loading Deal..." />;
    if (!deal || error) return <div className="min-h-screen bg-white flex items-center justify-center text-red-500">{error || "Deal not found"}</div>;

    const remaining = (deal.totalLimit ?? 0) - (deal.usedCount ?? 0);
    const isSoldOut = (deal.totalLimit ?? 0) > 0 && remaining <= 0;
    const isExpired = deal.daysLeft != null && deal.daysLeft < 0;

    return (
        <main className="min-h-screen bg-white text-gray-900 pb-24 md:pb-0 font-sans">

            <div className="md:grid md:grid-cols-2 lg:grid-cols-5 min-h-screen">

                {/* --- Left Column: Hero Image (Desktop) / Top (Mobile) --- */}
                {/* On desktop we make this sticky full height maybe? Or just large. */}
                <div className="relative w-full h-[40vh] md:h-screen md:col-span-1 lg:col-span-2 md:sticky md:top-0">
                    <img
                        src={deal.imageUrl || deal.merchant?.bannerUrl || "/placeholder-deal.svg"}
                        alt={deal.merchant?.name}
                        className={`w-full h-full object-cover transition-all duration-500 ${isSoldOut || isExpired || deal.merchant?.isClosed || deal.nextAvailableStart ? "grayscale filter opacity-90" : ""}`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent/10 md:hidden" />

                    {/* Mobile Top Nav Overlay */}
                    <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-20 md:hidden">
                        <button onClick={() => router.back()} className="p-2.5 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition shadow-lg">
                            <ArrowLeftIcon className="w-5 h-5" />
                        </button>
                        <div className="flex gap-3">
                            <button onClick={handleShare} className="p-2.5 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition shadow-lg">
                                <ShareIcon className="w-5 h-5" />
                            </button>
                            <button onClick={handleBellClick} className={`p-2.5 rounded-full backdrop-blur-md transition shadow-lg ${isNotificationEnabled ? "bg-white text-emerald-500" : "bg-white/20 text-white hover:bg-white/30"}`}>
                                {isNotificationEnabled ? <BellIconSolid className="w-5 h-5" /> : <BellIcon className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Mobile Title Overlay */}
                    <div className="absolute bottom-6 left-6 right-6 text-white md:hidden z-10">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-black/40 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider mb-2 border border-white/10">
                            {deal.merchant?.category || "Local Deal"}
                        </span>
                        <h1 className="text-3xl font-bold leading-tight shadow-black drop-shadow-lg">{deal.merchant?.name}</h1>
                    </div>
                </div>

                {/* --- Right Column: Content (Scrollable) --- */}
                <div className="relative z-10 -mt-6 rounded-t-[32px] bg-white px-6 pt-10 pb-24 md:mt-0 md:rounded-none md:p-12 md:col-span-1 lg:col-span-3 md:overflow-y-auto">

                    {/* Desktop Back Button */}
                    <div className="hidden md:flex justify-between items-center mb-8">
                        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium transition">
                            <ArrowLeftIcon className="w-5 h-5" /> Back
                        </button>
                        <div className="flex gap-3">
                            <button onClick={handleShare} className="p-2 rounded-full hover:bg-gray-100 transition border border-gray-200 text-gray-600">
                                <ShareIcon className="w-5 h-5" />
                            </button>
                            <button onClick={handleBellClick} className={`p-2 rounded-full transition border ${isNotificationEnabled ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "hover:bg-gray-100 border-gray-200 text-gray-600"}`}>
                                {isNotificationEnabled ? <BellIconSolid className="w-5 h-5" /> : <BellIcon className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Desktop Title Header */}
                    <div className="hidden md:block mb-10">
                        <span className="inline-block px-3 py-1 rounded-full bg-gray-100 text-xs font-bold uppercase tracking-wider mb-3 text-gray-600">
                            {deal.merchant?.category || "Local Deal"}
                        </span>
                        <h1 className="text-5xl font-extrabold text-gray-900 mb-2">{deal.merchant?.name}</h1>
                        <div className="flex items-center gap-2 text-gray-500">
                            <MapPinIcon className="w-5 h-5" />
                            <span className="font-medium">{deal.merchant?.addressText}</span>
                        </div>
                    </div>

                    {/* Deal Main Info Card */}
                    <div className="space-y-8">
                        <div>
                            <div className="flex items-end justify-between border-b border-gray-100 pb-6 mb-6">
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-bold text-gray-900 leading-snug">{deal.title}</h2>
                                    <div className="flex items-center gap-2 text-sm">
                                        {remaining > 0 ? (
                                            <span className="text-rose-600 font-medium bg-rose-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                <HashtagIcon className="w-3 h-3" /> {remaining} left
                                            </span>
                                        ) : (
                                            <span className="text-red-500 font-medium bg-red-50 px-2 py-0.5 rounded-md">Sold Out</span>
                                        )}
                                        {statusText && (
                                            <span key={statusText} className={`font-medium px-2 py-0.5 rounded-md flex items-center gap-1 ${statusClasses} animate-[pulse_1s_ease-in-out_1]`}>
                                                <ClockIcon className="w-3 h-3" /> {statusText}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    {deal.originalPrice && (
                                        <div className="text-gray-400 line-through text-sm font-medium">{fmtMoney(deal.originalPrice)}</div>
                                    )}
                                    <div className="text-3xl font-black text-emerald-600 tracking-tight">{fmtMoney(deal.price ?? 0)}</div>
                                </div>
                            </div>

                            <div className="prose prose-gray max-w-none">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">About this Deal</h3>
                                <p className="text-gray-600 leading-relaxed text-base">{deal.description || deal.terms}</p>
                            </div>

                            {/* Daily Redemption Limit Notice */}
                            <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 flex-shrink-0">
                                        <HashtagIcon className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-900 mb-1">One Redemption Per Day</h3>
                                        <p className="text-gray-700 text-sm leading-relaxed">
                                            This deal can be redeemed <strong>once per day</strong>. Your daily limit resets at <strong>midnight</strong>.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Location & Hours Card */}
                        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <ClockIcon className="w-5 h-5 text-gray-400" />
                                Opening Hours
                            </h3>
                            {deal.merchant?.operating_hours ? (
                                <BusinessHours hours={deal.merchant.operating_hours || {}} />
                            ) : (
                                <p className="text-sm text-gray-400 italic">Hours not available</p>
                            )}

                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                                    <MapPinIcon className="w-5 h-5 text-gray-400" />
                                    Location
                                </h3>
                                <p className="text-gray-600 text-sm">{deal.merchant?.addressText}</p>
                            </div>
                        </div>

                        {/* Additional Info / Terms */}
                        <div className="flex gap-4 text-xs text-gray-400 pt-4">
                            <div className="flex items-center gap-1">
                                <CalendarIcon className="w-4 h-4" />
                                <span>Valid until {deal.validUntil ? new Date(deal.validUntil).toLocaleDateString() : "Ongoing"}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Fixed Footer Action --- */}
            <div className="fixed bottom-0 left-0 w-full p-4 bg-white border-t border-gray-100 z-50 md:sticky md:bottom-0 md:border-none md:p-0">
                <div className="md:hidden shadow-[0_-10px_40px_rgba(0,0,0,0.05)] absolute -top-4 inset-x-0 h-4 bg-gradient-to-t from-white to-transparent" />
                <div className="max-w-md mx-auto md:max-w-none md:mx-0 md:bg-white md:p-8 md:border-t md:border-gray-100 md:relative">
                    <button
                        onClick={handleRedeemClick}
                        disabled={isSoldOut || deal.merchant?.isClosed || isExpired}
                        className={`w-full py-4 rounded-xl font-bold text-lg shadow-xl shadow-emerald-200 flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${isSoldOut || isExpired
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
                            : deal.merchant?.isClosed
                                ? "bg-gray-900 text-white hover:bg-black" // Allow redeeming when closed? Or warn? Usually better to disable or warn.
                                : "bg-emerald-600 text-white hover:bg-emerald-500"
                            }`}
                    >
                        {isSoldOut ? "Sold Out" : isExpired ? "Expired" : "Redeem Offer"}
                    </button>
                    {deal.merchant?.isClosed && !isSoldOut && !isExpired && (
                        <p className="text-center text-xs text-amber-600 font-medium mt-2">
                            Merchant is currently closed.
                        </p>
                    )}
                </div>
            </div>

            <RedeemModal
                open={modalOpen}
                onClose={closeModal}
                activeDeal={deal}
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
                onClose={() => setNotificationModalOpen(false)}
                merchantName={deal?.merchant?.name || ""}
                isConfigured={isConfigured}
                loading={notificationLoading}
                onConfirm={() => toggleNotification(true)}
            />
        </main>
    );
}
