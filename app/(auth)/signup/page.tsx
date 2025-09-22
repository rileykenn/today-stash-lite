// app/(auth)/signup/page.tsx
'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

type VerifyOk =
  | { ok: true; login: { email: string } }
  | { ok: true; login: { phone: string } };

export default function SignupPage() {
  const [target, setTarget] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'enter' | 'code' | 'done'>('enter');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleStart() {
    setMessage('');
    setBusy(true);
    try {
      const res = await fetch('/api/auth/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep('code');
        setMessage('Code sent! Check your phone or email.');
      } else {
        setMessage(data.error || 'Failed to send code');
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    setMessage('');
    setBusy(true);
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, code, password }),
      });
      const data: VerifyOk | { error?: string } = await res.json();
      if (!res.ok) {
        setMessage((data as any).error || 'Verification failed');
        return;
      }

      // Auto sign-in (email OR phone)
      const sb = getSupabaseClient();
      if ('login' in data && 'email' in data.login) {
        const { error } = await sb.auth.signInWithPassword({
          email: data.login.email,
          password,
        });
        if (error) {
          setMessage(error.message || 'Sign-in failed');
          return;
        }
      } else if ('login' in data && 'phone' in data.login) {
        const { error } = await sb.auth.signInWithPassword({
          phone: data.login.phone,
          password,
        });
        if (error) {
          setMessage(error.message || 'Sign-in failed');
          return;
        }
      }

      setStep('done');
      setMessage('Signup complete! You’re signed in.');
      // TODO: router.push('/deals') once that page exists
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
            {busy ? 'Verifying…' : 'Verify & Create Account'}
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
