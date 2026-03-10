'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { sb } from '@/lib/supabaseBrowser';
import { SparklesIcon } from '@heroicons/react/24/outline';

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const email = `${username.trim().toLowerCase()}@sales.todaysstash.com`;
        const { error: authError } = await sb.auth.signInWithPassword({
            email,
            password,
        });

        if (authError) {
            setError(authError.message);
            setLoading(false);
            return;
        }

        router.push('/dashboard');
        router.refresh();
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#050B10] px-4">
            {/* Background glow */}
            <div
                aria-hidden="true"
                className="pointer-events-none fixed inset-0 bg-[radial-gradient(800px_500px_at_50%_30%,rgba(16,185,129,0.12),transparent_60%)]"
            />

            <div className="relative w-full max-w-md">
                {/* Logo / Branding */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-900/30">
                            <SparklesIcon className="w-5 h-5 text-white" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-white">Today&apos;s Stash</h1>
                    <p className="text-sm text-white/50 mt-1">Sales Pitch Deck Tool</p>
                </div>

                {/* Login Form */}
                <form
                    onSubmit={handleLogin}
                    className="bg-[#111821] rounded-2xl p-8 border border-white/10 shadow-2xl shadow-black/50 space-y-5"
                >
                    <div>
                        <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                            Username
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-[#0A0F13] rounded-xl px-4 py-3 border border-white/10 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none text-white placeholder-white/20 transition"
                            placeholder="e.g. Adrian"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-[#0A0F13] rounded-xl px-4 py-3 border border-white/10 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none text-white placeholder-white/20 transition"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            'Sign In'
                        )}
                    </button>

                    <p className="text-xs text-white/30 text-center pt-2">
                        Internal use only — Today&apos;s Stash Sales Team
                    </p>
                </form>
            </div>
        </div>
    );
}
