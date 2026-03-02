'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { sb } from '@/lib/supabaseBrowser';
import { generateDealSuggestions, GeneratedDeal } from '@/app/actions/generate-deal-ai';
import type { PitchContent } from '@/app/actions/generate-pitch';
import {
    SparklesIcon,
    ArrowLeftIcon,
    ChartBarIcon,
    UsersIcon,
    CurrencyDollarIcon,
    CheckBadgeIcon,
    QrCodeIcon,
    DevicePhoneMobileIcon,
    ClockIcon,
    MapPinIcon,
    ArrowPathIcon,
    StarIcon,
    RocketLaunchIcon,
    ShieldCheckIcon,
    GlobeAltIcon,
} from '@heroicons/react/24/outline';

/* =======================
   Types
   ======================= */
type PitchDeckData = {
    id: string;
    business_name: string;
    business_type: string;
    what_they_sell: string;
    contact_name: string;
    area: string;
    deal_ideas: string;
    photos: string[];
    generated_content: PitchContent;
    created_at: string;
};

/* =======================
   Success Stories Data (Hardcoded from Urban Promotions)
   ======================= */
const SUCCESS_STORIES = [
    {
        business: "Bel Paese Italian Restaurant",
        location: "Coburg VIC",
        quote: "The coupon program brought in families we'd never seen before. Within 3 months, our Tuesday nights went from empty to fully booked.",
        result: "60+ new customers in first month",
        category: "Restaurant",
    },
    {
        business: "Sunrise Cafe & Bakery",
        location: "Wollongong NSW",
        quote: "We were skeptical at first, but the results spoke for themselves. Our quiet mornings are now our busiest period.",
        result: "45% increase in weekday mornings",
        category: "Cafe & Bakery",
    },
    {
        business: "Elite Cuts Barbershop",
        location: "Penrith NSW",
        quote: "The deal brought in new clients who kept coming back even after the promotion. It paid for itself 10 times over.",
        result: "80+ new repeat clients",
        category: "Hair & Beauty",
    },
    {
        business: "Bay Fitness Studio",
        location: "Jervis Bay NSW",
        quote: "We filled our off-peak classes with local residents who didn't even know we existed. The exposure was incredible.",
        result: "35 new memberships signed",
        category: "Fitness",
    },
];

/* =======================
   Coupon Preview Component
   ======================= */
function CouponPreview({
    title, merchantName, dealPrice, originalPrice, imageUrl, description
}: {
    title: string; merchantName: string; dealPrice?: string; originalPrice?: string;
    imageUrl?: string; description?: string;
}) {
    const fmt = (val: string | undefined) => {
        if (!val) return '$--';
        const num = parseFloat(val);
        return isNaN(num) ? '$--' : num.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });
    };

    return (
        <div className="group relative flex flex-col w-full max-w-sm mx-auto rounded-t-xl overflow-hidden shadow-lg select-none ring-1 ring-white/10 bg-[#1a1a1a]">
            <div className="relative w-full h-48 overflow-hidden bg-gray-800">
                <img src={imageUrl || "/placeholder-deal.svg"} alt={title} className="w-full h-full object-cover opacity-90" />
                <div className="absolute top-3 left-3 right-3 z-10 flex justify-between">
                    <span className="px-3 py-1 bg-emerald-500/90 backdrop-blur text-white text-xs font-bold rounded-full shadow-sm">Local</span>
                    <span className="px-3 py-1 bg-blue-500/90 backdrop-blur text-white text-xs font-bold rounded-full shadow-sm">Deal</span>
                </div>
            </div>
            <div className="relative flex flex-col pt-4 pb-4 px-4 text-left bg-[#1a1a1a]">
                <div className="relative z-10 flex flex-col">
                    <h3 className="text-white font-bold text-xl truncate leading-snug mb-0.5">{title || "Untitled Deal"}</h3>
                    <p className="text-white/60 text-sm font-normal truncate mb-2">{merchantName}</p>
                    {description && <p className="text-white/40 text-xs line-clamp-2 mb-3">{description}</p>}
                    <div className="flex justify-between items-end mt-auto">
                        <div className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                            <SparklesIcon className="w-3 h-3" /><span>Verified Deal</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            {originalPrice && (
                                <span className="text-gray-500 line-through text-base font-medium decoration-gray-500/50">{fmt(originalPrice)}</span>
                            )}
                            <span className="font-black text-4xl text-emerald-400 tracking-tight leading-none">{fmt(dealPrice)}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="relative w-full pb-4 pt-2 bg-[#1a1a1a]"
                style={{
                    maskImage: "radial-gradient(circle at bottom, transparent 6px, black 6.5px), linear-gradient(black, black)",
                    maskSize: "20px 20px, 100% calc(100% - 10px)", maskPosition: "bottom, top",
                    maskRepeat: "repeat-x, no-repeat", maskComposite: "intersect",
                    WebkitMaskImage: "radial-gradient(circle at bottom, transparent 6px, black 6.5px), linear-gradient(black, black)",
                    WebkitMaskSize: "20px 20px, 100% calc(100% - 10px)", WebkitMaskPosition: "bottom, top",
                    WebkitMaskRepeat: "repeat-x, no-repeat", WebkitMaskComposite: "source-over, source-over" as any,
                }}
            >
                <div className="absolute top-0 inset-x-4 border-t border-dashed border-white/10" />
                <div className="text-center mt-1.5">
                    <span className="font-mono text-xs text-white/40 tracking-widest uppercase opacity-90">click to redeem</span>
                </div>
            </div>
        </div>
    );
}

/* =======================
   Interactive AI Deal Generator Component
   ======================= */
function InteractiveDealGenerator({ businessName, businessType }: { businessName: string; businessType: string }) {
    const [description, setDescription] = useState('');
    const [step, setStep] = useState<'input' | 'generating' | 'results'>('input');
    const [suggestions, setSuggestions] = useState<GeneratedDeal[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!description.trim()) return;
        setStep('generating');
        setError(null);
        try {
            const results = await generateDealSuggestions(description);
            setSuggestions(results);
            setStep('results');
        } catch (err: any) {
            setError(err.message || 'Failed to generate ideas.');
            setStep('input');
        }
    };

    return (
        <div className="w-full">
            {step === 'input' && (
                <div className="bg-[#111821] rounded-2xl p-6 border border-white/10 shadow-xl">
                    <div className="flex items-center gap-2 mb-4">
                        <SparklesIcon className="w-5 h-5 text-emerald-400" />
                        <h3 className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">AI Deal Creator</h3>
                    </div>
                    <p className="text-sm text-white/50 mb-4">Try it — describe a promotion goal and AI generates deal ideas instantly.</p>
                    <textarea
                        className="w-full bg-[#0A0F13] border border-white/10 rounded-xl px-4 py-3 min-h-[100px] focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-white/20 text-white text-sm"
                        placeholder={`e.g. I want to attract more lunch customers to ${businessName} with a special deal...`}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                    <button
                        onClick={handleGenerate}
                        disabled={!description.trim()}
                        className="mt-4 w-full h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
                    >
                        <SparklesIcon className="w-4 h-4" />
                        Generate Deal Ideas
                    </button>
                    {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
                </div>
            )}

            {step === 'generating' && (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                    <div className="relative">
                        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                        <SparklesIcon className="w-5 h-5 text-emerald-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                    </div>
                    <p className="text-sm text-white/50">AI is crafting deal ideas...</p>
                </div>
            )}

            {step === 'results' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-bold text-white">AI-Generated Deals</h3>
                        <button onClick={() => { setStep('input'); setSuggestions([]); setDescription(''); }}
                            className="text-xs text-white/40 hover:text-white flex items-center gap-1 transition">
                            <ArrowPathIcon className="w-3 h-3" /> Try Again
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {suggestions.map((deal, idx) => (
                            <div key={idx} className="bg-[#111821] rounded-xl p-4 border border-white/10 hover:border-emerald-500/30 transition">
                                <h4 className="font-bold text-white text-sm mb-1">{deal.title}</h4>
                                <p className="text-xs text-white/50 mb-3">{deal.description}</p>
                                {deal.scheduleDays.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {deal.scheduleDays.map(d => (
                                            <span key={d} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] rounded-full capitalize">{d}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/* =======================
   Stat Card Component (from merchant dashboard)
   ======================= */
function StatCard({ label, value, icon, trend }: { label: string; value: string; icon: React.ReactNode; trend: string }) {
    return (
        <div className="bg-[#111821] rounded-2xl p-5 border border-white/10 shadow-lg">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">{icon}</div>
                <div>
                    <p className="text-xs text-white/50 uppercase tracking-wider">{label}</p>
                    <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
                </div>
            </div>
            <p className="text-xs text-emerald-400">{trend}</p>
        </div>
    );
}

/* =======================
   Section Wrapper
   ======================= */
function PitchSection({ children, id, className = '' }: { children: React.ReactNode; id?: string; className?: string }) {
    return (
        <section id={id} className={`py-16 sm:py-20 px-4 sm:px-6 ${className}`}>
            <div className="max-w-5xl mx-auto">{children}</div>
        </section>
    );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-400/80 mb-3">{children}</p>;
}

/* =======================
   Main Pitch Deck Page
   ======================= */
export default function PitchDeckPage() {
    const params = useParams();
    const router = useRouter();
    const [deck, setDeck] = useState<PitchDeckData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const { data } = await sb
                .from('pitch_decks')
                .select('*')
                .eq('id', params.id)
                .single();
            setDeck(data as PitchDeckData);
            setLoading(false);
        }
        load();
    }, [params.id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050B10] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!deck) {
        return (
            <div className="min-h-screen bg-[#050B10] flex flex-col items-center justify-center text-white gap-4">
                <p className="text-white/50">Pitch deck not found</p>
                <button onClick={() => router.push('/dashboard')} className="text-sm text-emerald-400 underline">Back to Dashboard</button>
            </div>
        );
    }

    const gc = deck.generated_content;
    const photoUrl = (path: string) => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/pitch-photos/${path}`;

    const formatMoney = (cents: number) => (cents / 100).toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });

    return (
        <div className="min-h-screen bg-[#050B10] text-white">
            {/* Floating Back Button */}
            <button
                onClick={() => router.push('/dashboard')}
                className="fixed top-4 left-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg bg-black/60 backdrop-blur-xl text-white/60 hover:text-white text-sm transition border border-white/10"
            >
                <ArrowLeftIcon className="w-4 h-4" />
                Dashboard
            </button>

            {/* ============================
          SECTION 1: HERO / COVER
         ============================ */}
            <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
                {/* Background Photo */}
                {deck.photos?.[0] && (
                    <img
                        src={photoUrl(deck.photos[0])}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover opacity-30"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-[#050B10]/60 via-[#050B10]/80 to-[#050B10]" />

                <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/20 backdrop-blur mb-6">
                        <SparklesIcon className="w-3 h-3" />
                        Interactive Pitch Deck
                    </div>

                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight mb-4">
                        Today&apos;s Stash<br />
                        <span className="text-emerald-400">× {deck.business_name}</span>
                    </h1>

                    <p className="text-lg sm:text-xl text-white/60 max-w-xl mx-auto mb-4">
                        {gc.heroSubtitle}
                    </p>

                    <div className="flex items-center justify-center gap-3 text-sm text-white/40 mb-8">
                        <span className="flex items-center gap-1"><MapPinIcon className="w-3 h-3" />{deck.area}</span>
                        <span>•</span>
                        <span>{deck.business_type}</span>
                        {deck.contact_name && <><span>•</span><span>Prepared for {deck.contact_name}</span></>}
                    </div>

                    {/* Photo strip */}
                    {deck.photos.length > 1 && (
                        <div className="flex items-center justify-center gap-3 mt-6">
                            {deck.photos.slice(0, 4).map((p, i) => (
                                <div key={i} className="w-20 h-20 rounded-xl overflow-hidden ring-2 ring-white/10 shadow-lg">
                                    <img src={photoUrl(p)} alt="" className="w-full h-full object-cover" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Scroll indicator */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30 animate-bounce">
                    <span className="text-xs">Scroll to explore</span>
                    <div className="w-5 h-8 rounded-full border border-white/20 flex items-start justify-center p-1">
                        <div className="w-1 h-2 bg-white/40 rounded-full animate-pulse" />
                    </div>
                </div>
            </section>

            {/* ============================
          SECTION 2: ABOUT / HISTORY
         ============================ */}
            <PitchSection id="about">
                <SectionLabel>From the Creators of Urban Promotions®</SectionLabel>
                <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                    A trusted history of <span className="text-emerald-400">local savings</span>.
                </h2>
                <div className="grid gap-6 md:grid-cols-2 mt-8">
                    <div className="bg-[#0D1620]/95 rounded-2xl p-6 ring-1 ring-white/10">
                        <p className="text-sm leading-relaxed text-white/80 mb-4">
                            From 1996 to 2017, our team built and ran <span className="font-semibold">Urban Promotions®</span>, one of
                            Australia&apos;s most successful local coupon companies. We connected small businesses, national brands and
                            hundreds of thousands of households with simple, high-value offers that actually got used.
                        </p>
                        <p className="text-sm leading-relaxed text-white/80">
                            That experience now lives inside <span className="font-semibold text-emerald-400">Today&apos;s Stash</span> — a modern,
                            trackable platform with QR codes, live reporting and a premium experience for both consumers and businesses.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {[
                            { stat: '20+ Years', desc: 'Helping Aussies save at local businesses' },
                            { stat: '10,000+', desc: 'Venues supported with promotions nationwide' },
                            { stat: 'Millions', desc: 'In coupon value distributed across Australia' },
                            { stat: 'QR + PIN', desc: 'Modern digital redemption replacing paper coupons' },
                        ].map(({ stat, desc }) => (
                            <div key={stat} className="bg-[#111821] rounded-xl p-4 border border-white/8 flex items-center gap-4">
                                <div className="text-lg font-bold text-emerald-400 shrink-0 w-24">{stat}</div>
                                <p className="text-xs text-white/60">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </PitchSection>

            {/* ============================
          SECTION 3: SUCCESS STORIES
         ============================ */}
            <PitchSection id="stories" className="bg-[#0A0F13]/50">
                <SectionLabel>Proof it Works</SectionLabel>
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                    Success stories from <span className="text-emerald-400">local businesses</span>
                </h2>
                <p className="text-sm text-white/50 mb-8 max-w-xl">
                    Real results from real stores who filled their tables and appointment books using local deals.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {SUCCESS_STORIES.map((story, idx) => (
                        <article key={idx} className="bg-[#111821] rounded-2xl p-5 border border-white/8">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-medium rounded-full">{story.category}</span>
                                <span className="text-[10px] text-white/40">{story.location}</span>
                            </div>
                            <p className="text-sm italic text-white/80 mb-3">&ldquo;{story.quote}&rdquo;</p>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-white/50">{story.business}</span>
                                <span className="text-xs text-emerald-400 font-medium">{story.result}</span>
                            </div>
                        </article>
                    ))}
                </div>
            </PitchSection>

            {/* ============================
          SECTION 4: HOW IT WORKS
         ============================ */}
            <PitchSection id="how-it-works">
                <SectionLabel>Seamless Setup</SectionLabel>
                <h2 className="text-2xl sm:text-3xl font-bold mb-8">
                    How it works for <span className="text-emerald-400">{deck.business_name}</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {[
                        {
                            icon: <QrCodeIcon className="w-8 h-8 text-emerald-400" />,
                            title: "Display Your QR Flyer",
                            description: "Place the custom QR poster on your counter. Customers scan it to browse and redeem deals when they visit.",
                        },
                        {
                            icon: <DevicePhoneMobileIcon className="w-8 h-8 text-cyan-400" />,
                            title: "Customers Scan & Redeem",
                            description: "Locals browse available deals, tap to redeem, and show the redemption screen or QR code to your staff.",
                        },
                        {
                            icon: <ChartBarIcon className="w-8 h-8 text-blue-400" />,
                            title: "Track Everything",
                            description: "See real-time stats in your merchant dashboard — redemptions, unique customers, revenue impact, all at a glance.",
                        },
                    ].map((step, idx) => (
                        <div key={idx} className="bg-[#111821] rounded-2xl p-6 border border-white/8 text-center">
                            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                                {step.icon}
                            </div>
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                                <h3 className="text-base font-bold text-white">{step.title}</h3>
                            </div>
                            <p className="text-sm text-white/60">{step.description}</p>
                        </div>
                    ))}
                </div>
            </PitchSection>

            {/* ============================
          SECTION 5: INTERACTIVE MERCHANT DASHBOARD DEMO
         ============================ */}
            <PitchSection id="dashboard-demo" className="bg-[#0A0F13]/50">
                <SectionLabel>Your Merchant Dashboard</SectionLabel>
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                    What <span className="text-emerald-400">{deck.business_name}&apos;s</span> dashboard could look like
                </h2>
                <p className="text-sm text-white/50 mb-8">
                    Live demo with projected data based on your business type and area.
                </p>

                {/* Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <StatCard
                        label="Total Redemptions"
                        value={gc.dashboardStats.totalRedemptions.toString()}
                        icon={<ChartBarIcon className="w-5 h-5 text-emerald-400" />}
                        trend="↑ First month projection"
                    />
                    <StatCard
                        label="Unique Customers"
                        value={gc.dashboardStats.uniqueCustomers.toString()}
                        icon={<UsersIcon className="w-5 h-5 text-cyan-400" />}
                        trend="New customers through deals"
                    />
                    <StatCard
                        label="Est. Revenue"
                        value={formatMoney(gc.dashboardStats.estimatedRevenue * 100)}
                        icon={<CurrencyDollarIcon className="w-5 h-5 text-emerald-400" />}
                        trend="From deal-driven foot traffic"
                    />
                </div>

                {/* Active Deals Demo */}
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <CheckBadgeIcon className="w-5 h-5 text-emerald-400" />
                    Active Deals
                </h3>
                <div className="space-y-3">
                    {gc.dummyDeals.map((deal, idx) => {
                        const remaining = deal.totalLimit - deal.redeemedCount;
                        const pct = Math.round((deal.redeemedCount / deal.totalLimit) * 100);
                        return (
                            <div key={idx} className="bg-[#111821] rounded-xl p-4 border border-white/8 flex flex-col sm:flex-row sm:items-center gap-4">
                                <div className="flex-1">
                                    <h4 className="font-bold text-white text-sm">{deal.title}</h4>
                                    <p className="text-xs text-white/50 mt-1">{deal.description}</p>
                                </div>
                                <div className="flex items-center gap-6 text-xs">
                                    <div className="text-center">
                                        <p className="text-white/40">Price</p>
                                        <p className="text-emerald-400 font-bold">{formatMoney(deal.priceCents)}</p>
                                        <p className="text-white/30 line-through">{formatMoney(deal.originalPriceCents)}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-white/40">Redeemed</p>
                                        <p className="text-white font-bold">{deal.redeemedCount}/{deal.totalLimit}</p>
                                    </div>
                                    <div className="w-20">
                                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                        </div>
                                        <p className="text-[10px] text-emerald-400 text-right mt-1">{remaining} left</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </PitchSection>

            {/* ============================
          SECTION 6: AI DEAL GENERATOR (INTERACTIVE)
         ============================ */}
            <PitchSection id="ai-generator">
                <SectionLabel>Try It Live</SectionLabel>
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                    AI Deal Generator — <span className="text-emerald-400">works right now</span>
                </h2>
                <p className="text-sm text-white/50 mb-8">
                    This is the actual tool merchants use. Type a goal and watch AI create deals in real time.
                </p>

                <InteractiveDealGenerator businessName={deck.business_name} businessType={deck.business_type} />
            </PitchSection>

            {/* ============================
          SECTION 7: PERSONALIZED BENEFITS
         ============================ */}
            <PitchSection id="benefits" className="bg-[#0A0F13]/50">
                <SectionLabel>Why Today&apos;s Stash for {deck.business_name}</SectionLabel>
                <h2 className="text-2xl sm:text-3xl font-bold mb-8">
                    How it could <span className="text-emerald-400">benefit your business</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    {gc.businessBenefits.map((benefit, idx) => (
                        <div key={idx} className="bg-[#111821] rounded-2xl p-5 border border-white/8">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                    {[<RocketLaunchIcon key="r" className="w-4 h-4 text-emerald-400" />,
                                    <UsersIcon key="u" className="w-4 h-4 text-cyan-400" />,
                                    <GlobeAltIcon key="g" className="w-4 h-4 text-blue-400" />,
                                    <ShieldCheckIcon key="s" className="w-4 h-4 text-emerald-400" />][idx % 4]}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-sm mb-1">{benefit.title}</h3>
                                    <p className="text-xs text-white/60 leading-relaxed">{benefit.description}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Area Insight */}
                <div className="bg-[#111821] rounded-2xl p-6 border border-emerald-500/20">
                    <div className="flex items-center gap-2 mb-3">
                        <MapPinIcon className="w-4 h-4 text-emerald-400" />
                        <h3 className="text-sm font-bold text-white">Local Area Insight</h3>
                    </div>
                    <p className="text-sm text-white/70 leading-relaxed">{gc.areaInsight}</p>
                    {gc.nearbyTowns.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                            {gc.nearbyTowns.map((town) => (
                                <span key={town} className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-[11px] rounded-full">{town}</span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Personalized Pitch */}
                <div className="mt-6 bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 rounded-2xl p-6 border border-emerald-500/15">
                    <p className="text-sm text-white/80 leading-relaxed whitespace-pre-line">{gc.personalizedPitch}</p>
                </div>
            </PitchSection>

            {/* ============================
          SECTION 8: CONSUMER VIEW PREVIEW
         ============================ */}
            <PitchSection id="consumer-view">
                <SectionLabel>What Customers See</SectionLabel>
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                    <span className="text-emerald-400">{deck.business_name}</span> on Today&apos;s Stash
                </h2>
                <p className="text-sm text-white/50 mb-8">
                    This is how your deals appear to local customers browsing their area.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {gc.suggestedDeals.map((deal, idx) => (
                        <CouponPreview
                            key={idx}
                            title={deal.title}
                            merchantName={deck.business_name}
                            dealPrice={deal.dealPrice.toString()}
                            originalPrice={deal.originalPrice.toString()}
                            imageUrl={deck.photos?.[idx % deck.photos.length] ? photoUrl(deck.photos[idx % deck.photos.length]) : undefined}
                            description={deal.description}
                        />
                    ))}
                </div>
            </PitchSection>

            {/* ============================
          SECTION 9: TALKING POINTS (for salesperson)
         ============================ */}
            <PitchSection id="talking-points" className="bg-[#0A0F13]/50">
                <SectionLabel>Your Talking Points</SectionLabel>
                <h2 className="text-2xl sm:text-3xl font-bold mb-6">
                    Key points to <span className="text-emerald-400">mention during the call</span>
                </h2>

                <div className="space-y-3 max-w-2xl">
                    {gc.talkingPoints.map((point, idx) => (
                        <div key={idx} className="flex items-start gap-3 bg-[#111821] rounded-xl p-4 border border-white/8">
                            <div className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                                {idx + 1}
                            </div>
                            <p className="text-sm text-white/80">{point}</p>
                        </div>
                    ))}
                </div>
            </PitchSection>

            {/* ============================
          SECTION 10: NEXT STEPS / CTA
         ============================ */}
            <PitchSection id="next-steps">
                <div className="text-center max-w-2xl mx-auto">
                    <div className="inline-flex items-center gap-2 mb-6">
                        <StarIcon className="w-6 h-6 text-emerald-400" />
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                        Ready to get started?
                    </h2>
                    <p className="text-base text-white/60 mb-8">
                        Join businesses across Australia who are already using Today&apos;s Stash to fill their tables,
                        chairs, and appointment books with local customers.
                    </p>

                    <div className="bg-[#111821] rounded-2xl p-6 border border-white/10 text-left space-y-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <ClockIcon className="w-5 h-5 text-emerald-400" />
                            Next Steps
                        </h3>
                        {[
                            "Set up your Merchant Account (takes 5 minutes)",
                            "Create your first deal using the AI Deal Creator",
                            "Print your QR poster and place it on the counter",
                            "Watch the redemptions come in from day one",
                        ].map((step, idx) => (
                            <div key={idx} className="flex items-center gap-3 text-sm text-white/70">
                                <div className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-bold flex items-center justify-center shrink-0">
                                    {idx + 1}
                                </div>
                                <span>{step}</span>
                            </div>
                        ))}
                    </div>

                    <p className="mt-8 text-xs text-white/30">
                        Presentation prepared by Today&apos;s Stash Sales Team • {new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
            </PitchSection>
        </div>
    );
}
