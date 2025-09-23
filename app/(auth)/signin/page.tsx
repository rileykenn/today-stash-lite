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

export default function SignInPage() {
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
        window.location.replace('/consumer');
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
      if (!signInErr) { window.location.replace('/consumer'); return; }

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
        // Abandoned signup → ask for password then send OTP
        setPendingEmail(id);
        setNewPw('');
        setConfirmPw('');
        setStep('set_password');
        setNotice('Finish setting up your account: choose a password.');
        return;
      }

      setError('Incorrect email or password.');
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
      if (otpErr) throw otpErr;

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

      window.location.replace('/consumer');
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
        <section className="mt-5 rounded-2xl bg-[rgb(24_32_45)] border border-white/10 p-5">
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@example.com or 0499… / +61…"
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
              disabled={!canSubmitForm || loading}
              className="w-full rounded-full bg-[var(--color-brand-600)] py-3 font-semibold disabled:opacity-60"
            >
              {loading ? 'Please wait…' : 'Continue'}
            </button>
          </form>

          {notice && <div className="mt-4 rounded-2xl p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm">{notice}</div>}
          {error && <div className="mt-2 rounded-xl p-3 bg-red-50 text-red-800 text-sm">{error}</div>}

          <p className="mt-6 text-xs text-white/50">
            Don’t have an account?{' '}
            <Link href="/signup" className="text-[var(--color-brand-600)] underline">Create one</Link>
          </p>
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
