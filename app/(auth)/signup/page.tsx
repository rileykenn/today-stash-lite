'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { sb } from '@/lib/supabaseBrowser';

type Step = 'form' | 'phone_verify' | 'email_verify' | 'done';

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

/** AU phone -> always +61XXXXXXXXX */
function normalizePhoneAU(input: string): string | null {
  const raw = input.trim().replace(/\s+/g, '').replace(/^0+/, '');
  if (/^\+61\d{9}$/.test(raw)) return raw;
  if (/^61\d{9}$/.test(raw)) return `+${raw}`;
  if (/^4\d{8}$/.test(raw)) return `+61${raw}`;
  if (/^\+?\d{6,15}$/.test(raw)) return raw.startsWith('+') ? raw : `+${raw}`;
  return null;
}

/** Safe JSON parse */
async function safeJson(res: Response): Promise<Record<string, unknown>> {
  try {
    const text = await res.text();
    return text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
const getStr = (o: Record<string, unknown>, k: string) =>
  typeof o[k] === 'string' ? (o[k] as string) : null;
const getBool = (o: Record<string, unknown>, k: string) =>
  typeof o[k] === 'boolean' ? (o[k] as boolean) : null;

export default function SignupPage() {
  // Banner if already signed in
  const [sessionChecked, setSessionChecked] = useState(false);
  const [alreadySignedIn, setAlreadySignedIn] = useState(false);
  useEffect(() => {
    (async () => {
      const { data: { session } } = await sb.auth.getSession();
      setAlreadySignedIn(Boolean(session));
      setSessionChecked(true);
    })();
  }, []);

  const [step, setStep] = useState<Step>('form');

  // form fields
  const [firstName, setFirstName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  // availability
  const [emailTaken, setEmailTaken] = useState(false);
  const [phoneTaken, setPhoneTaken] = useState(false);

  // phone verify state
  const [sentToPhone, setSentToPhone] = useState<string | null>(null);
  const [code, setCode] = useState(''); // phone code
  const [cooldown, setCooldown] = useState(0);
  const [otpSending, setOtpSending] = useState(false);

  // email verify state
  const [sentToEmail, setSentToEmail] = useState<string | null>(null);
  const [emailCode, setEmailCode] = useState('');
  const [emailCooldown, setEmailCooldown] = useState(0);
  const [emailSending, setEmailSending] = useState(false);

  // UX
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resetAlerts = () => { setError(null); setNotice(null); };

  // resend cooldown tickers
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);
  useEffect(() => {
    if (emailCooldown <= 0) return;
    const id = setInterval(() => setEmailCooldown((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [emailCooldown]);

  const strongPassword = useMemo(
    () => password.length >= 6 && password === confirm,
    [password, confirm]
  );

  // Debounced availability check — ALWAYS reset flags first
  useEffect(() => {
    const t = setTimeout(async () => {
      const raw = identifier.trim();
      setEmailTaken(false);
      setPhoneTaken(false);
      if (!raw) return;

      const email = isEmail(raw) ? raw : null;
      const phone = !email ? normalizePhoneAU(raw) : null;

      try {
        const res = await fetch('/api/auth/check-availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, phone }),
        });
        if (!res.ok) return; // treat non-OK as "not taken"
        const j = await safeJson(res);
        if (email) setEmailTaken(Boolean(getBool(j, 'email_taken')));
        if (phone) setPhoneTaken(Boolean(getBool(j, 'phone_taken')));
      } catch {
        // network issues → leave as not taken
      }
    }, 300);
    return () => clearTimeout(t);
  }, [identifier]);

  const canSubmitForm =
    step === 'form' &&
    firstName.trim().length > 0 &&
    identifier.trim().length > 0 &&
    strongPassword &&
    !loading;

  const canVerifyPhone =
    step === 'phone_verify' &&
    code.trim().length >= 4 &&
    !loading;

  // ---- OAUTH: Google ----
  async function handleOAuth(provider: 'google') {
    resetAlerts();
    setLoading(true);
    try {
      const { error: oauthError } = await sb.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin + '/consumer',
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

  // ---- PHONE: start verify (Twilio via your API) ----
  async function startPhoneVerify(targetPhone: string) {
    if (otpSending) return; // Prevent duplicate requests
    setOtpSending(true);
    try {
      const r = await fetch('/api/auth/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: targetPhone }),
      });
      const j = await safeJson(r);
      if (!r.ok || getStr(j, 'error')) throw new Error(getStr(j, 'error') ?? `Failed to send code (${r.status})`);

      setSentToPhone(targetPhone);
      setCooldown(60);
      setStep('phone_verify');
      setNotice('We sent a code via SMS. Enter it below to finish signup.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send code.');
    } finally {
      setOtpSending(false);
    }
  }

  // ---- PHONE: verify code -> create user -> sign in ----
  async function verifyPhoneAndCreate(targetPhone: string) {
    // 1) verify code
    const vr = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: targetPhone, code: code.trim() }),
    });
    const vj = await safeJson(vr);
    const approved = Boolean(getBool(vj, 'approved'));
    if (!approved) throw new Error(getStr(vj, 'error') ?? 'Invalid or expired code.');

    // 2) create user (store +61)
    const cr = await fetch('/api/auth/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: targetPhone, password, first_name: firstName }),
    });
    const cj = await safeJson(cr);
    const createOk = cr.ok && Boolean(getBool(cj, 'ok'));
    if (!createOk) {
      if (cr.status === 409) throw new Error(getStr(cj, 'error') ?? 'Phone already in use.');
      throw new Error(getStr(cj, 'error') ?? 'Could not create account.');
    }

    // 3) sign in with phone + password
    const { error: signInErr } = await sb.auth.signInWithPassword({ phone: targetPhone, password });
    if (signInErr) throw new Error(signInErr.message);

    setStep('done');
    if (typeof window !== 'undefined') window.location.replace('/consumer');
  }

  // ---- EMAIL: send OTP using Supabase email OTP (no magic link) ----
  async function startEmailOtp(targetEmail: string) {
    setEmailSending(true);
    try {
      const { error: otpErr } = await sb.auth.signInWithOtp({
        email: targetEmail,
        options: { shouldCreateUser: true, emailRedirectTo: undefined },
      });
      if (otpErr) throw new Error(otpErr.message);

      setSentToEmail(targetEmail);
      setEmailCooldown(60);
      setStep('email_verify');
      setNotice('We emailed you a 6-digit code. Enter it below to finish signup.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send email code.');
    } finally {
      setEmailSending(false);
    }
  }

  // ---- EMAIL: verify OTP -> set password -> redirect ----
  async function verifyEmailOtpAndFinalize() {
    if (!sentToEmail) throw new Error('Missing email.');
    // 1) verify OTP (this creates a session & marks email_confirmed_at)
    const { error: verifyErr } = await sb.auth.verifyOtp({
      email: sentToEmail,
      token: emailCode.trim(),
      type: 'email',
    });
    if (verifyErr) throw new Error(verifyErr.message);

    // 2) attach password to the now-verified user (uses the session from step 1)
    const { error: pwErr } = await sb.auth.updateUser({ password });
    if (pwErr) throw new Error(pwErr.message);

    // 3) go to the app
    setStep('done');
    if (typeof window !== 'undefined') window.location.replace('/consumer');
  }

  // ---- submit from initial form ----
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    resetAlerts();
    if (!canSubmitForm) return;

    const raw = identifier.trim();

    // EMAIL PATH
    if (isEmail(raw)) {
      if (emailTaken) {
        // UI below already shows the hyperlink to /signin
        return;
      }
      await startEmailOtp(raw);
      return;
    }

    // PHONE PATH — normalize + start OTP
    const normalized = normalizePhoneAU(raw);
    if (!normalized) { setError('Enter a valid Australian mobile number.'); return; }
    if (phoneTaken) {
      // UI below already shows the hyperlink to /signin
      return;
    }
    await startPhoneVerify(normalized);
  }

  // ---- confirm phone ----
  async function handleConfirmPhone(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    resetAlerts();
    if (!canVerifyPhone || !sentToPhone) return;
    setLoading(true);
    try {
      await verifyPhoneAndCreate(sentToPhone);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not finish signup.';
      if (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('invalid')) {
        setError('Invalid or expired code. Enter the newest code.');
      } else setError(msg);
    } finally { setLoading(false); }
  }

  // ---- confirm email ----
  async function handleConfirmEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    resetAlerts();
    if (!sentToEmail || !emailCode.trim()) return;
    setLoading(true);
    try {
      await verifyEmailOtpAndFinalize();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not finish email signup.';
      if (msg.toLowerCase().includes('token')) {
        setError('Invalid or expired code. Enter the newest code.');
      } else setError(msg);
    } finally { setLoading(false); }
  }

  async function handleResendSms() {
    if (!sentToPhone || cooldown > 0 || otpSending) return;
    await startPhoneVerify(sentToPhone);
  }

  async function handleResendEmail() {
    if (!sentToEmail || emailCooldown > 0 || emailSending) return;
    await startEmailOtp(sentToEmail);
  }

  return (
    <main className="mx-auto max-w-screen-sm px-4 py-8 text-white">
      <h1 className="text-3xl font-bold tracking-tight">Create your account</h1>

      {sessionChecked && alreadySignedIn && (
        <div className="mt-3 rounded-lg bg-yellow-100/10 border border-yellow-300/20 px-3 py-2 text-sm text-yellow-200">
          You’re already signed in.
          <div className="mt-2 flex gap-2">
            <button onClick={() => (window.location.href = '/consumer')} className="rounded-md bg-white/10 px-3 py-1">
              Go to app
            </button>
            <button
              onClick={async () => { await sb.auth.signOut(); window.location.reload(); }}
              className="rounded-md border border-white/20 px-3 py-1"
            >
              Sign out
            </button>
          </div>
        </div>
      )}

      {step === 'form' && (
        <section className="mt-6 rounded-2xl bg-[rgb(24_32_45)] border border-white/10 p-6 sm:p-8">
          {/* Social Sign Up */}
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

          <div className="flex items-center gap-3 mb-8">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-sm text-white/50">or sign up with email</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-white/60 mb-1 ml-1">First name</label>
              <input
                value={firstName}
                onChange={(e) => {
                  const val = e.target.value.replace(/[0-9]/g, ''); // Remove numbers
                  const capitalized = val.charAt(0).toUpperCase() + val.slice(1);
                  setFirstName(capitalized);
                  resetAlerts();
                }}
                placeholder="John"
                className="w-full rounded-xl bg-black/20 border border-white/10 px-4 py-3 text-base placeholder:text-white/30 focus:outline-none focus:border-[var(--color-brand-600)] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-white/60 mb-1 ml-1">Email or mobile</label>
              <input
                value={identifier}
                onChange={(e) => { setIdentifier(e.target.value); resetAlerts(); }}
                placeholder="you@example.com or 0499… / +61…"
                className="w-full rounded-xl bg-black/20 border border-white/10 px-4 py-3 text-base placeholder:text-white/30 focus:outline-none focus:border-[var(--color-brand-600)] transition-colors"
              />
              {identifier && isEmail(identifier) && emailTaken && (
                <p className="mt-2 text-sm text-[color:rgb(248_113_113)] bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                  An account with that email address already exists.{' '}
                  <Link href="/signin" className="underline font-semibold">Log in</Link>
                </p>
              )}
              {identifier && !isEmail(identifier) && phoneTaken && (
                <p className="mt-2 text-sm text-[color:rgb(248_113_113)] bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                  An account with that phone number already exists.{' '}
                  <Link href="/signin" className="underline font-semibold">Log in</Link>
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/60 mb-1 ml-1">Password</label>
                <input
                  type="password"
                  minLength={6}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); resetAlerts(); }}
                  placeholder="••••••••"
                  className="w-full rounded-xl bg-black/20 border border-white/10 px-4 py-3 text-base placeholder:text-white/30 focus:outline-none focus:border-[var(--color-brand-600)] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1 ml-1">Confirm password</label>
                <input
                  type="password"
                  minLength={6}
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); resetAlerts(); }}
                  placeholder="Re-enter"
                  className="w-full rounded-xl bg-black/20 border border-white/10 px-4 py-3 text-base placeholder:text-white/30 focus:outline-none focus:border-[var(--color-brand-600)] transition-colors"
                />
              </div>
            </div>
            {confirm && password !== confirm && (
              <p className="text-xs text-[rgb(248_113_113)] ml-1">Passwords don’t match.</p>
            )}

            {error && (
              <div className="rounded-xl p-4 bg-red-500/10 border border-red-500/20 text-red-200 text-sm text-center">
                {error}
              </div>
            )}
            {notice && (
              <div className="rounded-xl p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm text-center">
                {notice}
              </div>
            )}

            <button
              disabled={!canSubmitForm}
              type="submit"
              className="w-full rounded-full bg-[var(--color-brand-600)] py-3.5 font-bold text-lg hover:brightness-110 disabled:opacity-60 disabled:hover:brightness-100 transition-all shadow-lg shadow-[var(--color-brand-600)]/20 mt-4"
            >
              {loading ? 'Please wait…' : 'Sign up'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-base text-white/60">
              Already have an account?{' '}
              <Link href="/signin" className="text-[var(--color-brand-600)] font-semibold hover:underline decoration-2 underline-offset-4">
                Sign in
              </Link>
            </p>
          </div>
        </section>
      )}

      {step === 'phone_verify' && (
        <section className="mt-6 rounded-2xl bg-[rgb(24_32_45)] border border-white/10 p-5 space-y-4">
          <p className="text-sm">
            We sent a code to <span className="font-mono">{sentToPhone}</span>. Enter it below to finish signup.
          </p>
          <form onSubmit={handleConfirmPhone} className="space-y-3">
            {notice && (
              <div className="rounded-2xl p-3 bg-[color:rgb(16_185_129_/_0.18)] border border-[color:rgb(16_185_129_/_0.35)] text-[color:rgb(16_185_129)] text-sm">{notice}</div>
            )}
            <input
              inputMode="numeric"
              placeholder="Enter code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm placeholder:text-white/40 focus:outline-none focus:border-[var(--color-brand-600)] tracking-widest"
            />

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={!canVerifyPhone}
                className="flex-1 rounded-full bg-[var(--color-brand-600)] py-3 font-semibold hover:brightness-110 disabled:opacity-60"
              >
                {loading ? 'Verifying…' : 'Confirm & Create account'}
              </button>
              <button
                type="button"
                disabled={cooldown > 0 || otpSending}
                onClick={handleResendSms}
                className="rounded-full px-4 py-3 bg-white/10 border border-white/10 text-sm font-semibold hover:bg-white/15 disabled:opacity-60"
              >
                {otpSending ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend'}
              </button>
            </div>

            {error && (
              <div className="rounded-xl p-3 bg-[color:rgb(254_242_242)] text-[color:rgb(153_27_27)] text-sm">{error}</div>
            )}
          </form>

          <button
            type="button"
            onClick={() => { setStep('form'); setCode(''); setNotice(null); setError(null); }}
            className="w-full rounded-full bg-white/10 border border-white/10 py-3 font-semibold hover:bg-white/15"
          >
            Use a different number
          </button>
        </section>
      )}

      {step === 'email_verify' && (
        <section className="mt-6 rounded-2xl bg-[rgb(24_32_45)] border border-white/10 p-5 space-y-4">
          <p className="text-sm">
            We emailed a code to <span className="font-mono">{sentToEmail}</span>. Enter it below to finish signup.
          </p>
          <form onSubmit={handleConfirmEmail} className="space-y-3">
            {notice && (
              <div className="rounded-2xl p-3 bg-[color:rgb(16_185_129_/_0.18)] border border-[color:rgb(16_185_129_/_0.35)] text-[color:rgb(16_185_129)] text-sm">{notice}</div>
            )}
            <input
              inputMode="numeric"
              placeholder="Enter 6-digit code"
              value={emailCode}
              onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm placeholder:text-white/40 focus:outline-none focus:border-[var(--color-brand-600)] tracking-widest"
            />

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={loading || emailCode.trim().length < 4}
                className="flex-1 rounded-full bg-[var(--color-brand-600)] py-3 font-semibold hover:brightness-110 disabled:opacity-60"
              >
                {loading ? 'Verifying…' : 'Verify & Create account'}
              </button>
              <button
                type="button"
                disabled={emailCooldown > 0 || emailSending}
                onClick={handleResendEmail}
                className="rounded-full px-4 py-3 bg-white/10 border border-white/10 text-sm font-semibold hover:bg-white/15 disabled:opacity-60"
              >
                {emailSending ? 'Sending…' : emailCooldown > 0 ? `Resend in ${emailCooldown}s` : 'Resend'}
              </button>
            </div>

            {error && (
              <div className="rounded-xl p-3 bg-[color:rgb(254_242_242)] text-[color:rgb(153_27_27)] text-sm">{error}</div>
            )}
          </form>

          <button
            type="button"
            onClick={() => { setStep('form'); setEmailCode(''); setNotice(null); setError(null); }}
            className="w-full rounded-full bg-white/10 border border-white/10 py-3 font-semibold hover:bg-white/15"
          >
            Use a different email
          </button>
        </section>
      )}

      {step === 'done' && (
        <section className="mt-6 rounded-2xl bg-[rgb(24_32_45)] border border-white/10 p-5">
          <div className="rounded-md bg-green-50 p-3 text-green-700 text-sm">
            You’re all set!
          </div>
        </section>
      )}

      <div className="h-24" />
    </main>
  );
}
