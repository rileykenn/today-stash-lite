'use client';

import { useState, useEffect } from 'react';
import { sb } from '@/lib/supabaseBrowser';
import { useRouter } from 'next/navigation';

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

        setStep('verify'); // Move to enter code step
      } else {
        // Phone reset (Twilio, using your backend RPC - unchanged)
        const { error } = await sb.rpc('send_phone_reset_code', { p_phone: identifier });
        if (error) throw error;
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
      } else {
        // Phone verify
        const { data, error } = await sb.rpc('verify_phone_reset_code', {
          p_phone: identifier,
          p_code: code,
        });
        if (error) throw error;
        setStep('reset');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
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
    <main className="min-h-screen bg-[#0A0F13] flex items-center justify-center px-6">
      <div className="w-full max-w-sm bg-[#13202B] rounded-2xl p-6 shadow-lg ring-1 ring-white/10">
        {step === 'identify' && (
          <>
            <h1 className="text-xl font-bold text-white mb-4">Reset Password</h1>
            <input
              type="text"
              placeholder="Email or phone number"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full rounded-lg bg-white/10 text-white px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
            <button
              onClick={handleIdentify}
              disabled={loading || !identifier}
              className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending…' : 'Send Code'}
            </button>
          </>
        )}

        {step === 'verify' && (
          <>
            <h1 className="text-xl font-bold text-white mb-4">Enter Verification Code</h1>
            <p className="text-gray-400 text-sm mb-4">
              We sent a 6-digit code to <span className="text-white">{identifier}</span>
            </p>
            <input
              type="text"
              placeholder="Enter 6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-lg bg-white/10 text-white px-3 py-2 mb-3 text-center tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              maxLength={6}
            />
            {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
            <button
              onClick={handleVerify}
              disabled={loading || !code}
              className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying…' : 'Verify Code'}
            </button>
            <button
              onClick={() => setStep('identify')}
              className="w-full mt-3 text-sm text-gray-500 hover:text-gray-300"
            >
              Back to email
            </button>
          </>
        )}

        {step === 'reset' && (
          <>
            <h1 className="text-xl font-bold text-white mb-4">Choose New Password</h1>
            <input
              type="password"
              placeholder="New password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              className="w-full rounded-lg bg-white/10 text-white px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              className="w-full rounded-lg bg-white/10 text-white px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            {newPass && confirmPass && newPass !== confirmPass && (
              <p className="text-red-400 text-sm mb-2">Passwords do not match</p>
            )}
            {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
            <button
              onClick={handleResetPassword}
              disabled={loading || !newPass || !confirmPass}
              className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating…' : 'Update Password'}
            </button>
          </>
        )}

        {step === 'success' && (
          <div className="text-center py-4">
            <div className="mx-auto w-12 h-12 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h1 className="text-lg font-semibold text-emerald-400 mb-2">Success!</h1>
            <p className="text-sm text-gray-300 mb-4">
              Your password has been reset successfully.
            </p>
            <p className="text-xs text-gray-500">
              Redirecting to sign in...
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

