'use client';

import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface PhoneVerificationModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function PhoneVerificationModal({ open, onClose, onSuccess }: PhoneVerificationModalProps) {
    const [step, setStep] = useState<'enter-phone' | 'enter-code'>('enter-phone');
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSendCode = async () => {
        if (!phone) {
            setError('Please enter a phone number');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const { data: { session } } = await (await import('@/lib/supabaseBrowser')).sb.auth.getSession();
            if (!session) {
                setError('Please sign in first');
                return;
            }

            const response = await fetch('/api/notifications/send-phone-verification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ phone })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to send code');
                return;
            }

            setStep('enter-code');
        } catch (err: any) {
            setError(err.message || 'Failed to send code');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async () => {
        if (!code || code.length !== 6) {
            setError('Please enter the 6-digit code');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const { data: { session } } = await (await import('@/lib/supabaseBrowser')).sb.auth.getSession();
            if (!session) {
                setError('Please sign in first');
                return;
            }

            const response = await fetch('/api/notifications/verify-phone', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ code })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Invalid code');
                return;
            }

            // Success!
            onSuccess();
            onClose();
            setStep('enter-phone');
            setPhone('');
            setCode('');
        } catch (err: any) {
            setError(err.message || 'Failed to verify code');
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[#13202B] rounded-2xl max-w-md w-full p-6 ring-1 ring-white/10">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Verify Phone Number</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                {step === 'enter-phone' ? (
                    <div>
                        <p className="text-sm text-white/70 mb-4">
                            Enter your phone number to receive a verification code via SMS.
                        </p>
                        <input
                            type="tel"
                            placeholder="+1 (555) 123-4567"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-lg mb-4 focus:outline-none focus:border-emerald-500"
                        />
                        {error && (
                            <p className="text-red-400 text-sm mb-4">{error}</p>
                        )}
                        <button
                            onClick={handleSendCode}
                            disabled={loading}
                            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Sending...' : 'Send Code'}
                        </button>
                    </div>
                ) : (
                    <div>
                        <p className="text-sm text-white/70 mb-2">
                            We sent a 6-digit code to <span className="text-white font-medium">{phone}</span>
                        </p>
                        <p className="text-xs text-white/50 mb-4">
                            Code expires in 5 minutes
                        </p>
                        <input
                            type="text"
                            placeholder="000000"
                            maxLength={6}
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-2xl text-center tracking-widest mb-4 focus:outline-none focus:border-emerald-500"
                        />
                        {error && (
                            <p className="text-red-400 text-sm mb-4">{error}</p>
                        )}
                        <button
                            onClick={handleVerifyCode}
                            disabled={loading}
                            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 mb-2"
                        >
                            {loading ? 'Verifying...' : 'Verify Code'}
                        </button>
                        <button
                            onClick={() => {
                                setStep('enter-phone');
                                setCode('');
                                setError('');
                            }}
                            className="w-full text-white/60 hover:text-white text-sm py-2"
                        >
                            Change phone number
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
