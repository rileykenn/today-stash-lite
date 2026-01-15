"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sb } from "@/lib/supabaseBrowser";
import Link from "next/link";
import { resolvePublicUrl } from "@/app/consumer/components/helpers";

type DaySchedule = {
    isOpen: boolean;
    open: string;
    close: string;
};

type WeeklyHours = {
    [key: string]: DaySchedule;
};

type ScheduleItem = {
    day: string;
    start: string;
    end: string;
    isFullDay: boolean; // Helper UI state
    enabled: boolean;   // Helper UI state
};

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default function CreateDealPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get("id");

    const [loading, setLoading] = useState(false);
    const [operatingHours, setOperatingHours] = useState<WeeklyHours | null>(null);
    const [merchantId, setMerchantId] = useState<string | null>(null);
    const [bannerUrl, setBannerUrl] = useState<string | null>(null);

    // Form State
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [terms, setTerms] = useState("");
    const [dealPrice, setDealPrice] = useState<string>("");
    const [originalPrice, setOriginalPrice] = useState<string>("");
    const [totalLimit, setTotalLimit] = useState<string>("");

    // Image State
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [useBanner, setUseBanner] = useState(false);

    const [error, setError] = useState<string | null>(null);

    // Scheduling State
    const [scheduleMode, setScheduleMode] = useState<"today" | "recurring">("today");

    // Today Mode
    const [todayStart, setTodayStart] = useState("");
    const [todayEnd, setTodayEnd] = useState("");
    const [todayFullDay, setTodayFullDay] = useState(false);

    // Recurring Mode
    const [recurringStartDate, setRecurringStartDate] = useState("");
    const [recurringEndDate, setRecurringEndDate] = useState("");
    const [recurringSchedule, setRecurringSchedule] = useState<ScheduleItem[]>(
        DAYS.map(d => ({ day: d, start: "", end: "", isFullDay: false, enabled: false }))
    );

    useEffect(() => {
        async function load() {
            const { data: { session } } = await sb.auth.getSession();
            if (!session) {
                router.push("/signin");
                return;
            }

            const { data: profile } = await sb
                .from("profiles")
                .select("merchant_id")
                .eq("user_id", session.user.id)
                .single();

            if (profile?.merchant_id) {
                setMerchantId(profile.merchant_id);
                const { data: merch } = await sb
                    .from("merchants")
                    .select("operating_hours, banner_url")
                    .eq("id", profile.merchant_id)
                    .single();

                if (merch) {
                    if (merch.operating_hours) setOperatingHours(merch.operating_hours as WeeklyHours);
                    if (merch.banner_url) setBannerUrl(merch.banner_url);
                }
            } else {
                router.push("/merchant-dashboard");
            }
        }
        load();
    }, [router]);

    // Load Deal for Editing
    useEffect(() => {
        if (!editId) return;

        async function loadDeal() {
            setLoading(true);
            const { data: deal, error } = await sb
                .from("offers")
                .select("*")
                .eq("id", editId)
                .single();

            if (error || !deal) {
                console.error("Error loading deal:", error);
                setError("Failed to load deal for editing.");
            } else {
                setTitle(deal.title);
                setDescription(deal.description || "");
                setTerms(deal.terms || "");
                setDealPrice(((deal.price_cents || 0) / 100).toFixed(2));
                setOriginalPrice(((deal.original_price_cents || 0) / 100).toFixed(2));
                if (deal.total_limit) setTotalLimit(String(deal.total_limit));

                // Image logic
                if (deal.image_url) {
                    // Logic to detect if it's the banner or custom
                    // Simplification: just show it as 'custom' override unless we match banner URL perfectly, 
                    // but for now, we just let them upload new or switch to banner.
                }

                // Schedule Logic Reverse Engineering
                // This is complex. We need to see if it matches "Today" (one-off) or "Recurring".
                // If recurring_schedule is set and valid_until is far future, likely recurring.
                if (deal.recurring_schedule && Array.isArray(deal.recurring_schedule) && deal.recurring_schedule.length > 0) {
                    setScheduleMode("recurring");
                    const startRaw = new Date(deal.valid_from);
                    const endRaw = new Date(deal.valid_until);
                    setRecurringStartDate(startRaw.toISOString().split('T')[0]);
                    setRecurringEndDate(endRaw.toISOString().split('T')[0]);

                    // Map schedule items
                    const newSched = DAYS.map(d => ({ day: d, start: "", end: "", isFullDay: false, enabled: false }));
                    (deal.recurring_schedule as any[]).forEach(item => {
                        const idx = newSched.findIndex(s => s.day === item.day);
                        if (idx !== -1) {
                            newSched[idx].enabled = true;
                            newSched[idx].start = item.start;
                            newSched[idx].end = item.end;
                            // Check full day heuristically? Or just leave manual.
                        }
                    });
                    setRecurringSchedule(newSched);
                } else if (deal.valid_from && deal.valid_until) {
                    // Likely "Today" or specific range
                    // Check if valid_from/until are same day
                    const s = new Date(deal.valid_from);
                    const e = new Date(deal.valid_until);
                    if (s.getDate() === e.getDate()) {
                        setScheduleMode("today");
                        setTodayStart(`${String(s.getHours()).padStart(2, '0')}:${String(s.getMinutes()).padStart(2, '0')}`);
                        setTodayEnd(`${String(e.getHours()).padStart(2, '0')}:${String(e.getMinutes()).padStart(2, '0')}`);
                    }
                }
            }
            setLoading(false);
        }

        if (editId) loadDeal();
    }, [editId]);

    // Initialize "Today" defaults when hours load - BUT ONLY FOR NEW DEALS
    useEffect(() => {
        if (editId) return; // Don't overwrite existing deal data with defaults

        if (operatingHours && scheduleMode === "today") {
            const now = new Date();
            const dayName = DAYS[now.getDay() === 0 ? 6 : now.getDay() - 1]; // getDay 0 is Sunday
            const hours = operatingHours[dayName];

            if (hours?.isOpen) {
                setTodayStart(hours.open);
                setTodayEnd(hours.close);
                setTodayFullDay(true);
            }
        }
    }, [operatingHours, scheduleMode, editId]);

    const handleTodayFullDay = (checked: boolean) => {
        setTodayFullDay(checked);
        if (checked && operatingHours) {
            const now = new Date();
            const dayName = DAYS[now.getDay() === 0 ? 6 : now.getDay() - 1];
            const hours = operatingHours[dayName];
            if (hours?.isOpen) {
                setTodayStart(hours.open);
                setTodayEnd(hours.close);
            }
        }
    };

    const toggleRecurringDay = (index: number) => {
        const newSchedule = [...recurringSchedule];
        newSchedule[index].enabled = !newSchedule[index].enabled;

        // Default to operating hours if enabling
        if (newSchedule[index].enabled && operatingHours) {
            const dayName = newSchedule[index].day;
            const hours = operatingHours[dayName];
            if (hours?.isOpen) {
                newSchedule[index].start = hours.open;
                newSchedule[index].end = hours.close;
                newSchedule[index].isFullDay = true;
            }
        }
        setRecurringSchedule(newSchedule);
    };

    const updateRecurringTime = (index: number, field: 'start' | 'end', value: string) => {
        const newSchedule = [...recurringSchedule];
        newSchedule[index][field] = value;
        newSchedule[index].isFullDay = false; // Custom time means not strictly full day anymore (UI simplification)
        setRecurringSchedule(newSchedule);
    };

    const handleRecurringFullDay = (index: number, checked: boolean) => {
        const newSchedule = [...recurringSchedule];
        newSchedule[index].isFullDay = checked;
        if (checked && operatingHours) {
            const dayName = newSchedule[index].day;
            const hours = operatingHours[dayName];
            if (hours?.isOpen) {
                newSchedule[index].start = hours.open;
                newSchedule[index].end = hours.close;
            }
        }
        setRecurringSchedule(newSchedule);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!merchantId) return;

        setLoading(true);
        setError(null);

        try {
            // ... Validation ...
            if (scheduleMode === "recurring") {
                if (!recurringStartDate || !recurringEndDate) throw new Error("Please select start and end dates.");
                if (!recurringSchedule.some(s => s.enabled)) throw new Error("Please select at least one day for the recurring schedule.");
            }

            // Image Validation
            if (!imageFile && !useBanner) {
                // Optional: You can enforce an image here if desired.
            }

            // 1. Determine Image URL
            let imageUrl = null;

            if (useBanner && bannerUrl) {
                imageUrl = bannerUrl;
            } else if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${merchantId}-${Math.random().toString(36).substring(2)}.${fileExt}`;
                const { error: uploadError } = await sb.storage
                    .from(process.env.NEXT_PUBLIC_OFFER_BUCKET || "offer-media")
                    .upload(fileName, imageFile);
                if (uploadError) throw uploadError;
                imageUrl = fileName;
            }

            // 2. Prepare Payload
            const price = parseFloat(dealPrice) * 100;
            const orig = parseFloat(originalPrice) * 100;
            const savings = orig - price;

            let validFrom = null;
            let validUntil = null;
            let schedulePayload = null;

            if (scheduleMode === "today") {
                const now = new Date();
                const start = new Date(now);
                const [sH, sM] = todayStart.split(':').map(Number);
                start.setHours(sH, sM, 0, 0);

                const end = new Date(now);
                const [eH, eM] = todayEnd.split(':').map(Number);
                end.setHours(eH, eM, 0, 0);

                validFrom = start.toISOString();
                validUntil = end.toISOString();
            } else {
                const start = new Date(recurringStartDate);
                start.setHours(0, 0, 0, 0);
                validFrom = start.toISOString();

                const end = new Date(recurringEndDate);
                end.setHours(23, 59, 59, 999);
                validUntil = end.toISOString();

                schedulePayload = recurringSchedule
                    .filter(s => s.enabled)
                    .map(s => ({ day: s.day, start: s.start, end: s.end }));
            }

            // Get Town Info
            const { data: merchantPos } = await sb
                .from("merchants")
                .select("town_id, town:towns(slug, name)")
                .eq("id", merchantId)
                .single();
            const areaKey = (merchantPos?.town as any)?.slug ?? "default";
            const areaName = (merchantPos?.town as any)?.name ?? "Local";



            if (editId) {
                // UPDATE
                const { error: updateError } = await sb
                    .from("offers")
                    .update({
                        title,
                        description,
                        terms,
                        price_cents: price,
                        original_price_cents: orig,
                        savings_cents: savings,
                        total_limit: totalLimit ? parseInt(totalLimit) : null,
                        valid_from: validFrom,
                        valid_until: validUntil,
                        recurring_schedule: schedulePayload,
                        exp_date: validUntil,
                        ...(imageUrl ? { image_url: imageUrl } : {}), // Only update image if changed/set
                        // is_active: true, // Don't force active on edit if they paused it elsewhere? Or maybe do. Let's leave as is.
                    } as any)
                    .eq("id", editId);

                if (updateError) throw updateError;
            } else {
                // INSERT
                const { error: insertError } = await sb
                    .from("offers")
                    .insert({
                        merchant_id: merchantId,
                        title,
                        description,
                        terms,
                        price_cents: price,
                        original_price_cents: orig,
                        savings_cents: savings, // Kept for backward compat / verification
                        total_limit: totalLimit ? parseInt(totalLimit) : null,
                        valid_from: validFrom,
                        valid_until: validUntil,
                        recurring_schedule: schedulePayload,
                        exp_date: validUntil, // Fallback for old clients
                        image_url: imageUrl,
                        is_active: true,
                        area_key: areaKey,
                        area_name: areaName
                    });

                if (insertError) throw insertError;
            }

            router.push("/merchant-dashboard");
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to create deal.");
        } finally {
            setLoading(false);
        }
    };

    if (!merchantId) return <div className="min-h-screen bg-[#0A0F13] flex items-center justify-center text-white">Loading...</div>;

    const isTodayOpen = () => {
        if (!operatingHours) return false;
        const now = new Date();
        const dayName = DAYS[now.getDay() === 0 ? 6 : now.getDay() - 1];
        return operatingHours[dayName]?.isOpen;
    };

    return (
        <main className="min-h-screen bg-[#0A0F13] text-white">
            <div className="relative z-10 mx-auto max-w-3xl px-4 py-8">
                <section className="bg-[#111821] border border-white/10 rounded-2xl p-6 md:p-8">
                    <h1 className="text-2xl font-bold mb-6">{editId ? "Edit Deal" : "Create New Deal"}</h1>
                    {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 text-red-400 rounded-xl text-sm">{error}</div>}

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Basic Info */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Deal Title</label>
                                <input required type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. 2-for-1 Coffee" className="w-full bg-[#0A0F13] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-colors" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
                                <textarea required rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the offer..." className="w-full bg-[#0A0F13] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-colors" />
                            </div>
                        </div>

                        {/* Price & Limits */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Deal Price ($)</label>
                                <input required type="number" step="0.01" value={dealPrice} onChange={e => setDealPrice(e.target.value)} placeholder="10.00" className="w-full bg-[#0A0F13] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-colors" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Original Price ($)</label>
                                <input required type="number" step="0.01" value={originalPrice} onChange={e => setOriginalPrice(e.target.value)} placeholder="20.00" className="w-full bg-[#0A0F13] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-colors" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Quantity (Optional)</label>
                                <input type="number" value={totalLimit} onChange={e => setTotalLimit(e.target.value)} placeholder="Unlimited" className="w-full bg-[#0A0F13] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-colors" />
                            </div>
                        </div>

                        {/* Scheduling */}
                        <div className="border-t border-white/10 pt-8">
                            <h3 className="text-lg font-semibold mb-4">When is this deal available?</h3>

                            <div className="flex bg-[#0A0F13] p-1 rounded-xl mb-6 w-full md:w-fit border border-white/10">
                                <button type="button" onClick={() => setScheduleMode("today")} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-medium transition-all ${scheduleMode === "today" ? "bg-emerald-500 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}>Today Only</button>
                                <button type="button" onClick={() => setScheduleMode("recurring")} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-medium transition-all ${scheduleMode === "recurring" ? "bg-emerald-500 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}>Schedule / Repeat</button>
                            </div>

                            {scheduleMode === "today" ? (
                                <div className="space-y-4 bg-[#0A0F13] p-6 rounded-xl border border-white/10">
                                    {!isTodayOpen() && (
                                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 text-yellow-200 text-sm rounded-lg mb-4">
                                            ⚠️ You are marked as closed today. <Link href="/merchant-dashboard/settings" className="underline hover:text-white">Edit Hours</Link>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1">
                                            <label className="block text-xs text-gray-400 mb-1">Start Time</label>
                                            <input type="time" value={todayStart} onChange={e => setTodayStart(e.target.value)} className="w-full bg-[#111821] border border-white/10 rounded-lg px-3 py-2 text-sm" />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs text-gray-400 mb-1">End Time</label>
                                            <input type="time" value={todayEnd} onChange={e => setTodayEnd(e.target.value)} className="w-full bg-[#111821] border border-white/10 rounded-lg px-3 py-2 text-sm" />
                                        </div>
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={todayFullDay} onChange={e => handleTodayFullDay(e.target.checked)} className="rounded border-white/20 bg-[#111821] text-emerald-500" />
                                        <span className="text-sm text-gray-300">Run for full business hours today</span>
                                    </label>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">Start Date</label>
                                            <input type="date" value={recurringStartDate} onChange={e => setRecurringStartDate(e.target.value)} className="w-full bg-[#0A0F13] border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">End Date</label>
                                            <input type="date" value={recurringEndDate} onChange={e => setRecurringEndDate(e.target.value)} className="w-full bg-[#0A0F13] border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-400">Weekly Schedule</label>
                                        {recurringSchedule.map((item, idx) => (
                                            <div key={item.day} className={`flex flex-col sm:flex-row gap-3 p-3 rounded-xl border transition-colors ${item.enabled ? "bg-[#0A0F13] border-emerald-500/30" : "bg-[#0A0F13]/50 border-white/5 opacity-60"}`}>
                                                <div className="flex items-center gap-3 w-32">
                                                    <input type="checkbox" checked={item.enabled} onChange={() => toggleRecurringDay(idx)} className="rounded border-white/20 bg-[#111821] text-emerald-500" />
                                                    <span className="capitalize text-sm font-medium">{item.day}</span>
                                                </div>

                                                {item.enabled && (
                                                    <div className="flex-1 flex items-center gap-3 flex-wrap">
                                                        <input type="time" value={item.start} onChange={e => updateRecurringTime(idx, 'start', e.target.value)} className="bg-[#111821] border border-white/10 rounded px-2 py-1 text-sm w-32" />
                                                        <span className="text-gray-500">-</span>
                                                        <input type="time" value={item.end} onChange={e => updateRecurringTime(idx, 'end', e.target.value)} className="bg-[#111821] border border-white/10 rounded px-2 py-1 text-sm w-32" />

                                                        <label className="flex items-center gap-2 ml-auto cursor-pointer">
                                                            <input type="checkbox" checked={item.isFullDay} onChange={e => handleRecurringFullDay(idx, e.target.checked)} className="rounded border-white/20 bg-[#111821] text-emerald-500" />
                                                            <span className="text-xs text-gray-400">Full Hours</span>
                                                        </label>
                                                    </div>
                                                )}

                                                {item.enabled && operatingHours && !operatingHours[item.day]?.isOpen && (
                                                    <div className="text-xs text-yellow-500 flex items-center">
                                                        Closed on {item.day}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    {!operatingHours && (
                                        <p className="text-xs text-gray-500 text-center">
                                            Don't see your hours? <Link href="/merchant-dashboard/settings" className="underline text-emerald-500">Configure them here</Link>
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Image & Terms */}
                        <div className="space-y-4 pt-4 border-t border-white/10">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Terms & Conditions</label>
                                <textarea rows={2} value={terms} onChange={e => setTerms(e.target.value)} placeholder="e.g. One per customer..." className="w-full bg-[#0A0F13] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-colors" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Deal Image</label>

                                {bannerUrl && (
                                    <label className="flex items-center gap-2 mb-3 cursor-pointer p-3 rounded-xl border border-white/10 bg-[#111821] hover:bg-[#161e29] transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={useBanner}
                                            onChange={(e) => {
                                                setUseBanner(e.target.checked);
                                                if (e.target.checked) setImageFile(null); // Clear manual upload
                                            }}
                                            className="rounded border-white/20 bg-[#0A0F13] text-emerald-500 w-5 h-5"
                                        />
                                        <div className="flex-1">
                                            <span className="block text-sm font-medium text-white">Use my business banner image</span>
                                            <span className="block text-xs text-gray-400">Your existing banner will be used for this deal.</span>
                                        </div>
                                        {/* Small preview of banner */}
                                        <img src={resolvePublicUrl(bannerUrl) || ""} alt="Banner" className="w-12 h-8 rounded object-cover ml-2 border border-white/10" />
                                    </label>
                                )}

                                {!useBanner && (
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={e => setImageFile(e.target.files?.[0] || null)}
                                        className="w-full bg-[#0A0F13] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-colors text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-500/10 file:text-emerald-400 hover:file:bg-emerald-500/20"
                                    />
                                )}
                            </div>
                        </div>

                        <div className="pt-4 flex gap-4">
                            <button type="button" onClick={() => router.back()} className="flex-1 py-3.5 rounded-xl border border-white/10 text-white font-semibold hover:bg-white/5 transition-colors" disabled={loading}>Cancel</button>
                            <button type="submit" disabled={loading} className="flex-1 py-3.5 rounded-xl bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 transition-all">{loading ? "Saving..." : (editId ? "Save Changes" : "Publish Deal")}</button>
                        </div>
                    </form>
                </section>
            </div>
        </main>
    );
}
