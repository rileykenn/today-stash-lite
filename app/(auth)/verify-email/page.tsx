'use client';

import { useEffect, useState } from 'react';
import { sb } from '@/lib/supabaseBrowser';

export default function VerifyEmailPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await sb.auth.getUser();
      setEmail(user?.email ?? null);

      if (user?.email_confirmed_at) {
        window.location.replace('/consumer'); // your post-verify destination
      }
    })();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((n) => n - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  async function resend() {
    setError(null);
    setNotice(null);
    if (!email) {
      setError('No email found in session. Please sign in again.');
      return;
    }
    if (cooldown > 0) return;

    try {
      const { error: resendErr } = await sb.auth.resend({ type: 'signup', email });
      if (resendErr) throw new Error(resendErr.message);
      setNotice('Verification email re-sent. Check your inbox (and spam).');
      setCooldown(10);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not resend email.';
      setError(msg);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10 text-white">
      <h1 className="text-2xl font-semibold">Verify your email</h1>
      <p className="mt-2 text-white/70">
        We sent a confirmation link to {email ?? 'your email'}. You must confirm it to access your account.
      </p>

      {notice && (
        <div className="mt-4 rounded-md bg-emerald-900/30 border border-emerald-700/40 p-3 text-emerald-300">
          {notice}
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-md bg-red-900/20 border border-red-700/30 p-3 text-red-300">
          {error}
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <button
          onClick={resend}
          disabled={cooldown > 0}
          className="rounded-full bg-[var(--color-brand-600)] px-5 py-2 font-semibold disabled:opacity-60"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend email'}
        </button>
        <button
          onClick={() => window.location.reload()}
          className="rounded-full border border-white/20 px-5 py-2"
        >
          I’ve verified
        </button>
      </div>
    </main>
  );
}
