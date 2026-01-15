import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import Gold3DBanner from "@/components/Gold3DBanner";
import SubscribeButton from "./SubscribeButton"; // We'll create this client component next
import Link from "next/link";

// Server client for fetching public data
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const revalidate = 60;

// Correct type for Next.js 15+ dynamic route params
type Props = {
    params: Promise<{ slug: string }>;
};

export default async function TownPage({ params }: Props) {
    // Await the params object
    const { slug } = await params;

    const { data: town, error } = await supabase
        .from("towns")
        .select("*")
        .eq("slug", slug)
        .single();

    if (error || !town) {
        notFound();
    }

    return (
        <main className="min-h-screen bg-[#0A0F13] relative overflow-x-hidden">
            {/* Stylized Background */}
            <div className="pointer-events-none absolute top-0 right-0 h-[600px] w-[600px] rounded-full bg-emerald-500/5 blur-[120px]" />
            <div className="pointer-events-none absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-blue-500/5 blur-[120px]" />

            <div className="relative z-10">
                <div className="flex justify-center pt-8 pb-4">
                    <Gold3DBanner />
                </div>

                <div className="mx-auto max-w-4xl px-4 py-12">
                    <div className="text-center mb-16">
                        <span className="inline-block py-1 px-3 rounded-full bg-white/5 border border-white/10 text-emerald-400 text-xs font-bold tracking-widest uppercase mb-6">
                            Featured Area
                        </span>
                        <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6">
                            {town.name}
                        </h1>
                        <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
                            Unlock exclusive local savings. Support businesses in {town.name} and save money every time you shop.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
                        {/* Consumer Card */}
                        <div className="bg-[#111821] border border-white/10 rounded-3xl p-8 flex flex-col items-center text-center hover:border-emerald-500/30 transition-colors shadow-2xl shadow-black/50">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/20">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">For Shoppers</h2>
                            <p className="text-gray-400 mb-8 text-sm leading-relaxed">
                                Get instant access to real-time deals from top rated locals. Totally free for a limited time.
                            </p>
                            <div className="mt-auto w-full">
                                <SubscribeButton townSlug={town.slug} townName={town.name} />
                            </div>
                        </div>

                        {/* Merchant Card */}
                        <div className="bg-[#111821] border border-white/10 rounded-3xl p-8 flex flex-col items-center text-center hover:border-blue-500/30 transition-colors shadow-2xl shadow-black/50">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">For Businesses</h2>
                            <p className="text-gray-400 mb-8 text-sm leading-relaxed">
                                Join Today&apos;s Stash to attract more customers and grow your local presence in {town.name}.
                            </p>
                            <div className="mt-auto w-full">
                                <Link
                                    href="/venue-register"
                                    className="block w-full py-4 rounded-xl bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-all text-center"
                                >
                                    Join as a Merchant
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
