'use client';

import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface EmailVerificationModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function EmailVerificationModal({ open, onClose, onSuccess }: EmailVerificationModalProps) {
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'email' | 'code' | 'success'>('email');
    const [error, setError] = useState('');

    const handleSendVerification = async () => {
        if (!email) {
            setError('Please enter an email address');
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Please enter a valid email address');
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

            const response = await fetch('/api/notifications/send-email-verification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to send verification email');
                return;
            }

            setStep('code');
        } catch (err: any) {
            setError(err.message || 'Failed to send verification email');
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

            const response = await fetch('/api/notifications/verify-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ code })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to verify email');
                return;
            }

            setStep('success');
            setTimeout(() => {
                onSuccess();
                handleClose();
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Failed to verify email');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        onClose();
        setStep('email');
        setEmail('');
        setCode('');
        setError('');
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[#13202B] rounded-2xl max-w-md w-full p-6 ring-1 ring-white/10">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">
                        {step === 'email' ? 'Verify Email' : step === 'code' ? 'Enter Code' : 'Verified!'}
                    </h2>
                    <button onClick={handleClose} className="text-gray-400 hover:text-white">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                {step === 'email' && (
                    <div>
                        <p className="text-sm text-white/70 mb-4">
                            Enter your new email address to receive a verification code.
                        </p>
                        <input
                            type="email"
                            placeholder="your.email@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-lg mb-4 focus:outline-none focus:border-emerald-500"
                        />
                        {error && (
                            <p className="text-red-400 text-sm mb-4">{error}</p>
                        )}
                        <button
                            onClick={handleSendVerification}
                            disabled={loading}
                            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Sending...' : 'Send Verification Code'}
                        </button>
                    </div>
                )}

                {step === 'code' && (
                    <div>
                        <p className="text-sm text-white/70 mb-4">
                            We sent a 6-digit code to <span className="text-white font-medium">{email}</span>.
                            Enter it below to verify.
                        </p>
                        <input
                            type="text"
                            placeholder="123456"
                            maxLength={6}
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-center text-2xl tracking-widest mb-4 focus:outline-none focus:border-emerald-500"
                        />
                        {error && (
                            <p className="text-red-400 text-sm mb-4">{error}</p>
                        )}
                        <button
                            onClick={handleVerifyCode}
                            disabled={loading}
                            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Verifying...' : 'Verify Email'}
                        </button>
                        <button
                            onClick={() => setStep('email')}
                            className="w-full mt-3 text-sm text-white/50 hover:text-white transition-colors"
                        >
                            Change email address
                        </button>
                    </div>
                )}

                {step === 'success' && (
                    <div className="text-center">
                        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">Email Verified!</h3>
                        <p className="text-sm text-white/70 mb-4">
                            Your email has been successfully updated.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
