'use client';

import React, { useState } from 'react';
import { sb } from '@/lib/supabaseBrowser';

interface WelcomeNameModalProps {
    open: boolean;
    userId: string;
    onSuccess: (newName: string) => void;
}

export default function WelcomeNameModal({ open, userId, onSuccess }: WelcomeNameModalProps) {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (!name.trim()) {
            setError('Please enter your name');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // 1. Update Supabase Profile
            // 1. Update Supabase Profile (Upsert to handle missing rows)
            const { error: updateError } = await sb
                .from('profiles')
                .upsert({
                    user_id: userId,
                    first_name: name.trim()
                })
                .select();

            if (updateError) throw updateError;

            // 2. Success callback
            onSuccess(name.trim());
        } catch (err: any) {
            console.error('Error updating name:', err);
            // DEBUGGING: Show full raw error to user
            const rawError = JSON.stringify(err, null, 2);
            setError(`Error: ${err.message || ''} (Code: ${err.code || 'N/A'}) - ${rawError}`);
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
            <div className="bg-[#13202B] rounded-2xl max-w-md w-full p-8 ring-1 ring-white/10 shadow-2xl relative">
                {/* Decorative header element */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-t-2xl" />

                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-white mb-2">Welcome!</h2>
                    <p className="text-white/70">What should we call you?</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-white/50 mb-1 ml-1">First Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                if (error) setError('');
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                            placeholder="e.g. Riley"
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-lg focus:outline-none focus:border-emerald-500 transition-colors"
                            autoFocus
                        />
                    </div>

                    {error && (
                        <p className="text-red-400 text-sm text-center bg-red-500/10 py-2 rounded-lg">{error}</p>
                    )}

                    <p className="text-xs text-white/30 text-center">
                        You can change this later in your profile settings.
                    </p>

                    <button
                        onClick={handleSubmit}
                        disabled={loading || !name.trim()}
                        className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                        {loading ? 'Saving...' : 'Start Saving Today'}
                    </button>
                </div>
            </div>
        </div>
    );
}
