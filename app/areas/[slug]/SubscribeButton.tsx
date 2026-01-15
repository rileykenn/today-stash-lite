"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { sb } from "@/lib/supabaseBrowser";

type SubscribeButtonProps = {
    townSlug: string;
    townName: string;
};

export default function SubscribeButton({ townSlug, townName }: SubscribeButtonProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [subscribed, setSubscribed] = useState(false);
    const [session, setSession] = useState<any>(null);

    useEffect(() => {
        let mounted = true;

        async function checkStatus() {
            const {
                data: { session },
            } = await sb.auth.getSession();

            if (!mounted) return;
            setSession(session);

            if (session) {
                // Fetch profile to check subscriptions
                const { data: profile } = await sb
                    .from("profiles")
                    .select("subscribed_towns")
                    .eq("user_id", session.user.id)
                    .single();

                if (profile?.subscribed_towns) {
                    // Check if current slug is in the array
                    if (Array.isArray(profile.subscribed_towns)) {
                        setSubscribed(profile.subscribed_towns.includes(townSlug));
                    }
                }
            }
            setLoading(false);
        }

        checkStatus();

        return () => { mounted = false; };
    }, [townSlug]);

    const handleSubscribe = async () => {
        if (!session) {
            // If not logged in, redirect to signup/login, then bring them back here
            // or directly to consumer page if that's the desired flow.
            // User requested: "redirect to verify page if not logged in" -> implicitly signup/login
            router.push(`/signup?next=${encodeURIComponent(`/areas/${townSlug}`)}`);
            return;
        }

        setLoading(true);

        try {
            // 1. Get current list
            const { data: profile } = await sb
                .from("profiles")
                .select("subscribed_towns")
                .eq("user_id", session.user.id)
                .single();

            let currentSubs: string[] = [];
            if (profile?.subscribed_towns && Array.isArray(profile.subscribed_towns)) {
                currentSubs = [...profile.subscribed_towns];
            }

            let newSubs: string[];
            if (subscribed) {
                // Unsubscribe
                newSubs = currentSubs.filter(s => s !== townSlug);
            } else {
                // Subscribe
                if (!currentSubs.includes(townSlug)) {
                    newSubs = [...currentSubs, townSlug];
                } else {
                    newSubs = currentSubs;
                }
            }

            // 2. Update DB
            const { error } = await sb
                .from("profiles")
                .update({ subscribed_towns: newSubs })
                .eq("user_id", session.user.id);

            if (error) throw error;

            setSubscribed(!subscribed);

            // If they just subscribed, maybe redirect them to the deals page?
            // Or keep them here? User said: "adds that town to their subscribed towns ... then when user goes onto view towns section"
            // Let's keep them here but show success state.

        } catch (e) {
            console.error("Error updating subscription:", e);
            alert("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <button
                disabled
                className="w-full py-4 rounded-xl bg-emerald-500/20 text-emerald-500 font-semibold animate-pulse"
            >
                Checking...
            </button>
        );
    }

    if (subscribed) {
        return (
            <div className="space-y-3">
                <button
                    onClick={() => router.push("/consumer")}
                    className="block w-full py-4 rounded-xl bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 transition-all transform hover:-translate-y-0.5"
                >
                    View Deals in {townName}
                </button>
                <button
                    onClick={handleSubscribe}
                    className="text-xs text-gray-500 hover:text-gray-300 underline decoration-gray-700 underline-offset-4 transition-colors"
                >
                    Unsubscribe from {townName}
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={handleSubscribe}
            className="w-full py-4 rounded-xl bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 transition-all transform hover:-translate-y-0.5 hover:shadow-emerald-500/40"
        >
            Subscribe to {townName}
        </button>
    );
}
