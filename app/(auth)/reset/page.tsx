'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { sb } from '@/lib/supabaseBrowser';
import { useRouter } from 'next/navigation';

function normalizePhoneAU(input: string): string | null {
  const raw = input.trim().replace(/\s+/g, '').replace(/^0+/, '');
  if (/^\+61\d{9}$/.test(raw)) return raw;
  if (/^61\d{9}$/.test(raw)) return `+${raw}`;
  if (/^4\d{8}$/.test(raw)) return `+61${raw}`;
  if (/^\+?\d{6,15}$/.test(raw)) return raw.startsWith('+') ? raw : `+${raw}`;
  return null;
}

export default function ResetPage() {
  const router = useRouter();

  const [step, setStep] = useState<'identify' | 'verify' | 'reset' | 'success'>('identify');
  const [identifier, setIdentifier] = useState(''); // email or phone
  const [code, setCode] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  // Step 1: Request reset (email)
  async function handleIdentify() {
    setError(null);
    setLoading(true);

    try {
      if (identifier.includes('@')) {
        // Email reset -> Custom Resend API
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: identifier })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to send reset email');

        setCooldown(60);
        setStep('verify'); // Move to enter code step
      } else {
        // Phone reset -> Send SMS OTP
        const pn = normalizePhoneAU(identifier);
        if (!pn) throw new Error('Invalid phone number format');

        // Update identifier to normalized version for verifying step
        setIdentifier(pn);

        const { error } = await sb.auth.signInWithOtp({
          phone: pn,
          options: { shouldCreateUser: false }
        });
        if (error) throw error;
        setCooldown(60);
        setStep('verify');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Verify code
  async function handleVerify() {
    setError(null);
    setLoading(true);

    try {
      if (identifier.includes('@')) {
        // Verify via our new API
        const res = await fetch('/api/auth/reset-password/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: identifier, code })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Invalid code');

        setStep('reset');
        setStep('reset');
      } else {
        // Phone verify -> standard Supabase verifyOtp
        const { error } = await sb.auth.verifyOtp({
          phone: identifier,
          token: code,
          type: 'sms',
        });
        if (error) throw error;
        // User is now logged in via SMS OTP
        setStep('reset');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Resend Code
  async function handleResend() {
    if (cooldown > 0 || loading) return;
    await handleIdentify();
  }

  // Step 3: Change password
  async function handleResetPassword() {
    setError(null);
    if (newPass.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPass !== confirmPass) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);

    try {
      if (identifier.includes('@')) {
        // Email flow: confirm via API
        const res = await fetch('/api/auth/reset-password/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: identifier, code, password: newPass })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update password');

      } else {
        // Phone flow: update user normally (authenticated via phone verify? No wait, phone logic was different)
        // Actually, the phone logic in original code was just verify -> setStep('reset'). 
        // But how did 'reset' work for phone? 
        // Original code: `sb.auth.updateUser({ password: newPass })`
        // This assumes the user IS LOGGED IN.
        // Wait, `verify_phone_reset_code` usually logs user in or returns a session? 
        // If `sb.rpc` just verifies, it doesn't log them in. 
        // The original code was relying on `sb.auth.verifyOtp` which DOES log you in for email.
        // For Phone, it was `sb.rpc`. I suspect the Phone flow might be broken or I misunderstood it in original read.
        // BUT, I am only tasked to fix Email flow. I will leave Phone flow as "try to update user" 
        // but if they aren't logged in, it will fail. 
        // For EMAIL flow, we aren't logged in on the client side. We do it server side.
        // So for Email, we use the API. For Phone, we keep original logic (which might be assuming session).

        const { error } = await sb.auth.updateUser({ password: newPass });
        if (error) throw error;
      }

      setSuccessMsg('You have successfully changed your password. You will be redirected shortly.');
      setStep('success');

      setTimeout(() => {
        router.replace('/signin');
      }, 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-screen-sm px-4 py-8 text-white">
      <h1 className="text-2xl font-bold">Reset Password</h1>

      <section className="mt-5 rounded-2xl bg-[rgb(24_32_45)] border border-white/10 p-6 sm:p-8">
        {step === 'identify' && (
          <>
            <p className="text-sm text-white/60 mb-6">
              Enter your email or phone number to receive a verification code.
            </p>
            <input
              type="text"
              placeholder="Email or phone number"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full rounded-xl bg-black/20 border border-white/10 px-4 py-3 text-base focus:outline-none focus:border-[var(--color-brand-600)] transition-colors placeholder:text-white/30"
            />
            {error && <div className="mt-4 rounded-xl p-4 bg-red-500/10 border border-red-500/20 text-red-200 text-sm">{error}</div>}
            <button
              onClick={handleIdentify}
              disabled={loading || !identifier}
              className="w-full mt-6 rounded-full bg-[var(--color-brand-600)] py-3.5 font-bold text-lg hover:brightness-110 disabled:opacity-60 disabled:hover:brightness-100 transition-all shadow-lg shadow-[var(--color-brand-600)]/20"
            >
              {loading ? 'Sending…' : 'Send Code'}
            </button>
          </>
        )}

        {step === 'verify' && (
          <>
            <p className="text-sm text-white/60 mb-6">
              We sent a 6-digit code to <span className="text-white font-medium">{identifier}</span>
            </p>
            <input
              type="text"
              placeholder="Enter 6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-xl bg-black/20 border border-white/10 px-4 py-3 text-base text-center tracking-widest focus:outline-none focus:border-[var(--color-brand-600)] transition-colors placeholder:text-white/30"
              maxLength={6}
            />
            {error && <div className="mt-4 rounded-xl p-4 bg-red-500/10 border border-red-500/20 text-red-200 text-sm">{error}</div>}

            <div className="flex flex-col gap-3 mt-6">
              <button
                onClick={handleVerify}
                disabled={loading || !code}
                className="w-full rounded-full bg-[var(--color-brand-600)] py-3.5 font-bold text-lg hover:brightness-110 disabled:opacity-60 disabled:hover:brightness-100 transition-all shadow-lg shadow-[var(--color-brand-600)]/20"
              >
                {loading ? 'Verifying…' : 'Verify Code'}
              </button>
              <button
                onClick={handleResend}
                disabled={cooldown > 0 || loading}
                className="w-full rounded-full bg-white/5 border border-white/10 py-3 font-semibold text-sm hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
              </button>
              <button
                onClick={() => setStep('identify')}
                className="w-full rounded-full bg-transparent py-2 text-sm text-white/40 hover:text-white transition-colors"
              >
                Change email/phone
              </button>
            </div>
          </>
        )}

        {step === 'reset' && (
          <div className="space-y-4">
            <p className="text-sm text-white/60 mb-6">
              Create a new password for your account.
            </p>
            <div className="space-y-4">
              <input
                type="password"
                placeholder="New password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                className="w-full rounded-xl bg-black/20 border border-white/10 px-4 py-3 text-base focus:outline-none focus:border-[var(--color-brand-600)] transition-colors placeholder:text-white/30"
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                className="w-full rounded-xl bg-black/20 border border-white/10 px-4 py-3 text-base focus:outline-none focus:border-[var(--color-brand-600)] transition-colors placeholder:text-white/30"
              />
            </div>
            {newPass && confirmPass && newPass !== confirmPass && (
              <p className="text-red-400 text-sm ml-1">Passwords do not match</p>
            )}
            {error && <div className="mt-4 rounded-xl p-4 bg-red-500/10 border border-red-500/20 text-red-200 text-sm">{error}</div>}
            <button
              onClick={handleResetPassword}
              disabled={loading || !newPass || !confirmPass}
              className="w-full mt-2 rounded-full bg-[var(--color-brand-600)] py-3.5 font-bold text-lg hover:brightness-110 disabled:opacity-60 disabled:hover:brightness-100 transition-all shadow-lg shadow-[var(--color-brand-600)]/20"
            >
              {loading ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-8">
            <div className="mx-auto w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mb-6 ring-1 ring-emerald-500/20">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Password Reset!</h2>
            <p className="text-white/60 mb-6">
              Your password has been changed successfully.
            </p>
            <p className="text-sm text-[var(--color-brand-600)] animate-pulse">
              Redirecting to sign in...
            </p>
          </div>
        )}
      </section>

      {
        step !== 'success' && (
          <div className="mt-8 text-center">
            <Link href="/signin" className="text-sm text-white/40 hover:text-white transition-colors">
              Cancel and return to sign in
            </Link>
          </div>
        )
      }
    </main >
  );
}

