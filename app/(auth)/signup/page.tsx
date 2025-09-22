'use client';

// Do NOT export dynamic here; the (auth)/layout.tsx already disables prerender.

import { useState } from 'react';

function isEmail(x: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
}
function isE164(x: string): boolean {
  return /^\+\d{7,15}$/.test(x);
}
function normalizePhoneAU(s: string): string {
  const t = s.replace(/\s+/g, '');
  if (t.startsWith('+')) return t;
  if (/^0\d{8,10}$/.test(t)) return '+61' + t.slice(1);
  return t;
}

// Lazy-create supabase client ONLY inside event handlers (prevents build/prerender crashes)
function getSbSafe() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  const { createClient } = require('@supabase/supabase-js');
  return createClient(url, key);
}

type Step = 'enter' | 'code' | 'done';

export default function SignupPage() {
  const [target, setTarget] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<Step>('enter');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleStart() {
    setMessage('');
    setBusy(true);
    try {
      const input = target.trim();
      if (!input || !password) {
        setMessage('Enter your email/phone and a password.');
        return;
      }

      if (isEmail(input)) {
        // EMAIL: Supabase Email OTP (no SendGrid/domain needed)
        const sb = getSbSafe();
        const email = input.toLowerCase();
        const { error } = await sb.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: true },
        });
        if (error) {
          setMessage(error.message || 'Failed to send email code');
          return;
        }
        setStep('code');
        setMessage('Code sent! Check your inbox (and spam).');
        return;
      }

      // PHONE: Twilio Verify via our API
      const phone = normalizePhoneAU(input);
      if (!isE164(phone)) {
        setMessage('Phone must be E.164 (+61...)');
        return;
      }
      const res = await fetch('/api/auth/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || 'Failed to send SMS code');
        return;
      }
      setStep('code');
      setMessage('Code sent! Check your SMS.');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unexpected error';
      setMessage(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    setMessage('');
    setBusy(true);
    try {
      const input = target.trim();
      if (!input || !code) {
        setMessage('Enter the code you received.');
        return;
      }

      if (isEmail(input)) {
        // EMAIL: verify -> session -> set password
        const sb = getSbSafe();
        const email = input.toLowerCase();
        const { data, error } = await sb.auth.verifyOtp({
          email,
          token: code.trim(),
          type: 'email',
        });
        if (error || !data?.session) {
          setMessage(error?.message || 'Invalid or expired code');
          return;
        }
        const upd = await sb.auth.updateUser({ password });
        if (upd.error) {
          setMessage(upd.error.message || 'Failed to set password');
          return;
        }
        setStep('done');
        setMessage('Signup complete! You’re signed in.');
        return;
      }

      // PHONE: verify via server, then sign in with password
      const phone = normalizePhoneAU(input);
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: phone, code: code.trim(), password }),
      });
      const vr = await res.json();
      if (!res.ok) {
        setMessage(vr.error || 'Verification failed');
        return;
      }
      const sb = getSbSafe();
      const { error } = await sb.auth.signInWithPassword({ phone, password });
      if (error) {
        setMessage(error.message || 'Sign-in failed');
        return;
      }
      setStep('done');
      setMessage('Signup complete! You’re signed in.');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unexpected error';
      setMessage(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-6 border rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-4">Sign Up</h1>

      {step === 'enter' && (
        <>
          <input
            className="w-full p-2 border rounded mb-2"
            placeholder="Email or phone"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
          <input
            type="password"
            className="w-full p-2 border rounded mb-3"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-60"
            onClick={handleStart}
            disabled={busy || !target || !password}
          >
            {busy ? 'Sending…' : 'Send Code'}
          </button>
        </>
      )}

      {step === 'code' && (
        <>
          <input
            className="w-full p-2 border rounded mb-3"
            placeholder="Enter verification code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button
            className="w-full bg-green-600 text-white py-2 rounded disabled:opacity-60"
            onClick={handleVerify}
            disabled={busy || !code}
          >
            {busy ? 'Verifying…' : 'Verify & Continue'}
          </button>
        </>
      )}

      {step === 'done' && (
        <p className="text-green-600 font-semibold">✅ Signup complete!</p>
      )}

      {message && <p className="mt-4 text-sm">{message}</p>}
    </div>
  );
}
