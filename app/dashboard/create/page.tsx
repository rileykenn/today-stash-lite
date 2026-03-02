'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { sb } from '@/lib/supabaseBrowser';
import { generatePitchContent } from '@/app/actions/generate-pitch';
import {
    SparklesIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
    PhotoIcon,
    XMarkIcon,
    BuildingStorefrontIcon,
    MapPinIcon,
    UserIcon,
    LightBulbIcon,
    CheckIcon,
} from '@heroicons/react/24/outline';

const BUSINESS_TYPES = [
    'Cafe / Coffee Shop',
    'Restaurant / Dining',
    'Bakery / Patisserie',
    'Bar / Pub',
    'Pizza / Fast Food',
    'Hair Salon / Barber',
    'Beauty / Nails / Spa',
    'Gym / Fitness',
    'Mechanic / Automotive',
    'Pet Care / Grooming',
    'Photography',
    'Retail / Boutique',
    'Health & Wellness',
    'Trades & Services',
    'Other',
];

export default function CreatePitchDeckPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form data
    const [businessName, setBusinessName] = useState('');
    const [businessType, setBusinessType] = useState('');
    const [customType, setCustomType] = useState('');
    const [whatTheySell, setWhatTheySell] = useState('');
    const [contactName, setContactName] = useState('');
    const [area, setArea] = useState('');
    const [dealIdeas, setDealIdeas] = useState('');
    const [photos, setPhotos] = useState<File[]>([]);
    const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

    const effectiveType = businessType === 'Other' ? customType : businessType;

    const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (photos.length + files.length > 6) {
            setError('Maximum 6 photos allowed');
            return;
        }
        setPhotos(prev => [...prev, ...files]);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = () => setPhotoPreviews(prev => [...prev, reader.result as string]);
            reader.readAsDataURL(file);
        });
    };

    const removePhoto = (idx: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== idx));
        setPhotoPreviews(prev => prev.filter((_, i) => i !== idx));
    };

    const canProceed = () => {
        switch (step) {
            case 1: return businessName.trim() && effectiveType.trim();
            case 2: return area.trim();
            case 3: return true; // deal ideas and photos optional
            default: return true;
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await sb.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Upload photos
            const uploadedPaths: string[] = [];
            for (const photo of photos) {
                const ext = photo.name.split('.').pop();
                const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
                const { error: uploadError } = await sb.storage
                    .from('pitch-photos')
                    .upload(path, photo);
                if (uploadError) console.error('Photo upload error:', uploadError);
                else uploadedPaths.push(path);
            }

            // Generate AI content
            const aiContent = await generatePitchContent({
                businessName,
                businessType: effectiveType,
                whatTheySell,
                area,
                dealIdeas,
                contactName,
            });

            // Save to database
            const { data: deck, error: insertError } = await sb
                .from('pitch_decks')
                .insert({
                    business_name: businessName,
                    business_type: effectiveType,
                    what_they_sell: whatTheySell,
                    contact_name: contactName,
                    area,
                    deal_ideas: dealIdeas,
                    photos: uploadedPaths,
                    generated_content: aiContent,
                    created_by: user.id,
                })
                .select('id')
                .single();

            if (insertError) throw insertError;

            router.push(`/pitch/${deck.id}`);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to create pitch deck');
            setLoading(false);
        }
    };

    const STEPS = [
        { num: 1, label: 'Business', icon: BuildingStorefrontIcon },
        { num: 2, label: 'Location', icon: MapPinIcon },
        { num: 3, label: 'Details', icon: LightBulbIcon },
    ];

    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            {/* Back */}
            <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center gap-2 text-sm text-white/40 hover:text-white mb-6 transition"
            >
                <ArrowLeftIcon className="w-4 h-4" />
                Back to Dashboard
            </button>

            {/* Title */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <SparklesIcon className="w-6 h-6 text-emerald-400" />
                    Create Pitch Deck
                </h1>
                <p className="text-sm text-white/50 mt-1">
                    Fill in the business details and AI will generate your interactive presentation
                </p>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center gap-2 mb-8">
                {STEPS.map((s, i) => (
                    <React.Fragment key={s.num}>
                        <button
                            onClick={() => s.num < step && setStep(s.num)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition ${step === s.num
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : step > s.num
                                        ? 'bg-emerald-500/10 text-emerald-400/60 cursor-pointer'
                                        : 'bg-white/5 text-white/30'
                                }`}
                        >
                            {step > s.num ? (
                                <CheckIcon className="w-3 h-3" />
                            ) : (
                                <s.icon className="w-3 h-3" />
                            )}
                            {s.label}
                        </button>
                        {i < STEPS.length - 1 && (
                            <div className={`flex-1 h-px ${step > s.num ? 'bg-emerald-500/30' : 'bg-white/10'}`} />
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Form Card */}
            <div className="bg-[#111821] rounded-2xl p-6 sm:p-8 border border-white/10 shadow-2xl shadow-black/30">
                {/* Step 1: Business Info */}
                {step === 1 && (
                    <div className="space-y-5">
                        <div>
                            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                                Business Name *
                            </label>
                            <input
                                type="text"
                                value={businessName}
                                onChange={(e) => setBusinessName(e.target.value)}
                                className="w-full bg-[#0A0F13] rounded-xl px-4 py-3 border border-white/10 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none text-white placeholder-white/20 transition"
                                placeholder="e.g. Joey's Pizza Bar"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                                Business Type *
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {BUSINESS_TYPES.map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => setBusinessType(type)}
                                        className={`px-3 py-2 rounded-lg text-xs font-medium border transition text-left ${businessType === type
                                                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                                                : 'bg-white/3 border-white/8 text-white/60 hover:border-white/20'
                                            }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                            {businessType === 'Other' && (
                                <input
                                    type="text"
                                    value={customType}
                                    onChange={(e) => setCustomType(e.target.value)}
                                    className="mt-3 w-full bg-[#0A0F13] rounded-xl px-4 py-3 border border-white/10 focus:border-emerald-500/50 outline-none text-white placeholder-white/20 transition"
                                    placeholder="Describe the business type..."
                                />
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                                What do they sell / offer?
                            </label>
                            <textarea
                                value={whatTheySell}
                                onChange={(e) => setWhatTheySell(e.target.value)}
                                className="w-full bg-[#0A0F13] rounded-xl px-4 py-3 border border-white/10 focus:border-emerald-500/50 outline-none text-white placeholder-white/20 transition min-h-[80px]"
                                placeholder="e.g. Wood-fired pizzas, craft beer, dine-in and takeaway..."
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                                Meeting Contact Name
                            </label>
                            <input
                                type="text"
                                value={contactName}
                                onChange={(e) => setContactName(e.target.value)}
                                className="w-full bg-[#0A0F13] rounded-xl px-4 py-3 border border-white/10 focus:border-emerald-500/50 outline-none text-white placeholder-white/20 transition"
                                placeholder="e.g. John Smith (owner)"
                            />
                        </div>
                    </div>
                )}

                {/* Step 2: Location */}
                {step === 2 && (
                    <div className="space-y-5">
                        <div>
                            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                                Business Address or Area *
                            </label>
                            <input
                                type="text"
                                value={area}
                                onChange={(e) => setArea(e.target.value)}
                                className="w-full bg-[#0A0F13] rounded-xl px-4 py-3 border border-white/10 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none text-white placeholder-white/20 transition"
                                placeholder="e.g. 15 Main St, Nowra NSW 2541"
                            />
                            <p className="text-xs text-white/30 mt-2">
                                AI will use this to reference their local area and nearby towns in the pitch
                            </p>
                        </div>
                    </div>
                )}

                {/* Step 3: Deal Ideas & Photos */}
                {step === 3 && (
                    <div className="space-y-5">
                        <div>
                            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                                Deal Ideas / Icebreakers / Point of Sale
                            </label>
                            <textarea
                                value={dealIdeas}
                                onChange={(e) => setDealIdeas(e.target.value)}
                                className="w-full bg-[#0A0F13] rounded-xl px-4 py-3 border border-white/10 focus:border-emerald-500/50 outline-none text-white placeholder-white/20 transition min-h-[120px]"
                                placeholder={`e.g. "Business could really benefit from coupon cards to fill quiet Tuesday lunches"\n\n"They mentioned they want more foot traffic from nearby Berry/Shoalhaven"\n\n"Owner likes the idea of a 2-for-1 weekday special"`}
                            />
                            <p className="text-xs text-white/30 mt-2">
                                These notes help AI craft a more personalised pitch
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                                Photos (optional — food, shopfront, menu, work samples)
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {photoPreviews.map((preview, idx) => (
                                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/10">
                                        <img src={preview} alt="" className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => removePhoto(idx)}
                                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-500 transition"
                                        >
                                            <XMarkIcon className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                                {photos.length < 6 && (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="aspect-square rounded-xl border-2 border-dashed border-white/10 hover:border-emerald-500/30 flex flex-col items-center justify-center gap-1 text-white/30 hover:text-emerald-400 transition"
                                    >
                                        <PhotoIcon className="w-6 h-6" />
                                        <span className="text-[10px]">Add Photo</span>
                                    </button>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handlePhotoAdd}
                                className="hidden"
                            />
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm">
                        {error}
                    </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
                    <button
                        onClick={() => setStep(s => s - 1)}
                        disabled={step === 1}
                        className="flex items-center gap-2 text-sm text-white/40 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                        Back
                    </button>

                    {step < 3 ? (
                        <button
                            onClick={() => setStep(s => s + 1)}
                            disabled={!canProceed()}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-medium transition"
                        >
                            Next
                            <ArrowRightIcon className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-emerald-900/30 transition"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Generating Pitch...
                                </>
                            ) : (
                                <>
                                    <SparklesIcon className="w-4 h-4" />
                                    Generate Pitch Deck
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
