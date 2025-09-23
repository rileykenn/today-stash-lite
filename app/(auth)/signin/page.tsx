'use client';

import { useState } from 'react';
import Link from 'next/link';
import { sb } from '@/lib/supabaseBrowser';

export default function SignInPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function isEmail(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const raw = identifier.trim();
      let signInRes;

      if (isEmail(raw)) {
        // email login
        signInRes = await sb.auth.signInWithPassword({
          email: raw,
          password,
        });
      } else {
        // phone login
        signInRes = await sb.auth.signInWithPassword({
          phone: raw.startsWith('+') ? raw : `+61${raw.replace(/^0+/, '')}`,
          password,
        });
      }

      if (signInRes.error) throw new Error(signInRes.error.message);

      const { data: { user } } = await sb.auth.getUser();

      if (user && !user.email_confirmed_at) {
        // redirect to verify-email page if not verified
        window.location.replace('/auth/verify-email');
        return;
      }

      // redirect to consumer if verified
      window.location.replace('/consumer');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to sign in.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10 text-white">
      <h1 className="text-3xl font-bold">Sign in</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-xs text-white/60 mb-1">Email or phone</label>
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="you@example.com or 0499… / +61…"
            className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm placeholder:text-white/40 focus:outline-none focus:border-[var(--color-brand-600)]"
          />
        </div>

        <div>
          <label className="block text-xs text-white/60 mb-1">Password</label>
          <input
            type="password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm placeholder:text-white/40 focus:outline-none focus:border-[var(--color-brand-600)]"
          />
        </div>

        {error && (
          <div className="rounded-xl p-3 bg-red-900/20 border border-red-700/30 text-red-300 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !identifier || !password}
          className="w-full rounded-full bg-[var(--color-brand-600)] py-3 font-semibold hover:brightness-110 disabled:opacity-60"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-4 text-xs text-white/50">
        Don’t have an account?{' '}
        <Link href="/signup" className="text-[var(--color-brand-600)] hover:underline">Sign up</Link>
      </p>
    </main>
  );
}
