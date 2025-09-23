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
type CheckErr = { error: string };

function isCheckOk(x: unknown): x is CheckOk {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  return o.ok === true && typeof o.method === 'string';
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

  // inline field warnings
  const [existsInfo, setExistsInfo] = useState<{
    exists: boolean;
    confirmed: boolean;
    method: 'email' | 'phone' | null;
  }>({ exists: false, confirmed: false, method: null });

  const passwordsMatch = useMemo(
    () => !!password && password === confirm,
    [password, confirm]
  );

  // Soft-check existence when the user finishes typing the identifier
  async function checkTargetExists(input: string) {
    if (!input) {
      setExistsInfo({ exists: false, confirmed: false, method: null });
      return;
    }
    try {
      const res = await fetch('/api/auth/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: input }),
      });
      const data: unknown = await res.json();
      if (res.ok && isCheckOk(data)) {
        setExistsInfo({
          exists: data.exists,
          confirmed: data.confirmed,
          method: data.method,
        });
      } else {
        setExistsInfo({ exists: false, confirmed: false, method: null });
      }
    } catch {
      setExistsInfo({ exists: false, confirmed: false, method: null });
    }
  }

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

      // Always check existence on submit
      await checkTargetExists(input);

      if (existsInfo.exists) {
        // If an account exists…
        if (existsInfo.confirmed) {
          // Confirmed: send them to sign-in
          setMessage('That account already exists. Please sign in.');
          router.push('/signin');
          return;
        } else {
          // Unconfirmed: route to verify-email flow for email; for phone, you shouldn't hit this state
          if (isEmail(input)) {
            if (typeof window !== 'undefined') {
              localStorage.setItem('pendingEmail', input.toLowerCase());
            }
            setMessage('Finish verifying your email to continue.');
            router.push('/verify-email');
            return;
          }
        }
      }

      // New account path
      if (isEmail(input)) {
        const sb = await getSb();
        const email = input.toLowerCase();

        // Force numeric code (no magic link) — template shows {{ .Token }}
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
        // router.push('/deals') // enable when ready
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
      // router.push('/deals')
    } catch (e) {
      setMessage(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  // Debounced existence check when user stops typing for 500ms
  useEffect(() => {
    if (!target.trim()) {
      setExistsInfo({ exists: false, confirmed: false, method: null });
      return;
    }
    const t = setTimeout(() => {
      void checkTargetExists(target.trim());
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

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
            onBlur={(e) => void checkTargetExists(e.target.value.trim())}
          />
          {/* inline helper under identifier */}
          {existsInfo.method === 'email' && existsInfo.exists && existsInfo.confirmed && (
            <p className="text-sm text-red-600 mb-2">
              This email is already in use.{' '}
              <Link href="/signin" className="underline">
                Sign in
              </Link>
              .
            </p>
          )}
          {existsInfo.method === 'email' && existsInfo.exists && !existsInfo.confirmed && (
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
              (existsInfo.method === 'email' && existsInfo.exists && existsInfo.confirmed)
            }
          >
            {busy ? 'Sending…' : 'Send Code'}
          </button>

          {/* helpful links */}
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
