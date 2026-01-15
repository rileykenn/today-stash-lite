'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { sb } from '@/lib/supabaseBrowser';
import { generateDealSuggestions, GeneratedDeal } from '@/app/actions/generate-deal-ai';

export default function AIDealPage() {
    const router = useRouter();
    const [merchantId, setMerchantId] = useState<string | null>(null);

    // States: 'input' -> 'generating' -> 'selection' -> 'editing' -> 'saving'
    const [step, setStep] = useState<'input' | 'generating' | 'selection' | 'editing' | 'saving'>('input');

    const [description, setDescription] = useState('');
    const [suggestions, setSuggestions] = useState<GeneratedDeal[]>([]);
    const [selectedDeal, setSelectedDeal] = useState<GeneratedDeal | null>(null);

    // Final edit form state (initialized from selected deal)
    const [finalTitle, setFinalTitle] = useState('');
    const [finalDesc, setFinalDesc] = useState('');
    const [finalTerms, setFinalTerms] = useState('');
    const [finalSavings, setFinalSavings] = useState('');
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
            } else {
                router.push('/merchant-dashboard');
            }
        }
        checkMerchant();
    }, [router]);

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
        setSelectedDeal(deal);
        // Populate form
        setFinalTitle(deal.title);
        setFinalDesc(deal.description);
        setFinalTerms(deal.terms);
        setFinalSavings((deal.savings).toFixed(2));
        setStep('editing');
    };

    const handleSave = async () => {
        if (!merchantId) return;
        setStep('saving');
        setError(null);

        try {
            // Create schema-compliant deal object
            const savingsCents = Math.round(parseFloat(finalSavings) * 100);

            // Get merchant area info
            // NOTE: In a real app we might want to let them pick the area, but defaulting to merchant's town is safe for now
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
                    terms: finalTerms,
                    savings_cents: savingsCents,
                    is_active: true,
                    area_key: areaKey,
                    area_name: areaName,
                    // Defaults
                    total_limit: null,
                    exp_date: null,
                    image_url: null
                });

            if (insertError) throw insertError;

            router.push('/merchant-dashboard?success=true');
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to save deal.');
            setStep('editing');
        }
    };

    if (!merchantId) {
        return <div className="min-h-screen bg-[#0A0F13] flex items-center justify-center text-white">Loading...</div>;
    }

    return (
        <main className="min-h-screen bg-[#0A0F13] text-white px-4 py-8">
            <div className="max-w-2xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                        AI Deal Creator
                    </h1>
                    <p className="text-sm text-white/60">Generate optimized deals for your business in seconds.</p>
                </header>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 text-red-400 rounded-xl text-sm">
                        {error}
                    </div>
                )}

                {/* STEP 1: INPUT */}
                {step === 'input' && (
                    <div className="bg-[#13202B] rounded-2xl p-6 ring-1 ring-white/10">
                        <label className="block text-sm font-medium mb-2">Describe your business & what you want to promote</label>
                        <textarea
                            className="w-full bg-[#0A0F13] border border-white/10 rounded-xl px-4 py-3 min-h-[120px] focus:outline-none focus:border-emerald-500/50"
                            placeholder="e.g. We are a family pizzeria. Use high-margin ingredients like dough and veggies. We want to drive lunch traffic on Tuesdays."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                        <button
                            onClick={handleGenerate}
                            disabled={!description.trim()}
                            className="mt-4 w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-bold transition"
                        >
                            Generate Ideas
                        </button>
                    </div>
                )}

                {/* STEP 2: GENERATING */}
                {step === 'generating' && (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                        <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                        <p className="text-emerald-400 font-medium animate-pulse">Consulting the AI marketing expert...</p>
                    </div>
                )}

                {/* STEP 3: SELECTION */}
                {step === 'selection' && (
                    <div className="space-y-4">
                        <p className="text-sm text-white/70">Select the idea you like best:</p>
                        {suggestions.map((deal, idx) => (
                            <div
                                key={idx}
                                onClick={() => handleSelect(deal)}
                                className="group cursor-pointer bg-[#13202B] hover:bg-[#1A2835] rounded-2xl p-5 ring-1 ring-white/10 hover:ring-emerald-500/50 transition-all"
                            >
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold text-lg group-hover:text-emerald-400 transition-colors">{deal.title}</h3>
                                    <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full font-medium">
                                        Save ${deal.savings}
                                    </span>
                                </div>
                                <p className="text-sm text-white/70 mt-2">{deal.description}</p>
                                <p className="text-xs text-white/40 mt-3 font-mono">{deal.terms}</p>
                            </div>
                        ))}
                        <button
                            onClick={() => setStep('input')}
                            className="w-full py-3 text-sm text-white/50 hover:text-white"
                        >
                            Start Over
                        </button>
                    </div>
                )}

                {/* STEP 4: EDITING */}
                {(step === 'editing' || step === 'saving') && (
                    <div className="bg-[#13202B] rounded-2xl p-6 ring-1 ring-white/10 space-y-4">
                        <h2 className="font-semibold text-lg border-b border-white/10 pb-4 mb-4">Finalize your Deal</h2>

                        <div>
                            <label className="block text-xs text-white/50 mb-1">Title</label>
                            <input
                                value={finalTitle}
                                onChange={(e) => setFinalTitle(e.target.value)}
                                className="w-full bg-[#0A0F13] rounded-lg px-3 py-2 ring-1 ring-white/10 focus:ring-emerald-500/50 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-white/50 mb-1">Description</label>
                            <textarea
                                value={finalDesc}
                                onChange={(e) => setFinalDesc(e.target.value)}
                                className="w-full bg-[#0A0F13] rounded-lg px-3 py-2 ring-1 ring-white/10 focus:ring-emerald-500/50 outline-none"
                                rows={2}
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-white/50 mb-1">Terms</label>
                            <textarea
                                value={finalTerms}
                                onChange={(e) => setFinalTerms(e.target.value)}
                                className="w-full bg-[#0A0F13] rounded-lg px-3 py-2 ring-1 ring-white/10 focus:ring-emerald-500/50 outline-none"
                                rows={2}
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-white/50 mb-1">Savings Value ($)</label>
                            <input
                                type="number"
                                value={finalSavings}
                                onChange={(e) => setFinalSavings(e.target.value)}
                                className="w-full bg-[#0A0F13] rounded-lg px-3 py-2 ring-1 ring-white/10 focus:ring-emerald-500/50 outline-none"
                            />
                        </div>

                        <div className="pt-4 flex gap-3">
                            <button
                                onClick={() => setStep('selection')}
                                className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 font-medium"
                                disabled={step === 'saving'}
                            >
                                Back
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex-[2] py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-bold shadow-lg shadow-emerald-500/20"
                                disabled={step === 'saving'}
                            >
                                {step === 'saving' ? 'Publishing...' : 'Publish Deal'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
