"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sb } from "@/lib/supabaseBrowser";
import { ArrowLeftIcon, MapPinIcon, ClockIcon, CalendarIcon } from "@heroicons/react/24/outline";
import Loading from "@/components/Loading";
import RedeemModal from "../components/RedeemModal";
import type { Coupon, Step } from "../components/types";
import { resolvePublicUrl, getMerchantName, getMerchantLogo, getMerchantBanner, getMerchantAddress } from "../components/helpers";
import { getMerchantStatus } from "../components/merchantStatus";

type ReservationRow = {
    id: string;
    slot_time: string;
    status: string;
    offer: any; // Joined offer
};

export default function MyReservationsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [reservations, setReservations] = useState<ReservationRow[]>([]);
    const [userSession, setUserSession] = useState<any>(null);

    // Redeem Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [activeReservation, setActiveReservation] = useState<ReservationRow | null>(null);
    const [activeDeal, setActiveDeal] = useState<Coupon | null>(null);
    const [step, setStep] = useState<Step>("instructions");
    const [flyerCode, setFlyerCode] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    useEffect(() => {
        async function init() {
            const { data: { session } } = await sb.auth.getSession();
            if (!session) {
                router.push("/signin");
                return;
            }
            setUserSession(session);

            // Fetch reservations
            const { data, error } = await sb
                .from("reservations")
                .select(`
          id, slot_time, status,
          offer:offers (
            id, merchant_id, title, description, terms, image_url, savings_cents,
            total_limit, redeemed_count, is_active, area_key, area_name, exp_date,
            price_cents, original_price_cents, valid_from, valid_until, recurring_schedule,
            merchant:merchants(*)
          )
        `)
                .eq("user_id", session.user.id)
                .eq("status", "pending")
                .order("slot_time", { ascending: true });

            if (error) {
                console.error("Error fetching reservations:", error);
            } else {
                setReservations(data || []);
            }
            setLoading(false);
        }
        init();
    }, [router]);

    const handleRedeemClick = (res: ReservationRow) => {
        // Map offer to Coupon
        const r = res.offer;
        if (!r) return;

        const townSlug = String(r.area_key ?? "").toLowerCase().trim();
        const merch = Array.isArray(r.merchant) ? r.merchant[0] : r.merchant;
        const statusResult = getMerchantStatus(merch); // Note: might need updating if simple obj

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
                isClosed: !statusResult.isOpen, // basic check
                operating_hours: merch.operating_hours
            },
            usedCount: r.redeemed_count ?? 0,
            totalLimit: r.total_limit,
            areaKey: townSlug,
            areaLabel: r.area_name ?? "Local",
            townSlug: townSlug,
            price: r.price_cents ? r.price_cents / 100 : null,
            originalPrice: r.original_price_cents ? r.original_price_cents / 100 : null,
            descriptionMerchant: null,
            validFrom: r.valid_from,
            validUntil: r.valid_until,
            collectionWindow: null
        };

        setActiveReservation(res);
        setActiveDeal(mapped);
        setStep("instructions");
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setActiveReservation(null);
        setActiveDeal(null);
        setFlyerCode("");
        setSubmitError(null);
    };

    const handleConfirmRedemption = async (codeOverride?: string) => {
        if (!activeDeal) return;
        const pin = (codeOverride ?? flyerCode).trim();
        if (!pin || pin.length < 6) return setSubmitError("Invalid PIN code.");

        setSubmitting(true);
        setSubmitError(null);

        try {
            // Call redemption RPC
            const { error } = await sb.rpc("redeem_offer_with_pin", {
                p_offer_id: activeDeal.id,
                p_pin: pin
            });

            if (error) throw error;

            // If successful, the RPC (updated version) should see the pending reservation and mark it redeemed.
            // Or we can manually remove it from the list locally for UI speed.

            setStep("success");

            // Refresh list after brief delay or just remove item
            setTimeout(() => {
                // Remove from local list
                setReservations(prev => prev.filter(item => item.id !== activeReservation?.id));
                closeModal();
            }, 2000);

        } catch (e: any) {
            setSubmitError(e.message || "Redemption failed");
        } finally {
            setSubmitting(false);
        }
    };

    const handleQrDetected = (val: string) => {
        if (step !== "instructions") return;
        const digits = val.replace(/[^\d]/g, "").slice(0, 6);
        if (digits) handleConfirmRedemption(digits);
    };

    if (loading) return <Loading message="Loading reservations..." />;

    return (
        <main className="min-h-screen bg-white pb-24 font-sans text-gray-900">
            <div className="max-w-3xl mx-auto px-6 pt-8">

                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-full hover:bg-gray-100 transition text-gray-500"
                    >
                        <ArrowLeftIcon className="w-6 h-6" />
                    </button>
                    <h1 className="text-3xl font-extrabold tracking-tight">My Reservations</h1>
                </div>

                {/* List */}
                {reservations.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-3xl border border-gray-100">
                        <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-900 mb-2">No active reservations</h3>
                        <p className="text-gray-500 max-w-xs mx-auto mb-6">You don't have any pending reservations.</p>
                        <button
                            onClick={() => router.push('/consumer')}
                            className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 transition"
                        >
                            Browse Deals
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {reservations.map(res => {
                            const merchantName = getMerchantName(res.offer.merchant[0]);
                            const date = new Date(res.slot_time);
                            const dateStr = date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
                            const timeStr = date.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' });

                            return (
                                <div key={res.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-5 transition hover:shadow-md">
                                    <div className="flex items-start gap-4">
                                        {/* Thumb */}
                                        <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                                            <img
                                                src={resolvePublicUrl(res.offer.image_url, "offer-media") ?? undefined}
                                                alt={res.offer.title}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>

                                        {/* Text */}
                                        <div className="space-y-1">
                                            <h3 className="font-bold text-gray-900 line-clamp-1">{res.offer.title}</h3>
                                            <p className="text-sm text-gray-500 font-medium">{merchantName}</p>
                                            <div className="flex items-center gap-3 text-xs text-emerald-700 mt-1 bg-emerald-50 w-fit px-2 py-1 rounded-md">
                                                <div className="flex items-center gap-1 font-bold">
                                                    <CalendarIcon className="w-3.5 h-3.5" />
                                                    {dateStr}
                                                </div>
                                                <div className="flex items-center gap-1 font-bold">
                                                    <ClockIcon className="w-3.5 h-3.5" />
                                                    {timeStr}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action */}
                                    <button
                                        onClick={() => handleRedeemClick(res)}
                                        className="w-full sm:w-auto px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-100 hover:bg-emerald-500 active:scale-95 transition whitespace-nowrap"
                                    >
                                        Redeem
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

            </div>

            {/* Shared Redeem Modal */}
            {activeDeal && (
                <RedeemModal
                    open={modalOpen}
                    onClose={closeModal}
                    activeDeal={activeDeal}
                    step={step}
                    lastScanned={null}
                    flyerCode={flyerCode}
                    setFlyerCode={setFlyerCode}
                    submitting={submitting}
                    submitError={submitError}
                    onConfirm={handleConfirmRedemption}
                    onQrDetected={handleQrDetected}
                />
            )}
        </main>
    );
}
