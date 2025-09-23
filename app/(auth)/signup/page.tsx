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

type RpcResult = { email_taken: boolean | null; phone_taken: boolean | null };
type CheckPayload = { p_email: string | null; p_phone: string | null };

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

  // availability flags (from RPC)
  const [emailTaken, setEmailTaken] = useState(false);
  const [phoneTaken, setPhoneTaken] = useState(false);

  const passwordsMatch = useMemo(
    () => !!password && password === confirm,
    [password, confirm]
  );

  function payloadFor(value: string): CheckPayload {
    if (isEmail(value)) {
      return { p_email: value.toLowerCase(), p_phone: null };
    }
    const p = normalizePhoneAU(value);
    if (isE164(p)) return { p_email: null, p_phone: p };
    return { p_email: null, p_phone: null };
  }

  // Debounced availability check while typing
  useEffect(() => {
    const value = target.trim();
    if (!value) {
      setEmailTaken(false);
      setPhoneTaken(false);
      return;
    }
    const id = setTimeout(async () => {
      try {
        const sb = await getSb();
        const { data, error } = await sb.rpc('check_identifier_available', payloadFor(value));
        if (!error) {
          const res = (data as unknown) as RpcResult | null;
          if (res) {
            setEmailTaken(Boolean(res.email_taken));
            setPhoneTaken(Boolean(res.phone_taken));
            return;
          }
        }
        setEmailTaken(false);
        setPhoneTaken(false);
      } catch {
        setEmailTaken(false);
        setPhoneTaken(false);
      }
    }, 400);
    return () => clearTimeout(id);
  }, [target]);

  // One-shot availability check (use on submit to block immediately)
  async function checkImmediately(value: string): Promise<{ emailTaken: boolean; phoneTaken: boolean }> {
    try {
      const sb = await getSb();
      const { data, error } = await sb.rpc('check_identifier_available', payloadFor(value));
      if (!error) {
        const res = (data as unknown) as RpcResult | null;
        if (res) {
          return {
            emailTaken: Boolean(res.email_taken),
            phoneTaken: Boolean(res.phone_taken),
          };
        }
      }
    } catch {}
    return { emailTaken: false, phoneTaken: false };
  }

  // ENTER step: send code after guardrails
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

      // hard block if already taken
      const exists = await checkImmediately(input);
      if (isEmail(input) && exists.emailTaken) {
        setMessage('This email is already in use. Please sign in.');
        return;
      }
      if (!isEmail(input) && exists.phoneTaken) {
        setMessage('This phone number is already in use. Please sign in.');
        return;
      }

      // New account path
      if (isEmail(input)) {
        const sb = await getSb();
        const email = input.toLowerCase();

        // We customized the template to show {{ .Token }} so this sends a numeric code
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
        // router.push('/deals')
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

  const disableSend =
    busy ||
    !target ||
    !password ||
    !confirm ||
    !passwordsMatch ||
    (isEmail(target.trim()) ? emailTaken : phoneTaken);

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
          {isEmail(target.trim()) && emailTaken && (
            <p className="text-sm text-red-600 mb-2">
              This email is already in use.{' '}
              <Link href="/signin" className="underline">
                Sign in
              </Link>
              .
            </p>
          )}
          {!isEmail(target.trim()) && phoneTaken && (
            <p className="text-sm text-red-600 mb-2">
              This phone number is already in use.{' '}
              <Link href="/signin" className="underline">
                Sign in
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
            disabled={disableSend}
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
            Need to verify later?{' '}
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
