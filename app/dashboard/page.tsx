'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { sb } from '@/lib/supabaseBrowser';
import {
    PlusIcon,
    SparklesIcon,
    CalendarDaysIcon,
    MapPinIcon,
    TrashIcon,
} from '@heroicons/react/24/outline';

type PitchDeck = {
    id: string;
    business_name: string;
    business_type: string;
    area: string;
    contact_name: string;
    created_at: string;
    photos: string[];
};

export default function DashboardPage() {
    const [decks, setDecks] = useState<PitchDeck[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);

    useEffect(() => {
        loadDecks();
    }, []);

    async function loadDecks() {
        const { data: { user } } = await sb.auth.getUser();
        if (!user) return;

        const { data } = await sb
            .from('pitch_decks')
            .select('*')
            .eq('created_by', user.id)
            .order('created_at', { ascending: false });

        setDecks(data || []);
        setLoading(false);
    }

    async function handleDelete(id: string) {
        if (!confirm('Delete this pitch deck?')) return;
        setDeleting(id);
        await sb.from('pitch_decks').delete().eq('id', id);
        setDecks(prev => prev.filter(d => d.id !== id));
        setDeleting(null);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white">Your Pitch Decks</h1>
                    <p className="text-sm text-white/50 mt-1">
                        Create interactive presentations for business owners
                    </p>
                </div>
                <Link
                    href="/dashboard/create"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold text-sm shadow-lg shadow-emerald-900/30 transition"
                >
                    <PlusIcon className="w-5 h-5" />
                    Create New Pitch Deck
                </Link>
            </div>

            {/* Decks Grid */}
            {decks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                        <SparklesIcon className="w-8 h-8 text-emerald-400/50" />
                    </div>
                    <h2 className="text-lg font-semibold text-white mb-2">No pitch decks yet</h2>
                    <p className="text-sm text-white/40 max-w-md mb-6">
                        Create your first interactive pitch deck to present to business owners during sales calls.
                    </p>
                    <Link
                        href="/dashboard/create"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold text-sm shadow-lg shadow-emerald-900/30 transition"
                    >
                        <PlusIcon className="w-5 h-5" />
                        Create Your First Pitch Deck
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {decks.map((deck) => (
                        <div
                            key={deck.id}
                            className="group relative bg-[#111821] rounded-2xl border border-white/8 overflow-hidden hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-900/10 transition-all duration-300"
                        >
                            {/* Thumbnail */}
                            <div className="relative h-36 bg-gradient-to-br from-emerald-900/30 to-cyan-900/20 overflow-hidden">
                                {deck.photos?.[0] ? (
                                    <img
                                        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/pitch-photos/${deck.photos[0]}`}
                                        alt={deck.business_name}
                                        className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full">
                                        <SparklesIcon className="w-10 h-10 text-emerald-500/20" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-[#111821] via-transparent to-transparent" />
                            </div>

                            {/* Content */}
                            <div className="p-4">
                                <h3 className="font-bold text-white text-lg truncate group-hover:text-emerald-400 transition">
                                    {deck.business_name}
                                </h3>
                                <p className="text-xs text-white/50 mt-1 truncate">{deck.business_type}</p>

                                <div className="flex items-center gap-4 mt-3 text-xs text-white/40">
                                    <span className="flex items-center gap-1">
                                        <MapPinIcon className="w-3 h-3" />
                                        {deck.area || 'No area'}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <CalendarDaysIcon className="w-3 h-3" />
                                        {new Date(deck.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 mt-4">
                                    <Link
                                        href={`/pitch/${deck.id}`}
                                        className="flex-1 text-center py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 transition"
                                    >
                                        Open Pitch Deck
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(deck.id)}
                                        disabled={deleting === deck.id}
                                        className="p-2 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
