'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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

// Lazy-create Supabase client in the browser
async function getSb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing Supabase envs');
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(url, key);
}

type Step = 'enter' | 'code' | 'done';

type CheckResp = {
  ok: true;
  method: 'email' | 'phone';
  value: string;
  exists: boolean;
  confirmed: boolean;
  action: 'signin' | 'verify' | 'signup';
};

// Strict, no-any type guard
function isCheckResp(x: unknown): x is CheckResp {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  const ok = o.ok === true;
  const method = o.method === 'email' || o.method === 'phone';
  const value = typeof o.value === 'string';
  const exists = typeof o.exists === 'boolean';
  const confirmed = typeof o.confirmed === 'boolean';
  const action =
    o.action === 'signin' || o.action === 'verify' || o.action === 'signup';
  return ok && method && value && exists && confirmed && action;
}

export default function SignupPage() {
  const router = useRouter();

  const [target, setTarget] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<Step>('enter');

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const [checking, setChecking] = useState(false);
  const [exists, setExists] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [method, setMethod] = useState<'email' | 'phone' | null>(null);

  const passwordsMatch = useMemo(
    () => !!password && password === confirm,
    [password, confirm]
  );

  // Live availability check
  useEffect(() => {
    const value = target.trim();
    if (!value) {
      setExists(false);
      setConfirmed(false);
      setMethod(null);
      return;
    }
    setChecking(true);
    const id = setTimeout(async () => {
      try {
        const res = await fetch('/api/auth/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target: value }),
        });
        const data: unknown = await res.json();
        if (res.ok && isCheckResp(data)) {
          setExists(data.exists);
          setConfirmed(data.confirmed);
          setMethod(data.method);
        } else {
          setExists(false);
          setConfirmed(false);
          setMethod(null);
        }
      } catch {
        setExists(false);
        setConfirmed(false);
        setMethod(null);
      } finally {
        setChecking(false);
      }
    }, 400);
    return () => clearTimeout(id);
  }, [target]);

  async function handleStart() {
    setMessage('');
    setBusy(true);
    try {
      const input = target.trim();
      if (!input) {
        setMessage('Enter your email or phone.');
        return;
      }
      if (!passwordsMatch) {
        setMessage('Passwords do not match.');
        return;
      }

      // Block existing confirmed accounts
      if (exists && confirmed) {
        setMessage(
          method === 'email'
            ? 'This email is already in use. Please sign in.'
            : 'This phone number is already in use. Please sign in.'
        );
        return;
      }

      // If email exists but unconfirmed → verify page
      if (method === 'email' && exists && !confirmed) {
        if (typeof window !== 'undefined')
          localStorage.setItem('pendingEmail', input.toLowerCase());
        router.push('/verify-email');
        return;
      }

      // New account flow
      if (isEmail(input)) {
        const sb = await getSb();
        const { error } = await sb.auth.signInWithOtp({
          email: input.toLowerCase(),
          options: { shouldCreateUser: true },
        });
        if (error) {
          setMessage(error.message || 'Failed to send email code');
          return;
        }
        if (typeof window !== 'undefined')
          localStorage.setItem('pendingEmail', input.toLowerCase());
        setStep('code');
        setMessage('Code sent! Check your inbox.');
        return;
      }

      const phone = normalizePhoneAU(input);
      if (!isE164(phone)) {
        setMessage('Phone must be E.164 (+61...)');
        return;
      }
      const r = await fetch('/api/auth/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: phone }),
      });
      const j = await r.json();
      if (!r.ok) {
        setMessage(j.error || 'Failed to send SMS code');
        return;
      }
      setStep('code');
      setMessage('Code sent! Check your SMS.');
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
        const sb = await getSb();
        const { data, error } = await sb.auth.verifyOtp({
          email: input.toLowerCase(),
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
        if (typeof window !== 'undefined') localStorage.removeItem('pendingEmail');
        setStep('done');
        setMessage('Signup complete! You’re signed in.');
        return;
      }

      const phone = normalizePhoneAU(input);
      const r = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: phone, code: code.trim(), password }),
      });
      const j = await r.json();
      if (!r.ok) {
        setMessage(j.error || 'Verification failed');
        return;
      }
      const sb = await getSb();
      const { error } = await sb.auth.signInWithPassword({ phone, password });
      if (error) {
        setMessage(error.message || 'Sign-in failed');
        return;
      }
      setStep('done');
      setMessage('Signup complete! You’re signed in.');
    } finally {
      setBusy(false);
    }
  }

  const disableSend =
    busy ||
    checking ||
    !target ||
    !password ||
    !confirm ||
    !passwordsMatch ||
    (exists && confirmed);

  return (
    <div className="max-w-md mx-auto mt-20 p-6 border rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Sign Up</h1>

      {step === 'enter' && (
        <>
          <input
            className="w-full p-2 border rounded mb-2"
            placeholder="Email or phone"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
          {checking && <p className="text-sm text-gray-600 mb-2">Checking availability…</p>}
          {exists && confirmed && method === 'email' && (
            <p className="text-sm text-red-600 mb-2">
              This email is already in use.{' '}
              <Link href="/signin" className="underline">Sign in</Link>.
            </p>
          )}
          {exists && confirmed && method === 'phone' && (
            <p className="text-sm text-red-600 mb-2">
              This phone is already in use.{' '}
              <Link href="/signin" className="underline">Sign in</Link>.
            </p>
          )}
          {exists && !confirmed && method === 'email' && (
            <p className="text-sm text-amber-600 mb-2">
              You started signup but haven’t verified.{' '}
              <Link href="/verify-email" className="underline">Enter your code</Link>.
            </p>
          )}

          <input
            type="password"
            className="w-full p-2 border rounded mb-2"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            type="password"
            className="w-full p-2 border rounded mb-3"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {!passwordsMatch && confirm.length > 0 && (
            <p className="text-sm text-red-600 mb-2">Passwords do not match.</p>
          )}

          <button
            className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-60"
            onClick={handleStart}
            disabled={disableSend}
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
