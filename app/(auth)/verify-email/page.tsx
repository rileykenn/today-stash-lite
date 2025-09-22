'use client';

// Standalone verify screen:
// - Users can enter email (or it auto-fills from localStorage 'pendingEmail')
// - Sends/resends Supabase email OTP (numeric code, not magic link)
// - Verifies the code and then sets password

import { useEffect, useState } from 'react';

async function getSb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(url, key);
}

function isEmail(x: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
}

type Step = 'enter' | 'code' | 'done';

export default function VerifyEmailPage() {
  const [email, setEmail] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [step, setStep] = useState<Step>('enter');

  useEffect(() => {
    const cached = typeof window !== 'undefined' ? localStorage.getItem('pendingEmail') : null;
    if (cached && isEmail(cached)) {
      setEmail(cached);
    }
  }, []);

  function errMsg(e: unknown): string {
    return e instanceof Error ? e.message : 'Unexpected error';
  }

  async function sendCode() {
    setMessage('');
    if (!email || !isEmail(email)) {
      setMessage('Enter a valid email.');
      return;
    }
    setBusy(true);
    try {
      const sb = await getSb();
      // Force numeric code mode by not providing emailRedirectTo
      const { error } = await sb.auth.signInWithOtp({
        email: email.toLowerCase(),
        options: { shouldCreateUser: true },
      });
      if (error) {
        setMessage(error.message || 'Failed to send code');
        return;
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('pendingEmail', email.toLowerCase());
      }
      setStep('code');
      setMessage('Code sent! Check your inbox (and spam).');
    } catch (e: unknown) {
      setMessage(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function verifyAndSetPassword() {
    setMessage('');
    if (!email || !isEmail(email)) {
      setMessage('Enter a valid email.');
      return;
    }
    if (!code) {
      setMessage('Enter the 6-digit code from your email.');
      return;
    }
    if (!password || password.length < 6) {
      setMessage('Set a password (min 6 chars).');
      return;
    }
    setBusy(true);
    try {
      const sb = await getSb();
      const { data, error } = await sb.auth.verifyOtp({
        email: email.toLowerCase(),
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
      setMessage('Email verified and password set. You’re signed in.');
      // TODO: router.push('/deals')
    } catch (e: unknown) {
      setMessage(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-6 border rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-4">Verify Email</h1>

      {step === 'enter' && (
        <>
          <input
            className="w-full p-2 border rounded mb-2"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-60"
            onClick={sendCode}
            disabled={busy || !email}
          >
            {busy ? 'Sending…' : 'Send/Resend Code'}
          </button>
        </>
      )}

      {step === 'code' && (
        <>
          <input
            className="w-full p-2 border rounded mb-2"
            placeholder="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <input
            type="password"
            className="w-full p-2 border rounded mb-3"
            placeholder="Set a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            className="w-full bg-green-600 text-white py-2 rounded disabled:opacity-60"
            onClick={verifyAndSetPassword}
            disabled={busy || !code || !password}
          >
            {busy ? 'Verifying…' : 'Verify & Set Password'}
          </button>

          <button
            className="mt-3 w-full border py-2 rounded disabled:opacity-60"
            onClick={sendCode}
            disabled={busy}
          >
            {busy ? 'Sending…' : 'Resend Code'}
          </button>
        </>
      )}

      {step === 'done' && (
        <p className="text-green-600 font-semibold">✅ Verified!</p>
      )}

      {message && <p className="mt-4 text-sm">{message}</p>}
    </div>
  );
}
