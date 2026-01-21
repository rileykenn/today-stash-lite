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
import { ArrowLeftIcon, MapPinIcon, BellIcon, ShareIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { getMerchantStatus, type MerchantStatus } from "../../components/merchantStatus";
import Loading from "@/components/Loading";

export default function DealDetailsPage() {
    const { id } = useParams();
    const router = useRouter();

    const [deal, setDeal] = useState<Coupon | null>(null);
    const [status, setStatus] = useState<MerchantStatus>({ isOpen: false, nextOpenText: null, closesAt: null, isManualClose: false }); // New State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Auth & Subscription
    const [userSession, setUserSession] = useState<any>(null);
    const [subscribedTownSlugs, setSubscribedTownSlugs] = useState<string[]>([]);

    // Redemption
    const [modalOpen, setModalOpen] = useState(false);
    const [step, setStep] = useState<Step>("instructions");
    const [flyerCode, setFlyerCode] = useState("");
    const [lastScanned, setLastScanned] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    // UI Logic
    const [isFavorite, setIsFavorite] = useState(false);

    useEffect(() => {
        async function init() {
            const { data: { session } } = await sb.auth.getSession();
            setUserSession(session);

            if (session) {
                const { data: profile } = await sb
                    .from("profiles")
                    .select("subscribed_towns")
                    .eq("user_id", session.user.id)
                    .single();
                if (profile?.subscribed_towns) {
                    setSubscribedTownSlugs(profile.subscribed_towns);
                }
            }

            if (!id) return;

            // Fetch Deal
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

            // Map to Coupon (Similar logic to consumer/page.tsx)
            const townSlug = String(r?.area_key ?? "").toLowerCase().trim();

            // Calculate Status
            const merch = Array.isArray(r.merchant) ? r.merchant[0] : r.merchant;
            const statusResult = getMerchantStatus(merch);
            setStatus(statusResult);

            // 2. Check Deal Specific Schedule
            let isDealClosed = false;
            const now = new Date();
            const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
            const dayName = days[now.getDay()];

            if (r.valid_from && new Date(r.valid_from) > now) isDealClosed = true;
            if (r.valid_until && new Date(r.valid_until) < now) isDealClosed = true;

            if (!isDealClosed && r.recurring_schedule && Array.isArray(r.recurring_schedule)) {
                const todayRule = r.recurring_schedule.find((s: any) => s.day?.toLowerCase() === dayName);
                if (!todayRule) {
                    isDealClosed = true;
                } else if (todayRule.start && todayRule.end) {
                    const currentMins = now.getHours() * 60 + now.getMinutes();
                    const [sH, sM] = todayRule.start.split(':').map(Number);
                    const [eH, eM] = todayRule.end.split(':').map(Number);
                    const startMins = sH * 60 + sM;
                    const endMins = eH * 60 + eM;
                    if (endMins < startMins) {
                        if (!(currentMins >= startMins || currentMins < endMins)) {
                            isDealClosed = true;
                        }
                    } else {
                        if (currentMins < startMins || currentMins >= endMins) {
                            isDealClosed = true;
                        }
                    }
                }
            }

            const isClosed = !statusResult.isOpen || isDealClosed;

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
                    isClosed: !statusResult.isOpen, // Sync for legacy checks if needed
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
            };

            setDeal(mapped);
            setLoading(false);
        }
        init();
    }, [id]);

    const handleRedeemClick = () => {
        if (!deal) return;

        // 1. Check Auth
        if (!userSession) {
            router.push(`/signup?next=${encodeURIComponent(`/consumer/deal/${deal.id}`)}`);
            return;
        }

        // 2. Check Subscription
        const isSubscribed = subscribedTownSlugs.includes(deal.townSlug);

        if (isSubscribed) {
            setStep("instructions");
            setModalOpen(true);
        } else {
            router.push(`/areas/${deal.townSlug}`);
        }
    };

    // Redemption Logic
    const closeModal = () => {
        setModalOpen(false);
        setFlyerCode("");
        setSubmitError(null);
    };

    const handleConfirmRedemption = async (codeOverride?: string) => {
        if (!deal) return;
        const pin = (codeOverride ?? flyerCode).trim();
        if (!pin || pin.length < 6) {
            setSubmitError("Invalid code.");
            return;
        }

        setSubmitting(true);
        setSubmitError(null);

        console.log("Attempting redemption from DEAL PAGE with:", { p_offer_id: deal.id, p_pin: pin });

        try {
            const response = await sb.rpc("redeem_offer_with_pin", {
                p_offer_id: deal.id,
                p_pin: pin
            });
            console.log("RPC Response:", response);

            const { error } = response;
            if (error) throw error;
            setStep("success");

            // Update local state (increment used count)
            setDeal(prev => prev ? ({ ...prev, usedCount: (prev.usedCount || 0) + 1 }) : null);

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

    if (loading) return <Loading message="Loading Deal..." />;
    if (!deal || error) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-red-500">{error || "Deal not found"}</div>;

    // Derived Logic
    const remaining = (deal.totalLimit ?? 0) - (deal.usedCount ?? 0);
    const isSoldOut = (deal.totalLimit ?? 0) > 0 && remaining <= 0;

    // Placeholder logic for "Check again at..." message
    // In a real app we'd parse the recurring_schedule to find the next window
    const checkAgainTime = "6:45 pm today";

    return (
        <main className="min-h-screen bg-gray-50 pb-24 text-gray-900 font-sans">

            {/* --- Desktop Wrapper: Grid Layout --- */}
            <div className="md:max-w-7xl md:mx-auto md:p-8 md:grid md:grid-cols-2 md:gap-12 md:items-start">

                {/* --- Desktop Left Column: Text Content --- */}
                <div className="hidden md:block md:order-1 pt-4">
                    <button
                        onClick={() => router.back()}
                        className="mb-8 flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors bg-transparent border-none p-0"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                        <span className="font-medium">Back</span>
                    </button>

                    <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-2">
                        {deal.merchant?.name}
                    </h1>
                    <p className="text-3xl text-gray-400 font-light mb-6">
                        {deal.title}
                    </p>

                    <div className="flex items-center gap-2 mb-6 text-gray-600">
                        <MapPinIcon className="w-5 h-5" />
                        <span className="font-medium">{deal.merchant?.addressText}</span>
                    </div>

                    {deal.daysLeft != null && deal.daysLeft < 0 ? (
                        <div className="flex items-center gap-2 text-gray-500 mb-8 font-medium">
                            <div className="w-2 h-2 rounded-full bg-gray-400" />
                            Expired
                        </div>
                    ) : status.isOpen ? (
                        <div className="flex items-center gap-2 text-emerald-600 mb-8 font-medium">
                            <div className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                            Open Now
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-rose-500 mb-8 font-medium">
                            <div className="w-2 h-2 rounded-full bg-rose-500" />
                            Closed <span className="text-gray-400 font-normal ml-1">• {status.nextOpenText}</span>
                        </div>
                    )}

                    {/* Desktop Body Content Moved Here */}
                    <div className="border-t border-gray-200 pt-8 mt-8">
                        <h3 className="font-bold text-2xl text-gray-900 mb-4">Description</h3>
                        <p className="text-gray-600 text-lg leading-relaxed">
                            {deal.description || deal.terms}
                        </p>
                    </div>
                </div>

                {/* --- Right Column (Desktop) / Top (Mobile): Hero Image --- */}
                <div className="relative w-full md:order-2">
                    <div className="aspect-[4/3] bg-gray-100 md:rounded-[32px] overflow-hidden relative shadow-sm">
                        {/* Background Image */}
                        <img
                            src={deal.imageUrl || deal.merchant?.bannerUrl || "/placeholder-deal.svg"}
                            alt={deal.title}
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                const banner = deal.merchant?.bannerUrl;
                                if (banner && target.src !== banner && target.src.indexOf(banner) === -1) {
                                    target.src = banner;
                                } else {
                                    target.src = "/placeholder-deal.svg";
                                }
                            }}
                            className="w-full h-full object-cover"
                        />

                        {/* Mobile: Top Overlay Controls (Hidden on Desktop) */}
                        <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-20 md:hidden">
                            <button
                                onClick={() => router.back()}
                                className="p-2 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/40 transition-colors"
                            >
                                <ArrowLeftIcon className="w-6 h-6" />
                            </button>
                            <div className="flex gap-3">
                                <button className="p-2 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/40 transition-colors">
                                    <ShareIcon className="w-6 h-6" />
                                </button>
                                <button className="p-2 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/40 transition-colors">
                                    <BellIcon className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Mobile: Status Badge (Hidden on Desktop) */}
                        <div className="absolute top-16 left-4 z-20 md:hidden">
                            {isSoldOut ? (
                                <span className="px-3 py-1 bg-white/90 backdrop-blur text-gray-900 text-sm font-bold rounded-full">
                                    Sold out
                                </span>
                            ) : deal.merchant?.isClosed ? (
                                <span className="px-3 py-1 bg-white/90 backdrop-blur text-gray-900 text-sm font-bold rounded-full">
                                    Closed
                                </span>
                            ) : null}
                        </div>

                        {/* Mobile: Bottom Gradient Overlay (Hidden on Desktop) */}
                        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/80 to-transparent z-10 md:hidden" />

                        {/* Mobile: Merchant Info Overlay (Hidden on Desktop) */}
                        <div className="absolute bottom-4 left-4 z-20 flex items-center gap-3 md:hidden">
                            <div>
                                <h1 className="text-xl font-bold text-white leading-tight drop-shadow-md">
                                    {deal.merchant?.name}
                                </h1>
                                <p className="text-white/90 text-sm font-medium drop-shadow-md">
                                    {deal.title}
                                </p>
                            </div>
                        </div>

                        {/* Desktop Only: Bottom "Today's offers" Pill inside image */}
                        <div className="hidden md:block absolute bottom-6 left-6 z-20">
                            <span className="px-4 py-2 bg-black/80 backdrop-blur text-white text-sm font-bold rounded-full">
                                Today's offers
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Body Content (Mobile Layout) --- */}
            {/* Hidden on Desktop because we moved content to the Left Column above */}
            <div className="px-4 py-4 max-w-2xl mx-auto space-y-4 md:hidden">

                {/* 1. Basic Info Row */}
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-1">
                        {/* Stars and Rating Removed */}
                    </div>
                    <div className="flex flex-col items-end">
                        {deal.originalPrice && (
                            <span className="text-gray-400 line-through text-sm">{fmtMoney(deal.originalPrice)}</span>
                        )}
                        <span className="text-xl font-extrabold text-gray-900">{fmtMoney(deal.price ?? 0)}</span>
                    </div>
                </div>

                {/* 2. Location Box */}
                <div className="border-t border-b border-gray-200 py-4 flex items-center justify-between">
                    <div className="flex items-start gap-3">
                        <MapPinIcon className="w-5 h-5 text-gray-500 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-emerald-700 leading-snug">
                                {deal.merchant?.addressText}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 3. Notification Bell (Simplified) */}
                <div className="bg-gray-100 rounded-xl p-4">
                    <div
                        onClick={() => setIsFavorite(!isFavorite)}
                        className="flex items-center justify-between cursor-pointer group"
                    >
                        <p className="text-emerald-800 font-bold text-sm pr-4">
                            Allow notifications for this deal?
                        </p>
                        <div className={`p-2 rounded-full transition-colors ${isFavorite ? "bg-emerald-100 text-emerald-500" : "bg-gray-200 text-gray-400 group-hover:bg-gray-300"}`}>
                            <BellIcon className={`w-6 h-6 ${isFavorite ? "fill-current" : ""}`} />
                        </div>
                    </div>
                </div>

                {/* 4. Description */}
                <div className="pt-2">
                    <h3 className="font-bold text-gray-900 mb-2">Description</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                        {deal.description || deal.terms}
                    </p>
                </div>

                {/* Spacer for fixed footer */}
                <div className="h-24"></div>
            </div>

            {/* --- Fixed Footer Action --- */}
            {/* On Desktop, move this inline? Or keep it? User didn't specify, but fixed footer on desktop is weird. 
                I'll keep it fixed for now but maybe style it differently or hide it if we want a pure info view.
                Actually, let's keep it 'fixed' but perhaps aligned to the right or integrated. 
                For now, keeping faithful to "keep mobile same" means touching mobile least possible.
                On Desktop, I will modify it to be relative or part of the right column? 
                The screenshot shows "View offers" button on the right under the image.
            */}
            <div className="fixed bottom-0 left-0 w-full p-4 bg-white border-t border-gray-100 z-50 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] md:static md:bg-transparent md:border-none md:shadow-none md:p-0 md:mt-8 md:max-w-7xl md:mx-auto md:px-8">
                <div className="md:flex md:justify-end">
                    <button
                        onClick={handleRedeemClick}
                        disabled={isSoldOut || deal.merchant?.isClosed || (deal.daysLeft != null && deal.daysLeft < 0)}
                        className={`w-full md:w-auto md:px-8 py-3.5 rounded-[20px] font-bold text-lg text-center transition-colors ${isSoldOut
                            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                            : (deal.daysLeft != null && deal.daysLeft < 0)
                                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                : deal.merchant?.isClosed
                                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                    : "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 md:bg-white md:text-gray-900 md:border md:border-gray-300 md:hover:bg-gray-50"
                            }`}
                    >
                        {isSoldOut ? "Sold out" : (deal.daysLeft != null && deal.daysLeft < 0) ? "Expired" : deal.merchant?.isClosed ? "Redeem Now" : "Redeem Now"}
                    </button>
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
        </main>
    );
}
