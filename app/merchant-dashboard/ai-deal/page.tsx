'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { sb } from '@/lib/supabaseBrowser';
import { generateDealSuggestions, GeneratedDeal } from '@/app/actions/generate-deal-ai';
import { SparklesIcon, ArrowLeftIcon, CheckIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { TimePicker } from '@/components/TimePicker';

/* =======================
   Types
   ======================= */
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
    isFullDay: boolean;
    enabled: boolean;
};

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

/* =======================
   Preview Component (Consumer Style)
   ======================= */
function CouponPreview({
    title,
    merchantName,
    dealPrice,
    originalPrice,
    imageUrl,
    description
}: {
    title: string;
    merchantName: string;
    dealPrice?: string;
    originalPrice?: string;
    imageUrl?: string;
    description?: string;
}) {
    // Formatting helpers
    const fmt = (val: string | undefined) => {
        if (!val) return '$--';
        const num = parseFloat(val);
        return isNaN(num) ? '$--' : num.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });
    };

    return (
        <div className="group relative flex flex-col w-full max-w-sm mx-auto rounded-t-xl overflow-hidden shadow-lg select-none ring-1 ring-white/10 bg-[#1a1a1a]">
            {/* Image Section */}
            <div className="relative w-full h-48 overflow-hidden bg-gray-800">
                <img
                    src={imageUrl || "/placeholder-deal.svg"}
                    alt={title}
                    className="w-full h-full object-cover opacity-90"
                />
                <div className="absolute top-3 left-3 right-3 z-10 flex justify-between">
                    <span className="px-3 py-1 bg-emerald-500/90 backdrop-blur text-white text-xs font-bold rounded-full shadow-sm">
                        Local
                    </span>
                    <span className="px-3 py-1 bg-blue-500/90 backdrop-blur text-white text-xs font-bold rounded-full shadow-sm">
                        Deal
                    </span>
                </div>
            </div>

            {/* Content Section */}
            <div className="relative flex flex-col pt-4 pb-4 px-4 text-left bg-[#1a1a1a]">
                <div className="relative z-10 flex flex-col">
                    <h3 className="text-white font-bold text-xl truncate leading-snug mb-0.5">
                        {title || "Untitled Deal"}
                    </h3>
                    <p className="text-white/60 text-sm font-normal truncate mb-2">
                        {merchantName}
                    </p>
                    {description && <p className="text-white/40 text-xs line-clamp-2 mb-3">{description}</p>}

                    <div className="flex justify-between items-end mt-auto">
                        <div className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                            <SparklesIcon className="w-3 h-3" />
                            <span>Verified Deal</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            {originalPrice && (
                                <span className="text-gray-500 line-through text-base font-medium decoration-gray-500/50">
                                    {fmt(originalPrice)}
                                </span>
                            )}
                            <span className="font-black text-4xl text-emerald-400 tracking-tight leading-none">
                                {fmt(dealPrice)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Serrated Footer */}
            <div
                className="relative w-full pb-4 pt-2 bg-[#1a1a1a]"
                style={{
                    maskImage: "radial-gradient(circle at bottom, transparent 6px, black 6.5px), linear-gradient(black, black)",
                    maskSize: "20px 20px, 100% calc(100% - 10px)",
                    maskPosition: "bottom, top",
                    maskRepeat: "repeat-x, no-repeat",
                    maskComposite: "intersect",
                    WebkitMaskImage: "radial-gradient(circle at bottom, transparent 6px, black 6.5px), linear-gradient(black, black)",
                    WebkitMaskSize: "20px 20px, 100% calc(100% - 10px)",
                    WebkitMaskPosition: "bottom, top",
                    WebkitMaskRepeat: "repeat-x, no-repeat",
                    WebkitMaskComposite: "source-over, source-over",
                }}
            >
                <div className="absolute top-0 inset-x-4 border-t border-dashed border-white/10" />
                <div className="text-center mt-1.5">
                    <span className="font-mono text-xs text-white/40 tracking-widest uppercase opacity-90">
                        click to redeem
                    </span>
                </div>
            </div>
        </div>
    );
}


/* =======================
   Main Page
   ======================= */

export default function AIDealPage() {
    const router = useRouter();
    const [merchantId, setMerchantId] = useState<string | null>(null);
    const [merchantName, setMerchantName] = useState("Your Business");
    const [merchantBanner, setMerchantBanner] = useState<string | undefined>(undefined);
    const [operatingHours, setOperatingHours] = useState<WeeklyHours | null>(null);

    // States: 'input' -> 'generating' -> 'selection' -> 'editing' -> 'saving'
    const [step, setStep] = useState<'input' | 'generating' | 'selection' | 'editing' | 'saving'>('input');

    const [description, setDescription] = useState('');
    const [suggestions, setSuggestions] = useState<GeneratedDeal[]>([]);

    // Edit Form State
    const [finalTitle, setFinalTitle] = useState('');
    const [finalDesc, setFinalDesc] = useState('');
    const [originalPrice, setOriginalPrice] = useState('');
    const [dealPrice, setDealPrice] = useState('');
    const [totalLimit, setTotalLimit] = useState('10'); // Default to 10 for scarcity

    // Scheduling State
    const [scheduleMode, setScheduleMode] = useState<"today" | "recurring">("today");
    // Today Mode
    const [todayStart, setTodayStart] = useState("");
    const [todayEnd, setTodayEnd] = useState("");
    const [todayFullDay, setTodayFullDay] = useState(false);
    // Recurring Mode
    // Default all items effectively "blank", will be populated by AI
    const [recurringSchedule, setRecurringSchedule] = useState<ScheduleItem[]>(
        DAYS.map(d => ({ day: d, start: "", end: "", isFullDay: true, enabled: false }))
    );

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function checkMerchant() {
            const { data: { session } } = await sb.auth.getSession();
            if (!session) {
                router.push('/signin');
                return;
            }
            const { data: profile } = await sb
                .from('profiles')
                .select('merchant_id')
                .eq('user_id', session.user.id)
                .single();

            if (profile?.merchant_id) {
                setMerchantId(profile.merchant_id);
                // Fetch basic merchant info for preview & hours
                const { data: m } = await sb
                    .from('merchants')
                    .select('name, banner_url, operating_hours')
                    .eq('id', profile.merchant_id)
                    .single();

                if (m) {
                    setMerchantName(m.name);
                    if (m.banner_url) {
                        setMerchantBanner(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${process.env.NEXT_PUBLIC_OFFER_BUCKET || "offer-media"}/${m.banner_url}`);
                    }
                    if (m.operating_hours) {
                        setOperatingHours(m.operating_hours as WeeklyHours);
                    }
                }
            } else {
                router.push('/merchant-dashboard?error=not_merchant');
            }
        }
        checkMerchant();
    }, [router]);

    // Set today defaults when operating hours load
    useEffect(() => {
        if (operatingHours && scheduleMode === "today" && !todayStart) {
            const now = new Date();
            const dayName = DAYS[now.getDay() === 0 ? 6 : now.getDay() - 1]; // getDay 0 is Sunday
            const hours = operatingHours[dayName];
            if (hours?.isOpen) {
                setTodayStart(hours.open);
                setTodayEnd(hours.close);
                setTodayFullDay(true);
            }
        }
    }, [operatingHours, scheduleMode, todayStart]);


    const handleGenerate = async () => {
        if (!description.trim()) return;
        setStep('generating');
        setError(null);

        try {
            const results = await generateDealSuggestions(description);
            setSuggestions(results);
            setStep('selection');
        } catch (err: any) {
            setError(err.message || 'Failed to generate ideas.');
            setStep('input');
        }
    };

    const handleSelect = (deal: GeneratedDeal) => {
        // Populate form with AI Data
        setFinalTitle(deal.title);
        setFinalDesc(deal.description);
        // Reset prices for manual entry
        setOriginalPrice('');
        setDealPrice('');
        setTotalLimit('10');

        // Handle Schedule Logic
        if (deal.scheduleDays && deal.scheduleDays.length > 0) {
            setScheduleMode('recurring');
            // Auto-populate recurring schedule
            const newSchedule = recurringSchedule.map(item => {
                const shouldEnable = deal.scheduleDays.map(d => d.toLowerCase()).includes(item.day);

                let start = item.start;
                let end = item.end;
                let isFullDay = true;

                // Time Strategy Logic
                if (shouldEnable && deal.timeStrategy && operatingHours && operatingHours[item.day]?.isOpen) {
                    const op = operatingHours[item.day];

                    // Start Time
                    if (deal.timeStrategy.start === "open") start = op.open;
                    else start = deal.timeStrategy.start;

                    // End Time
                    if (deal.timeStrategy.end === "close") end = op.close;
                    else end = deal.timeStrategy.end;

                    // Determine if full day
                    if (start === op.open && end === op.close) {
                        isFullDay = true;
                    } else {
                        isFullDay = false;
                    }
                } else if (shouldEnable && operatingHours && operatingHours[item.day]?.isOpen) {
                    // Default to full day if no strategy
                    start = operatingHours[item.day].open;
                    end = operatingHours[item.day].close;
                    isFullDay = true;
                }

                return {
                    ...item,
                    enabled: shouldEnable,
                    start,
                    end,
                    isFullDay
                };
            });
            setRecurringSchedule(newSchedule);
        } else {
            // Default to 'Recurring' (All Days) if no specific days mentioned
            setScheduleMode('recurring');
            const newSchedule = recurringSchedule.map(item => {
                let start = item.start;
                let end = item.end;
                let isFullDay = true;

                // Use operating hours if available
                if (operatingHours && operatingHours[item.day]?.isOpen) {
                    start = operatingHours[item.day].open;
                    end = operatingHours[item.day].close;
                    isFullDay = true;
                }

                return {
                    ...item,
                    enabled: true, // Enable all by default
                    start,
                    end,
                    isFullDay
                };
            });
            setRecurringSchedule(newSchedule);
        }

        setStep('editing');
    };

    // --- Scheduling Helpers ---
    const isTodayOpen = () => {
        if (!operatingHours) return false;
        const now = new Date();
        const dayName = DAYS[now.getDay() === 0 ? 6 : now.getDay() - 1];
        return operatingHours[dayName]?.isOpen;
    };

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

        // Default to Full Business Hours if enabling
        if (newSchedule[index].enabled && operatingHours) {
            const dayName = newSchedule[index].day;
            const hours = operatingHours[dayName];
            if (hours?.isOpen) {
                newSchedule[index].start = hours.open;
                newSchedule[index].end = hours.close;
                newSchedule[index].isFullDay = true;
            } else {
                newSchedule[index].isFullDay = false;
            }
        }
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

    const updateRecurringTime = (index: number, field: 'start' | 'end', value: string) => {
        const newSchedule = [...recurringSchedule];
        newSchedule[index][field] = value;
        newSchedule[index].isFullDay = false; // Custom time means not strictly full day anymore
        setRecurringSchedule(newSchedule);
    };


    const handleSave = async () => {
        if (!merchantId) return;

        // Validation
        if (!finalTitle || !originalPrice || !dealPrice) {
            setError("Please fill in all fields.");
            return;
        }

        const op = parseFloat(originalPrice);
        const dp = parseFloat(dealPrice);

        if (isNaN(op) || isNaN(dp) || dp >= op) {
            setError("Deal price must be lower than original price.");
            return;
        }

        // Schedule Validation
        if (scheduleMode === "recurring") {
            if (!recurringSchedule.some(s => s.enabled)) {
                setError("Please select at least one day for the recurring schedule.");
                return;
            }
            const badDays = recurringSchedule.filter(s => s.enabled && operatingHours && !operatingHours[s.day]?.isOpen);
            if (badDays.length > 0) {
                setError(`You cannot schedule deals on days you are closed: ${badDays.map(d => d.day).join(', ')}`);
                return;
            }
        }

        setStep('saving');
        setError(null);

        try {
            const savingsCents = Math.round((op - dp) * 100);
            const priceCents = Math.round(dp * 100);
            const originalPriceCents = Math.round(op * 100);

            // Schedule Payload
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
                // Indefinite Recurring
                const start = new Date();
                start.setHours(0, 0, 0, 0);
                validFrom = start.toISOString();

                const end = new Date();
                end.setFullYear(end.getFullYear() + 5); // 5 years validity
                end.setHours(23, 59, 59, 999);
                validUntil = end.toISOString();

                schedulePayload = recurringSchedule
                    .filter(s => s.enabled)
                    .map(s => ({ day: s.day, start: s.start, end: s.end }));
            }

            // Get merchant area info
            const { data: merchantPos } = await sb
                .from('merchants')
                .select('town_id, town:towns(slug, name)')
                .eq('id', merchantId)
                .single();

            const areaKey = (merchantPos?.town as any)?.slug ?? 'default';
            const areaName = (merchantPos?.town as any)?.name ?? 'Local';

            const { error: insertError } = await sb
                .from('offers')
                .insert({
                    merchant_id: merchantId,
                    title: finalTitle,
                    description: finalDesc,
                    original_price_cents: originalPriceCents,
                    price_cents: priceCents,
                    savings_cents: savingsCents,
                    is_active: true,
                    area_key: areaKey,
                    area_name: areaName,
                    // Schedule
                    valid_from: validFrom,
                    valid_until: validUntil,
                    recurring_schedule: schedulePayload,
                    exp_date: validUntil,
                    // Defaults
                    total_limit: totalLimit ? parseInt(totalLimit) : 10,
                    image_url: null
                });

            if (insertError) throw insertError;

            router.push('/merchant-dashboard?success=deal_created');
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to save deal.');
            setStep('editing');
        }
    };

    if (!merchantId) {
        return <div className="min-h-screen bg-[#05070A] flex items-center justify-center text-white">Loading...</div>;
    }

    return (
        <main className="min-h-screen bg-[#05070A] text-white px-4 py-8">
            {/* UPDATED: Increased max-width to fix desktop layout cutting off cards */}
            <div className="w-full max-w-[1700px] mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    {step !== 'input' && (
                        <button onClick={() => setStep(step === 'editing' ? 'selection' : 'input')} className="p-2 hover:bg-white/5 rounded-full transition">
                            <ArrowLeftIcon className="w-5 h-5" />
                        </button>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent inline-flex items-center gap-2">
                            <SparklesIcon className="w-6 h-6 text-emerald-400" />
                            AI Deal Creator
                        </h1>
                        <p className="text-sm text-white/50">Draft high-converting deals in seconds.</p>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 text-red-400 rounded-xl text-sm animate-pulse">
                        {error}
                    </div>
                )}

                {/* STEP 1: INPUT */}
                {step === 'input' && (
                    <div className="max-w-2xl mx-auto">
                        <div className="bg-[#111821] rounded-2xl p-8 border border-white/10 shadow-xl">
                            <label className="block text-sm font-medium mb-3 text-white/80">Describe your goal or promotion</label>
                            <textarea
                                className="w-full bg-[#0A0F13] border border-white/10 rounded-xl px-4 py-3 min-h-[150px] focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-white/20 text-white"
                                placeholder="e.g. It's slow on Tuesdays. I want to offer a 2-for-1 pizza special for lunch to bring in local workers."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                            <div className="mt-2 text-xs text-white/30 text-right">
                                Be specific about what you sell and who you want to attract.
                            </div>
                            <button
                                onClick={handleGenerate}
                                disabled={!description.trim()}
                                className="mt-6 w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
                            >
                                <SparklesIcon className="w-5 h-5" />
                                Generate Ideas
                            </button>
                        </div>

                        <div className="mt-6 text-center">
                            <Link
                                href="/merchant-dashboard/create-deal"
                                className="text-sm text-white/40 hover:text-white transition-colors underline decoration-white/20 hover:decoration-white/50"
                            >
                                Create my own deal manually instead
                            </Link>
                        </div>
                    </div>
                )}

                {/* STEP 2: GENERATING */}
                {step === 'generating' && (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                            <SparklesIcon className="w-6 h-6 text-emerald-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl font-semibold text-white">Drafting your deals...</h3>
                            <p className="text-white/40 text-sm">Our AI is analyzing your request.</p>
                        </div>
                    </div>
                )}

                {/* STEP 3: SELECTION */}
                {step === 'selection' && (
                    <div className="space-y-6">
                        <div className="text-center mb-8">
                            <h2 className="text-xl font-semibold text-white">Choose a Concept</h2>
                            <p className="text-white/50 text-sm">Select the best starting point. You can edit it next.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {suggestions.map((deal, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => handleSelect(deal)}
                                    className="group cursor-pointer flex flex-col h-full bg-[#111821] rounded-2xl overflow-hidden border border-white/10 hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-900/20 transition-all duration-300 relative"
                                >
                                    {/* Preview Render */}
                                    <div className="p-4 bg-[#0A0F13]/50">
                                        <CouponPreview
                                            title={deal.title}
                                            description={deal.description}
                                            merchantName={merchantName}
                                            imageUrl={merchantBanner}
                                            // Mock prices for visual selection
                                            originalPrice="20"
                                            dealPrice="10"
                                        />
                                    </div>

                                    <div className="p-5 flex-grow flex flex-col">
                                        <h3 className="font-bold text-lg text-white mb-2 group-hover:text-emerald-400 transition-colors">{deal.title}</h3>
                                        <p className="text-sm text-white/60 mb-4">{deal.description}</p>

                                        <div className="mt-auto pt-4 border-t border-white/5 flex justify-center">
                                            <span className="text-emerald-400 text-sm font-medium flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                                                Select this deal <CheckIcon className="w-4 h-4" />
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="text-center pt-8">
                            <button
                                onClick={() => setStep('input')}
                                className="text-sm text-white/30 hover:text-white transition"
                            >
                                Try a different prompt
                            </button>
                            <span className="text-white/20 px-2">•</span>
                            <Link
                                href="/merchant-dashboard/create-deal"
                                className="text-sm text-white/30 hover:text-white transition"
                            >
                                Create manually instead
                            </Link>
                        </div>
                    </div>
                )}

                {/* STEP 4: EDITING */}
                {(step === 'editing' || step === 'saving') && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

                        {/* LEFT: FORM */}
                        <div className="bg-[#111821] rounded-2xl p-6 border border-white/10 space-y-6">

                            {/* --- Pricing Section --- */}
                            <div>
                                <h2 className="text-xl font-bold text-white mb-4">Finalize Pricing</h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Deal Title</label>
                                        <input
                                            value={finalTitle}
                                            onChange={(e) => setFinalTitle(e.target.value)}
                                            className="w-full bg-[#0A0F13] rounded-xl px-4 py-3 border border-white/10 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none text-white placeholder-white/20"
                                            placeholder="e.g. 50% Off Pizza"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Description</label>
                                        <textarea
                                            value={finalDesc}
                                            onChange={(e) => setFinalDesc(e.target.value)}
                                            className="w-full bg-[#0A0F13] rounded-xl px-4 py-3 border border-white/10 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none text-white placeholder-white/20 min-h-[100px]"
                                            placeholder="Describe the offer details..."
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Original Price ($)</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-3 text-white/30">$</span>
                                                <input
                                                    type="number"
                                                    value={originalPrice}
                                                    onChange={(e) => setOriginalPrice(e.target.value)}
                                                    className="w-full bg-[#0A0F13] rounded-xl pl-8 pr-4 py-3 border border-white/10 focus:border-emerald-500/50 outline-none text-white placeholder-white/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Deal Price ($)</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-3 text-emerald-400/50">$</span>
                                                <input
                                                    type="number"
                                                    value={dealPrice}
                                                    onChange={(e) => setDealPrice(e.target.value)}
                                                    className="w-full bg-[#0A0F13] rounded-xl pl-8 pr-4 py-3 border border-emerald-500/20 focus:border-emerald-500/50 outline-none text-white placeholder-emerald-500/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quantity Input */}
                                    <div>
                                        <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 text-right">Quantity Available</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={totalLimit}
                                                onChange={(e) => setTotalLimit(e.target.value)}
                                                className="w-full bg-[#0A0F13] rounded-xl px-4 py-3 border border-white/10 focus:border-emerald-500/50 outline-none text-white text-right placeholder-white/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                placeholder="10"
                                            />
                                            <p className="text-[10px] text-emerald-500/80 text-right mt-1">Keep it low (e.g. 10) to create scarcity!</p>
                                        </div>
                                    </div>

                                    {originalPrice && dealPrice && Number(originalPrice) > Number(dealPrice) && (
                                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between">
                                            <span className="text-emerald-400 font-medium">Customer Savings</span>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-2xl font-bold text-white">${(Number(originalPrice) - Number(dealPrice)).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* --- Scheduling Section --- */}
                            <div className="border-t border-white/10 pt-6">
                                <h3 className="text-xl font-bold text-white mb-4">Availability</h3>
                                <div className="flex bg-[#0A0F13] p-1 rounded-xl mb-6 w-full border border-white/10">
                                    <button onClick={() => setScheduleMode("today")} className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${scheduleMode === "today" ? "bg-emerald-500 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}>Today Only</button>
                                    <button onClick={() => setScheduleMode("recurring")} className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${scheduleMode === "recurring" ? "bg-emerald-500 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}>Repeat</button>
                                </div>

                                {scheduleMode === "today" ? (
                                    <div className="space-y-4 bg-[#0A0F13] p-6 rounded-xl border border-white/10">
                                        {!isTodayOpen() && (
                                            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 text-yellow-200 text-sm rounded-lg mb-4">
                                                ⚠️ You are marked as closed today. <Link href="/merchant-dashboard/settings" className="underline hover:text-white">Edit Hours</Link>
                                            </div>
                                        )}
                                        {!todayFullDay && (
                                            <div className="flex items-center gap-4">
                                                <div className="flex-1">
                                                    <label className="block text-xs text-gray-400 mb-1">Start Time</label>
                                                    <TimePicker value={todayStart} onChange={setTodayStart} />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="block text-xs text-gray-400 mb-1">End Time</label>
                                                    <TimePicker value={todayEnd} onChange={setTodayEnd} />
                                                </div>
                                            </div>
                                        )}
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={todayFullDay} onChange={e => handleTodayFullDay(e.target.checked)} className="rounded border-white/20 bg-[#111821] text-emerald-500" />
                                            <span className="text-sm text-gray-300">Run for full business hours today</span>
                                        </label>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-400">Weekdays</label>
                                            <p className="text-xs text-gray-500 mb-2">Deal repeats weekly on these days.</p>

                                            {recurringSchedule.map((item, idx) => (
                                                <div key={item.day} className={`flex flex-col gap-3 p-3 rounded-xl border transition-colors ${item.enabled ? "bg-[#0A0F13] border-emerald-500/30" : "bg-[#0A0F13]/50 border-white/5 opacity-60"}`}>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <input type="checkbox" checked={item.enabled} onChange={() => toggleRecurringDay(idx)} className="rounded border-white/20 bg-[#111821] text-emerald-500" />
                                                            <span className="capitalize text-sm font-medium">{item.day}</span>
                                                        </div>

                                                        {item.enabled && operatingHours && !operatingHours[item.day]?.isOpen && (
                                                            <span className="text-xs text-red-400 font-medium">Closed</span>
                                                        )}
                                                    </div>

                                                    {/* Time Selection if Enabled and Open */}
                                                    {item.enabled && operatingHours && operatingHours[item.day]?.isOpen && (
                                                        <div className="pl-7 space-y-2">
                                                            <div className="flex items-center gap-3 flex-wrap">
                                                                <label className="flex items-center gap-2 cursor-pointer">
                                                                    <input type="checkbox" checked={item.isFullDay} onChange={e => handleRecurringFullDay(idx, e.target.checked)} className="rounded border-white/20 bg-[#111821] text-emerald-500" />
                                                                    <span className="text-xs text-gray-400">Full Business Day ({operatingHours[item.day].open} - {operatingHours[item.day].close})</span>
                                                                </label>
                                                            </div>

                                                            {!item.isFullDay && (
                                                                <div className="flex items-center gap-2">
                                                                    <TimePicker value={item.start} onChange={v => updateRecurringTime(idx, 'start', v)} />
                                                                    <span className="text-gray-500">-</span>
                                                                    <TimePicker value={item.end} onChange={v => updateRecurringTime(idx, 'end', v)} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        {!operatingHours && (
                                            <p className="text-xs text-yellow-500">
                                                Note: Business hours not configured. Validation disabled.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button
                                    onClick={handleSave}
                                    className="flex-1 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={step === 'saving'}
                                >
                                    {step === 'saving' ? 'Publishing...' : 'Publish Deal'}
                                </button>
                            </div>
                        </div>

                        {/* RIGHT: PREVIEW */}
                        <div className="sticky top-8 flex items-center justify-center">
                            {/* UPDATED: Removed scale-110 to prevent overlap */}
                            <div className="w-full max-w-sm">
                                <div className="text-center mb-6">
                                    <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Live Preview</h3>
                                </div>
                                <CouponPreview
                                    title={finalTitle || "Deal Title"}
                                    description={finalDesc || "Deal description will appear here..."}
                                    merchantName={merchantName}
                                    imageUrl={merchantBanner}
                                    originalPrice={originalPrice}
                                    dealPrice={dealPrice}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
