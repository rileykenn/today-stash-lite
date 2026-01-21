'use client';

import React, { useState, useEffect } from 'react';
import { sb } from '@/lib/supabaseBrowser';
import { XMarkIcon } from '@heroicons/react/24/outline';

type ResetMethod = 'email' | 'phone';

interface ValidatedContact {
    type: ResetMethod;
    value: string;
}

export default function ResetPasswordModal({
    isOpen,
    onClose,
    user,
    profile,
    initialMessage,
    onSuccess
}: {
    isOpen: boolean;
    onClose: () => void;
    user: any;
    profile: any;
    initialMessage?: string;
    onSuccess?: () => void;
}) {
    const [step, setStep] = useState<'method' | 'verify' | 'password'>('method');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedMethod, setSelectedMethod] = useState<ValidatedContact | null>(null);
    const [otpCode, setOtpCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setStep('method');
            setError(null);
            setOtpCode('');
            setNewPassword('');
            setConfirmPassword('');
            setLoading(false);
            determineInitialMethod();
        }
        // ESLint disable is necessary here: we ONLY want to run this when the modal opens (isOpen changes).
        // If user/profile update in the background while the modal is open, we MUST NOT reset the state.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const determineInitialMethod = () => {
        const hasEmail = user?.email || profile?.email;
        const hasPhone = user?.phone || profile?.phone;

        // If only one method, auto-select and move to 'verify' (trigger send immediately? or wait for user to click Next?)
        // User requested: "if an account only has an email... the modal doesnt have to ask this question. then they select next..."
        // So we pre-select but still show the "We will send code to..." step? Or just skip to method selection.
        // Let's implement logic:
        // If BOTH: show selection.
        // If ONE: set it as selected, but maybe keep 'method' step or auto-advance? 
        // User said: "then they select next and then it will say we sent a code".
        // So if ONE method: Auto set it, maybe auto-trigger send if separate step? 
        // Let's simpler: If one method, set `selectedMethod` immediately. If 1 method, Step 1 UI changes to "Reset via [Method]" -> Click "Send Code".

        // Note: Use Profile data primarily, fallback to User auth data
        const emailVal = profile?.email || user?.email;
        const phoneVal = profile?.phone || user?.phone;

        if (emailVal && !phoneVal) {
            setSelectedMethod({ type: 'email', value: emailVal });
        } else if (phoneVal && !emailVal) {
            setSelectedMethod({ type: 'phone', value: phoneVal });
        } else if (emailVal && phoneVal) {
            setSelectedMethod(null); // Force selection
        }
    };

    const handleSendCode = async () => {
        if (!selectedMethod) return;
        setLoading(true);
        setError(null);

        try {
            if (selectedMethod.type === 'email') {
                // Use custom Resend API for Email
                const { data: sessionData } = await sb.auth.getSession();
                if (!sessionData?.session) throw new Error('No active session');

                const res = await fetch('/api/auth/send-reset-otp', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${sessionData.session.access_token}`
                    }
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to send code');

            } else {
                // Use standard Supabase for SMS (if configured)
                const { error: err } = await sb.auth.signInWithOtp({
                    phone: selectedMethod.value
                });
                if (err) throw err;
            }

            setStep('verify');
        } catch (err: any) {
            console.error('Send OTP error:', err);
            if (err.message && err.message.includes('seconds')) {
                setError("Please wait a moment before requesting another code.");
            } else {
                setError(err.message || 'Failed to send code.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async () => {
        if (!otpCode || !selectedMethod) return;
        setLoading(true);
        setError(null);

        try {
            if (selectedMethod.type === 'phone') {
                const { error: err } = await sb.auth.verifyOtp({
                    phone: selectedMethod.value,
                    token: otpCode,
                    type: 'sms'
                });
                if (err) throw err;
            } else {
                // Use custom API for Email verification
                const { data: sessionData } = await sb.auth.getSession();
                if (!sessionData?.session) throw new Error('No active session');

                const res = await fetch('/api/auth/verify-reset-otp', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${sessionData.session.access_token}`
                    },
                    body: JSON.stringify({ code: otpCode })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Invalid code');

                // Successful API check means code is correct.
            }

            // Upon success, session is refreshed/verified. Move to Password step.
            setStep('password');
        } catch (err: any) {
            console.error('Verify error:', err);
            setError(err.message || 'Invalid code.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePassword = async () => {
        if (!newPassword || !confirmPassword) {
            setError('Please enter both passwords.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { error } = await sb.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            // Success!
            alert('Password updated successfully.');
            if (onSuccess) onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Update password error:', err);
            setError(err.message || 'Failed to update password.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const emailVal = profile?.email || user?.email;
    const phoneVal = profile?.phone || user?.phone;
    const hasBoth = emailVal && phoneVal;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#13202B] rounded-2xl w-full max-w-md border border-white/10 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h3 className="text-lg font-semibold text-white">Reset/Set Password</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                    {initialMessage && !error && (
                        <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-200 text-sm">
                            {initialMessage}
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                            {error}
                        </div>
                    )}

                    {step === 'method' && (
                        <div className="space-y-6">
                            <p className="text-gray-300">
                                To secure your account, we need to verify your identity.
                                {hasBoth
                                    ? ' Where should we send the verification code?'
                                    : ` We will send a code to your registered ${selectedMethod?.type === 'phone' ? 'phone number' : 'email'}.`
                                }
                            </p>

                            {hasBoth && (
                                <div className="grid gap-3">
                                    <button
                                        onClick={() => setSelectedMethod({ type: 'email', value: emailVal })}
                                        className={`p-4 rounded-xl border text-left transition-all ${selectedMethod?.type === 'email'
                                            ? 'bg-emerald-500/20 border-emerald-500 ring-1 ring-emerald-500'
                                            : 'bg-white/5 border-white/10 hover:border-white/20'
                                            }`}
                                    >
                                        <p className="font-medium text-white">Email</p>
                                        <p className="text-sm text-gray-400">{emailVal}</p>
                                    </button>

                                    <button
                                        onClick={() => setSelectedMethod({ type: 'phone', value: phoneVal })}
                                        className={`p-4 rounded-xl border text-left transition-all ${selectedMethod?.type === 'phone'
                                            ? 'bg-emerald-500/20 border-emerald-500 ring-1 ring-emerald-500'
                                            : 'bg-white/5 border-white/10 hover:border-white/20'
                                            }`}
                                    >
                                        <p className="font-medium text-white">Phone (SMS)</p>
                                        <p className="text-sm text-gray-400">{phoneVal}</p>
                                    </button>
                                </div>
                            )}

                            {/* If simple case, just show confirm/next */}
                            {!hasBoth && selectedMethod && (
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <p className="font-medium text-white capitalize">{selectedMethod.type}</p>
                                    <p className="text-sm text-gray-400">{selectedMethod.value}</p>
                                </div>
                            )}

                            <button
                                onClick={handleSendCode}
                                disabled={loading || !selectedMethod}
                                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
                            >
                                {loading ? 'Sending Code...' : 'Send Code'}
                            </button>
                        </div>
                    )}

                    {step === 'verify' && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <p className="text-gray-300 mb-1">Enter code sent to</p>
                                <p className="font-medium text-white">{selectedMethod?.value}</p>
                            </div>

                            <div>
                                <input
                                    type="text"
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value)}
                                    placeholder="123456"
                                    maxLength={6}
                                    className="w-full text-center text-3xl tracking-widest bg-white/5 border border-white/20 rounded-xl py-3 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder:text-white/10"
                                    autoFocus
                                />
                            </div>

                            <button
                                onClick={handleVerifyCode}
                                disabled={loading || otpCode.length < 6}
                                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
                            >
                                {loading ? 'Verifying...' : 'Verify Code'}
                            </button>

                            <button
                                onClick={() => setStep('method')}
                                className="w-full py-2 text-sm text-gray-400 hover:text-white"
                            >
                                Go back
                            </button>
                        </div>
                    )}

                    {step === 'password' && (
                        <div className="space-y-4">
                            <p className="text-gray-300">Identity verified. Set your new password.</p>

                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">New Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                                    placeholder="••••••••"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">Confirm Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                                    placeholder="••••••••"
                                />
                            </div>

                            <button
                                onClick={handleUpdatePassword}
                                disabled={loading || !newPassword}
                                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors mt-4"
                            >
                                {loading ? 'Updating...' : 'Update Password'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
