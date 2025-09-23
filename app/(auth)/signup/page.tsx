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

// Lazy-create Supabase client with dynamic ESM import (avoids build-time issues)
async function getSb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(url, key);
}

type Step = 'enter' | 'code' | 'done';

type CheckOk = {
  ok: true;
  method: 'email' | 'phone';
  value: string;
  exists: boolean;
  confirmed: boolean;
  action: 'signin' | 'verify' | 'signup';
};

function isCheckOk(x: unknown): x is CheckOk {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  return o.ok === true && (o.method === 'email' || o.method === 'phone');
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Unexpected error';
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

  // existence state for inline UI
  const [existsState, setExistsState] = useState<{
    exists: boolean;
    confirmed: boolean;
    method: 'email' | 'phone' | null;
  }>({ exists: false, confirmed: false, method: null });

  const passwordsMatch = useMemo(
    () => !!password && password === confirm,
    [password, confirm]
  );

  // ---- existence check that RETURNS the result for immediate branching ----
  async function fetchExists(input: string): Promise<CheckOk | null> {
    try {
      const res = await fetch('/api/auth/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: input }),
      });
      const data: unknown = await res.json();
      if (res.ok && isCheckOk(data)) return data;
      return null;
    } catch {
      return null;
    }
  }

  async function checkAndSet(input: string) {
    if (!input) {
      setExistsState({ exists: false, confirmed: false, method: null });
      return;
    }
    const result = await fetchExists(input);
    if (result) {
      setExistsState({
        exists: result.exists,
        confirmed: result.confirmed,
        method: result.method,
      });
    } else {
      setExistsState({ exists: false, confirmed: false, method: null });
    }
  }

  // Debounced existence check as the user types
  useEffect(() => {
    if (!target.trim()) {
      setExistsState({ exists: false, confirmed: false, method: null });
      return;
    }
    const t = setTimeout(() => {
      void checkAndSet(target.trim());
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  // ENTER step: send code (email via Supabase, phone via Twilio) after guardrails
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

      // Get a fresh, synchronous existence result and branch on THAT (not state)
      const check = await fetchExists(input);

      if (check?.exists) {
        if (check.confirmed) {
          // Confirmed account exists -> show inline error + block
          setExistsState({ exists: true, confirmed: true, method: check.method });
          setMessage('That account already exists. Please sign in.');
          return; // do NOT advance
        } else {
          // Unconfirmed: route to verify-email for email flow
          if (check.method === 'email') {
            if (typeof window !== 'undefined') {
              localStorage.setItem('pendingEmail', input.toLowerCase());
            }
            router.push('/verify-email');
            return;
          }
        }
      }

      // New account path
      if (isEmail(input)) {
        const sb = await getSb();
        const email = input.toLowerCase();

        // Force numeric code (we customized the template to show {{ .Token }})
        const { error } = await sb.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: true },
        });
        if (error) {
          setMessage(error.message || 'Failed to send email code');
          return;
        }
        if (typeof window !== 'undefined') {
          localStorage.setItem('pendingEmail', email);
        }
        setStep('code');
        setMessage('Code sent! Check your inbox (and spam).');
        return;
      }

      // Phone path (Twilio)
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
    } catch (e) {
      setMessage(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  // CODE step: verify and complete
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
        if (typeof window !== 'undefined') {
          localStorage.removeItem('pendingEmail');
        }
        setStep('done');
        setMessage('Signup complete! You’re signed in.');
        return;
      }

      // Phone: verify via server then sign in with password
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
      const sb = await getSb();
      const { error } = await sb.auth.signInWithPassword({ phone, password });
      if (error) {
        setMessage(error.message || 'Sign-in failed');
        return;
      }
      setStep('done');
      setMessage('Signup complete! You’re signed in.');
    } catch (e) {
      setMessage(errMsg(e));
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
            onBlur={(e) => void checkAndSet(e.target.value.trim())}
          />
          {/* inline helper under identifier */}
          {existsState.method === 'email' && existsState.exists && existsState.confirmed && (
            <p className="text-sm text-red-600 mb-2">
              This email is already in use.{' '}
              <Link href="/signin" className="underline">
                Sign in
              </Link>
              .
            </p>
          )}
          {existsState.method === 'email' && existsState.exists && !existsState.confirmed && (
            <p className="text-sm text-amber-600 mb-2">
              You started signup but haven’t verified.{' '}
              <Link href="/verify-email" className="underline">
                Enter your code
              </Link>
              .
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
            disabled={
              busy ||
              !target ||
              !password ||
              !confirm ||
              !passwordsMatch ||
              (existsState.method === 'email' && existsState.exists && existsState.confirmed)
            }
          >
            {busy ? 'Sending…' : 'Send Code'}
          </button>

          <div className="mt-3 text-sm">
            Already have an account?{' '}
            <Link href="/signin" className="underline">
              Sign in
            </Link>
            .
          </div>
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

          <div className="mt-3 text-sm">
            Need to resend or verify later?{' '}
            <Link href="/verify-email" className="underline">
              Go to Verify Email
            </Link>
            .
          </div>
        </>
      )}

      {step === 'done' && (
        <p className="text-green-600 font-semibold">✅ Signup complete!</p>
      )}

      {message && <p className="mt-4 text-sm">{message}</p>}
    </div>
  );
}
