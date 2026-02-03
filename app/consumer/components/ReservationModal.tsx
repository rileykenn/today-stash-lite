"use client";

import { useEffect, useState, useMemo } from "react";
import { XMarkIcon, CalendarIcon, ClockIcon } from "@heroicons/react/24/outline";
import { sb } from "@/lib/supabaseBrowser";
import type { Coupon } from "./types";

type Props = {
    open: boolean;
    onClose: () => void;
    deal: Coupon | null;
    onSuccess: () => void;
};

type ScheduleItem = {
    day: string; // "monday", etc.
    start: string; // "09:00"
    end: string;   // "17:00"
    isOpen: boolean;
};

export default function ReservationModal({ open, onClose, deal, onSuccess }: Props) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Selection
    const [selectedDate, setSelectedDate] = useState<string>(""); // YYYY-MM-DD
    const [selectedTime, setSelectedTime] = useState<string>(""); // HH:MM

    // Reset state on open
    useEffect(() => {
        if (open) {
            setError(null);
            setSelectedDate("");
            setSelectedTime("");
        }
    }, [open]);

    // 1. Calculate Available Dates (Next 7 days)
    // "On the modal we have to make it so people can only reserve deals for that week"
    // Interpreted as rolling 7 days / this week.
    const availableDates = useMemo(() => {
        if (!deal || !deal.recurring_schedule) return [];

        const schedule = deal.recurring_schedule as ScheduleItem[];
        const validDays = [];
        const now = new Date();

        // Check next 7 days (reduced from 14)
        for (let i = 0; i < 7; i++) {
            const d = new Date(now);
            d.setDate(now.getDate() + i);

            const dayName = d.toLocaleDateString('en-AU', { weekday: 'long' }).toLowerCase();
            const rule = schedule.find(s => s.day.toLowerCase() === dayName);

            // Check if day matches rule AND is active
            if (rule && rule.isOpen !== false) {
                // Also check global validUntil
                if (deal.validUntil && new Date(deal.validUntil) < d) continue;

                // Format YYYY-MM-DD
                const offset = d.getTimezoneOffset() * 60000;
                const localISODate = new Date(d.getTime() - offset).toISOString().split('T')[0];

                // Format Label: "Mon 4 Nov"
                const label = d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });

                validDays.push({
                    date: localISODate,
                    label,
                    fullDayName: dayName,
                    rule
                });
            }
        }
        return validDays;
    }, [deal]);

    // 2. Calculate Available Times for Selected Date
    const availableTimes = useMemo(() => {
        if (!selectedDate || !deal) return [];
        const dateObj = availableDates.find(d => d.date === selectedDate);
        if (!dateObj) return [];

        const { rule } = dateObj;
        if (!rule.start || !rule.end) return [];

        const slots = [];
        const [sH, sM] = rule.start.split(':').map(Number);
        const [eH, eM] = rule.end.split(':').map(Number);

        // Create date objects for comparison
        // Note: selectedDate is YYYY-MM-DD string
        const start = new Date(`${selectedDate}T${rule.start}:00`);
        const end = new Date(`${selectedDate}T${rule.end}:00`);

        const now = new Date();

        // generate 30m increments
        const current = new Date(start);
        if (end <= start) return []; // Safety

        while (current < end) {
            // If selected date is today, filter past times
            if (current > now) {
                const h = current.getHours();
                const m = current.getMinutes();

                // Format: HH:MM (24h) for value, and 12h for display
                const val = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

                // 12h Format
                const ampm = h >= 12 ? 'PM' : 'AM';
                const h12 = h % 12 || 12;
                const label = `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;

                slots.push({ val, label });
            }
            current.setMinutes(current.getMinutes() + 30);
        }

        return slots;
    }, [selectedDate, deal, availableDates]);


    const handleSubmit = async () => {
        if (!selectedDate || !selectedTime) {
            setError("Please select a date and time.");
            return;
        }
        setLoading(true);
        setError(null);

        try {
            // 1. Check if suspended (handled by RLS but good to show UI error)
            const { data: { user } } = await sb.auth.getUser();
            if (!user) throw new Error("Not logged in");

            // 2. Insert Reservation (Using New RPC to handle stock decrement)
            const slotTimeIso = `${selectedDate}T${selectedTime}:00`;

            if (!deal) throw new Error("Deal not found");

            // "if someone reserves a deal ... update that as if someone has used that deal"
            // We use the new `reserve_offer` RPC which increments `redeemed_count`
            const { error: rpcError } = await sb.rpc("reserve_offer", {
                p_offer_id: deal.id,
                p_slot_time: new Date(slotTimeIso).toISOString()
            });

            if (rpcError) throw rpcError;

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            if (err.message?.includes("suspended")) {
                setError("Your account is suspended due to missed reservations.");
            } else if (err.message?.includes("sold out")) {
                setError("Sorry, this deal is now sold out.");
            } else {
                setError(err.message || "Failed to reserve.");
            }
        } finally {
            setLoading(false);
        }
    };

    if (!open || !deal) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-lg text-gray-900">Reserve Deal</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-8">
                    {/* Summary */}
                    <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                        <h4 className="font-bold text-gray-900 mb-1">{deal.title}</h4>
                        <div className="text-sm text-gray-600 flex items-start gap-2">
                            <span className="font-medium text-emerald-700">{deal.merchant?.name}</span>
                        </div>
                    </div>

                    {/* Custom Date Selector */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
                            <CalendarIcon className="w-4 h-4 text-emerald-600" /> Select Date
                        </label>

                        {availableDates.length === 0 ? (
                            <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100">
                                No available dates found for this week.
                            </p>
                        ) : (
                            <div className="grid grid-cols-3 gap-2">
                                {availableDates.map(d => {
                                    const isSelected = selectedDate === d.date;
                                    return (
                                        <button
                                            key={d.date}
                                            onClick={() => {
                                                setSelectedDate(d.date);
                                                setSelectedTime("");
                                            }}
                                            className={`
                                                flex flex-col items-center justify-center p-2 rounded-xl text-sm border transition-all
                                                ${isSelected
                                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200 scale-[1.02]"
                                                    : "bg-white text-gray-700 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50"
                                                }
                                            `}
                                        >
                                            <span className={`text-xs uppercase font-bold mb-0.5 ${isSelected ? "text-emerald-100" : "text-gray-400"}`}>
                                                {d.fullDayName.slice(0, 3)}
                                            </span>
                                            <span className="font-bold text-base">
                                                {d.date.split("-")[2]}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Custom Time Selector */}
                    <div className={`transition-opacity duration-300 ${selectedDate ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
                            <ClockIcon className="w-4 h-4 text-emerald-600" /> Select Time
                        </label>

                        {/* Time Grid */}
                        {selectedDate && availableTimes.length === 0 ? (
                            <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100">
                                No times available.
                            </p>
                        ) : (
                            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                                {availableTimes.map(t => {
                                    const isSelected = selectedTime === t.val;
                                    return (
                                        <button
                                            key={t.val}
                                            onClick={() => setSelectedTime(t.val)}
                                            className={`
                                                py-2 px-1 rounded-lg text-sm font-medium border transition-all truncate
                                                ${isSelected
                                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                                                    : "bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50"
                                                }
                                            `}
                                        >
                                            {t.label}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100 text-center font-medium animate-pulse">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-gray-100 bg-gray-50/50">
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !selectedDate || !selectedTime}
                        className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-bold text-lg shadow-lg hover:bg-emerald-500 active:scale-[0.98] transition disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
                    >
                        {loading ? "Confirming..." : "Confirm Reservation"}
                    </button>
                </div>
            </div>
        </div>
    );
}
