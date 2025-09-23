'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { sb } from '@/lib/supabaseBrowser';

export default function SignInPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  function isEmail(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  }

  // cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      const id = identifier.trim();

      if (isEmail(id)) {
        const { error: signInErr } = await sb.auth.signInWithPassword({ email: id, password });
        if (!signInErr) {
          window.location.replace('/consumer');
          return;
        }
        // Likely unverified / no password yet → prompt to verify
        setNotice('We couldn’t sign you in yet. Verify your email to continue.');
        return;
      }

      // Phone path (if supported)
      const { error: phoneErr } = await sb.auth.signInWithPassword({ phone: id, password });
      if (phoneErr) throw phoneErr;
      window.location.replace('/consumer');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not sign in.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function resendEmailOtp() {
    setError(null);
    setNotice(null);
    if (!isEmail(identifier) || cooldown > 0) return;

    try {
      const { error } = await sb.auth.signInWithOtp({
        email: identifier.trim(),
        options: { shouldCreateUser: false, emailRedirectTo: undefined },
      });
      if (error) throw error;

      setNotice('We sent you a new 6-digit code. Check your inbox.');
      setCooldown(60);
      window.location.replace('/auth/verify-email');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to send code.';
      setError(msg);
    }
  }

  return (
    <main className="mx-auto max-w-sm p-6 text-white">
      <h1 className="text-2xl font-bold">Sign in</h1>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <input
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="you@example.com or +61…"
          className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm focus:outline-none"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-[var(--color-brand-600)] py-3 font-semibold disabled:opacity-60"
        >
          {loading ? 'Please wait…' : 'Sign in'}
        </button>
      </form>

      {/* Helper for unverified email accounts */}
      {isEmail(identifier) && (
        <div className="mt-4 text-sm">
          <p className="text-white/70">Didn’t finish verifying your email?</p>
          <button
            type="button"
            onClick={resendEmailOtp}
            disabled={cooldown > 0}
            className="mt-2 rounded-full px-4 py-2 bg-white/10 border border-white/10 text-sm font-semibold hover:bg-white/15 disabled:opacity-60"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend verification code'}
          </button>
        </div>
      )}

      {notice && (
        <div className="mt-4 rounded-2xl p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm">
          {notice}
        </div>
      )}
      {error && (
        <div className="mt-2 rounded-xl p-3 bg-red-50 text-red-800 text-sm">
          {error}
        </div>
      )}

      <p className="mt-6 text-xs text-white/50">
        Don’t have an account?{' '}
        <Link href="/signup" className="text-[var(--color-brand-600)] underline">Create one</Link>
      </p>
    </main>
  );
}
