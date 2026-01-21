'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { sb } from '@/lib/supabaseBrowser';

type Step = 'form' | 'set_password' | 'email_verify';

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}
function normalizePhoneAU(input: string): string | null {
  const raw = input.trim().replace(/\s+/g, '').replace(/^0+/, '');
  if (/^\+61\d{9}$/.test(raw)) return raw;
  if (/^61\d{9}$/.test(raw)) return `+${raw}`;
  if (/^4\d{8}$/.test(raw)) return `+61${raw}`;
  if (/^\+?\d{6,15}$/.test(raw)) return raw.startsWith('+') ? raw : `+${raw}`;
  return null;
}
async function safeJson(res: Response): Promise<Record<string, unknown>> {
  try {
    const t = await res.text();
    return t ? (JSON.parse(t) as Record<string, unknown>) : {};
  } catch { return {}; }
}
const getBool = (o: Record<string, unknown>, k: string) =>
  typeof o[k] === 'boolean' ? (o[k] as boolean) : false;

import { useSearchParams } from 'next/navigation';

export default function SignInPage() {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next');
  const redirectTarget = nextParam && nextParam.startsWith('/') ? nextParam : '/consumer';

  const [step, setStep] = useState<Step>('form');

  // Step 1 (form)
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const canSubmitForm = useMemo(
    () => identifier.trim().length > 0 && password.trim().length >= 6,
    [identifier, password]
  );

  // Step 2 (set password)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const strongPw = useMemo(
    () => newPw.length >= 6 && newPw === confirmPw,
    [newPw, confirmPw]
  );

  // Step 3 (verify)
  const [emailCode, setEmailCode] = useState('');
  const [emailCooldown, setEmailCooldown] = useState(0);
  const [sendingOtp, setSendingOtp] = useState(false);

  // UX
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resetAlerts = () => { setError(null); setNotice(null); };

  // cooldown ticker
  useEffect(() => {
    if (emailCooldown <= 0) return;
    const id = setInterval(() => setEmailCooldown((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [emailCooldown]);

  // ----------------- OAUTH: Google -----------------------------------
  async function handleOAuth(provider: 'google') {
    resetAlerts();
    setLoading(true);
    try {
      const { error: oauthError } = await sb.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin + redirectTarget,
        },
      });
      if (oauthError) throw oauthError;
      // If successful, supabase normally handles the redirect.
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'OAuth failed.';
      console.error('OAuth Error:', e);
      setError(msg);
      setLoading(false);
    }
  }

  // ----------------- STEP 1: normal sign-in or detect abandoned email -----------
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    resetAlerts();
    if (!canSubmitForm) return;

    const id = identifier.trim();

    // Phone path
    if (!isEmail(id)) {
      const pn = normalizePhoneAU(id);
      if (!pn) { setError('Enter a valid Australian mobile number (e.g. 0499… or +61…).'); return; }
      setLoading(true);
      try {
        const { error: phoneErr } = await sb.auth.signInWithPassword({ phone: pn, password });
        if (phoneErr) throw phoneErr;
        window.location.replace(redirectTarget);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Invalid phone or password.';
        setError(msg);
      } finally { setLoading(false); }
      return;
    }

    // Email path
    setLoading(true);
    try {
      // Try password sign-in first
      const { error: signInErr } = await sb.auth.signInWithPassword({ email: id, password });
      if (!signInErr) { window.location.replace(redirectTarget); return; }

      // If it failed, check if email exists and is unverified
      const res = await fetch('/api/auth/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: id }),
      });
      const j = await safeJson(res);
      const emailTaken = getBool(j, 'email_taken');
      const emailUnverified = getBool(j, 'email_unverified');

      if (emailTaken && emailUnverified) {
        // Abandoned signup → ask to set password, then send OTP
        setPendingEmail(id);
        setNewPw('');
        setConfirmPw('');
        setStep('set_password');
        setNotice('Finish setting up your account: choose a password.');
        return;
      }

      setError(signInErr?.message || 'Incorrect email or password.');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not sign in.';
      setError(msg);
    } finally { setLoading(false); }
  }

  // ----------------- STEP 2: set password, then send OTP ------------------------
  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    resetAlerts();
    if (!pendingEmail || !strongPw || sendingOtp) return;

    setSendingOtp(true);
    try {
      const { error: otpErr } = await sb.auth.signInWithOtp({
        email: pendingEmail,
        options: { shouldCreateUser: false, emailRedirectTo: undefined },
      });
      if (otpErr) {
        // If this fails with "For security reasons..." the email does not exist
        throw otpErr;
      }

      setNotice('We emailed you a 6-digit code. Enter it below to confirm your account.');
      setEmailCooldown(60);
      setStep('email_verify');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to send code.';
      setError(msg);
    } finally { setSendingOtp(false); }
  }

  async function handleResendEmail() {
    if (!pendingEmail || emailCooldown > 0 || sendingOtp) return;
    setSendingOtp(true);
    resetAlerts();
    try {
      const { error } = await sb.auth.signInWithOtp({
        email: pendingEmail,
        options: { shouldCreateUser: false, emailRedirectTo: undefined },
      });
      if (error) throw error;
      setNotice('We sent a new code. Enter the newest one.');
      setEmailCooldown(60);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to send code.';
      setError(msg);
    } finally { setSendingOtp(false); }
  }

  // ----------------- STEP 3: verify code -> set password -> redirect ------------
  async function handleConfirmEmail(e: React.FormEvent) {
    e.preventDefault();
    resetAlerts();
    if (!pendingEmail || emailCode.trim().length < 4) return;

    setLoading(true);
    try {
      const { error: verifyErr } = await sb.auth.verifyOtp({
        email: pendingEmail,
        token: emailCode.trim(),
        type: 'email',
      });
      if (verifyErr) throw verifyErr;

      const { error: pwErr } = await sb.auth.updateUser({ password: newPw });
      if (pwErr) throw pwErr;

      window.location.replace(redirectTarget);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not confirm your code.';
      if (msg.toLowerCase().includes('token')) {
        setError('Invalid or expired code. Enter the newest code.');
      } else setError(msg);
    } finally { setLoading(false); }
  }

  // -------------------------------- UI -----------------------------------------
  return (
    <main className="mx-auto max-w-screen-sm px-4 py-8 text-white">
      <h1 className="text-2xl font-bold">Sign in</h1>

      {step === 'form' && (
        <section className="mt-5 rounded-2xl bg-[rgb(24_32_45)] border border-white/10 p-6 sm:p-8">
          {/* Social Sign In */}
          <div className="space-y-3 mb-6">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleOAuth('google')}
              className="w-full flex items-center justify-center gap-3 bg-white text-black hover:bg-gray-100 font-semibold py-3 rounded-full transition-colors disabled:opacity-70"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {loading ? 'Connecting…' : 'Continue with Google'}
            </button>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-sm text-white/50">or sign in with email</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@example.com or 0499… / +61…"
              className="w-full rounded-xl bg-black/20 border border-white/10 px-4 py-3 text-base focus:outline-none focus:border-[var(--color-brand-600)] transition-colors placeholder:text-white/30"
            />
            <div className="space-y-2">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full rounded-xl bg-black/20 border border-white/10 px-4 py-3 text-base focus:outline-none focus:border-[var(--color-brand-600)] transition-colors placeholder:text-white/30"
              />
              <div className="flex justify-end pr-1">
                <Link href="/reset" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Forgot password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={!canSubmitForm || loading}
              className="w-full rounded-full bg-[var(--color-brand-600)] py-3.5 font-bold text-lg hover:brightness-110 disabled:opacity-60 disabled:hover:brightness-100 transition-all shadow-lg shadow-[var(--color-brand-600)]/20"
            >
              {loading ? 'Please wait…' : 'Sign in'}
            </button>
          </form>

          {notice && <div className="mt-4 rounded-2xl p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm">{notice}</div>}
          {error && <div className="mt-6 rounded-xl p-4 bg-red-500/10 border border-red-500/20 text-red-200 text-sm text-center">{error}</div>}

          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-base text-white/60">
              Don’t have an account?{' '}
              <Link href="/signup" className="text-[var(--color-brand-600)] font-semibold hover:underline decoration-2 underline-offset-4">
                Create one
              </Link>
            </p>
          </div>
        </section>
      )}

      {step === 'set_password' && (
        <section className="mt-5 rounded-2xl bg-[rgb(24_32_45)] border border-white/10 p-5">
          <p className="text-sm text-white/80">
            Set a password for <span className="font-mono">{pendingEmail}</span>.
          </p>
          <form onSubmit={handleSetPassword} className="mt-3 space-y-3">
            <input
              type="password"
              minLength={6}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="New password"
              className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm focus:outline-none"
            />
            <input
              type="password"
              minLength={6}
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              placeholder="Confirm password"
              className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm focus:outline-none"
            />
            {confirmPw && newPw !== confirmPw && (
              <p className="text-xs text-[rgb(248_113_113)]">Passwords don’t match.</p>
            )}

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={!strongPw || sendingOtp}
                className="flex-1 rounded-full bg-[var(--color-brand-600)] py-3 font-semibold disabled:opacity-60"
              >
                {sendingOtp ? 'Sending…' : 'Continue'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('form'); setPendingEmail(null); setNewPw(''); setConfirmPw(''); }}
                className="rounded-full px-4 py-3 bg-white/10 border border-white/10 text-sm font-semibold hover:bg-white/15"
              >
                Back
              </button>
            </div>
          </form>

          {notice && <div className="mt-4 rounded-2xl p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm">{notice}</div>}
          {error && <div className="mt-2 rounded-xl p-3 bg-red-50 text-red-800 text-sm">{error}</div>}
        </section>
      )}

      {step === 'email_verify' && (
        <section className="mt-5 rounded-2xl bg-[rgb(24_32_45)] border border-white/10 p-5">
          <p className="text-sm text-white/80">
            We sent a 6-digit code to <span className="font-mono">{pendingEmail}</span>.
          </p>
          <form onSubmit={handleConfirmEmail} className="mt-3 space-y-3">
            <input
              inputMode="numeric"
              placeholder="Enter 6-digit code"
              value={emailCode}
              onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm focus:outline-none tracking-widest"
            />

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={loading || emailCode.trim().length < 4}
                className="flex-1 rounded-full bg-[var(--color-brand-600)] py-3 font-semibold disabled:opacity-60"
              >
                {loading ? 'Verifying…' : 'Verify & Sign in'}
              </button>
              <button
                type="button"
                disabled={emailCooldown > 0 || sendingOtp}
                onClick={handleResendEmail}
                className="rounded-full px-4 py-3 bg-white/10 border border-white/10 text-sm font-semibold hover:bg-white/15 disabled:opacity-60"
              >
                {sendingOtp ? 'Sending…' : emailCooldown > 0 ? `Resend in ${emailCooldown}s` : 'Resend'}
              </button>
            </div>
          </form>

          {notice && <div className="mt-4 rounded-2xl p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm">{notice}</div>}
          {error && <div className="mt-2 rounded-xl p-3 bg-red-50 text-red-800 text-sm">{error}</div>}
        </section>
      )}
    </main>
  );
}
