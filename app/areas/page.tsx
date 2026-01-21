'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabaseBrowser";
import Gold3DBanner from "@/components/Gold3DBanner";
import Loading from "@/components/Loading";

export default function AreasPage() {
    const [towns, setTowns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            setLoading(true);
            const { data } = await sb
                .from("towns")
                .select("id, name, slug, image_url")
                .order("name");

            setTowns(data || []);
            setLoading(false);
        })();
    }, []);

    if (loading) {
        return <Loading message="Loading Areas..." />;
    }

    return (
        <main className="min-h-screen bg-[#0A0F13] relative overflow-x-hidden">
            {/* Background blobs */}
            <div className="pointer-events-none absolute -top-24 -left-24 h-[380px] w-[380px] rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="pointer-events-none absolute bottom-10 right-[-60px] h-[420px] w-[420px] rounded-full bg-blue-500/10 blur-3xl" />

            <div className="relative z-10">
                <div className="pt-8 pb-4"></div>

                <div className="mx-auto max-w-5xl px-4 py-8">
                    <header className="mb-12 text-center">
                        <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
                            Areas We&apos;re <span className="text-emerald-400">Promoting</span>
                        </h1>
                        <p className="text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed mb-8">
                            Explore the local communities where Today&apos;s Stash is active.
                            Subscribe to an area to unlock exclusive deals from your favorite local businesses.
                        </p>

                        <div className="inline-block bg-white/5 rounded-2xl p-6 border border-white/10">
                            <p className="text-xl text-white font-medium mb-1">
                                Can&apos;t find your town? <a href="/waitlist" className="text-emerald-400 hover:text-emerald-300 underline decoration-emerald-500/30 underline-offset-4 transition-all">Join the waitlist</a>
                            </p>
                            <p className="text-gray-400 text-sm">
                                You will be the first to know when we are available for your town
                            </p>
                        </div>
                    </header>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {towns.map((town) => (
                            <Link
                                href={`/areas/${town.slug}`}
                                key={town.id}
                                className="group relative overflow-hidden rounded-2xl bg-[#111821] border border-white/5 hover:border-emerald-500/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] flex flex-col aspect-video sm:aspect-[4/3]"
                            >
                                {/* Placeholder for Town Image - using a gradient generator for now based on name */}
                                {town.image_url ? (
                                    <div className="absolute inset-0">
                                        <img
                                            src={town.image_url}
                                            alt={town.name}
                                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    </div>
                                ) : (
                                    <div
                                        className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 group-hover:scale-105 transition-transform duration-500"
                                        style={{
                                            background: `linear-gradient(135deg, ${stringToColor(town.name + '1')} 0%, ${stringToColor(town.name + '2')} 100%)`,
                                            opacity: 0.3
                                        }}
                                    />
                                )}

                                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F13] via-[#0A0F13]/40 to-transparent opacity-90" />

                                <div className="relative z-10 flex flex-col justify-end h-full p-6">
                                    <h2 className="text-2xl font-bold text-white mb-1 group-hover:text-emerald-300 transition-colors">
                                        {town.name}
                                    </h2>
                                    <div className="flex items-center text-emerald-400 text-sm font-medium opacity-0 transform translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                                        Explore Deals <span className="ml-1">→</span>
                                    </div>
                                </div>
                            </Link>
                        ))}

                        {towns.length === 0 && (
                            <div className="col-span-full py-20 text-center">
                                <p className="text-gray-500">No areas found. Please check back later.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}

// Simple helper to generate stable colors from strings for the placeholders
function stringToColor(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00ffffff).toString(16).toUpperCase();
    return "#" + "00000".substring(0, 6 - c.length) + c;
}
