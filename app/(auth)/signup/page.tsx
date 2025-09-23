'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { sb } from '@/lib/supabaseBrowser';

type Step = 'form' | 'phone_verify' | 'done';

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

/** AU phone normalizer -> always +61XXXXXXXXX */
function normalizePhoneAU(input: string): string {
  let raw = input.replace(/\s+/g, '');
  raw = raw.replace(/^0+/, '');          // "0499..." -> "499..."
  if (/^\+61\d{9}$/.test(raw)) return raw;
  if (/^61\d{9}$/.test(raw)) return `+${raw}`;
  if (/^4\d{8}$/.test(raw)) return `+61${raw}`;
  if (/^\d+$/.test(raw)) return `+${raw}`;
  return raw;
}

/** Safe JSON parse for fetch responses (handles empty/HTML bodies). */
async function safeJson(res: Response): Promise<unknown> {
  try {
    const text = await res.text();
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

/** Type guards / helpers (no `any`) */
function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}
function getBool(obj: unknown, key: string): boolean | null {
  if (isObj(obj) && typeof obj[key] === 'boolean') return obj[key] as boolean;
  return null;
}
function getStr(obj: unknown, key: string): string | null {
  if (isObj(obj) && typeof obj[key] === 'string') return obj[key] as string;
  return null;
}

export default function SignupPage() {
  // Session banner (no auto-redirect)
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
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  // availability flags
  const [emailTaken, setEmailTaken] = useState(false);
  const [phoneTaken, setPhoneTaken] = useState(false);

  // phone verify state
  const [sentToPhone, setSentToPhone] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [otpSending, setOtpSending] = useState(false);

  // UX
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resetAlerts = () => { setError(null); setNotice(null); };

  // resend cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const strongPassword = useMemo(
    () => password.length >= 6 && password === confirm,
    [password, confirm]
  );

  // Debounced availability check (server-side; normalized phone)
  useEffect(() => {
    const t = setTimeout(async () => {
      const raw = identifier.trim();
      if (!raw) { setEmailTaken(false); setPhoneTaken(false); return; }

      const email = isEmail(raw) ? raw : null;
      const phone = !email ? normalizePhoneAU(raw) : null;

      try {
        const res = await fetch('/api/auth/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, phone }),
        });
        const j = await safeJson(res);
        if (!res.ok || getStr(j, 'error')) return;

        setEmailTaken(Boolean(getBool(j, 'email_taken')));
        setPhoneTaken(Boolean(getBool(j, 'phone_taken')));
      } catch {
        // ignore transient errors; don't block typing
      }
    }, 300);
    return () => clearTimeout(t);
  }, [identifier]);

  // Disable submit when taken / weak / loading
  const alreadyUsed =
    (isEmail(identifier) && emailTaken) ||
    (!isEmail(identifier) && phoneTaken);

  const canSubmitForm =
    step === 'form' &&
    identifier.trim().length > 0 &&
    strongPassword &&
    !alreadyUsed &&
    !loading;

  const canVerifyPhone =
    step === 'phone_verify' &&
    code.trim().length >= 4 &&
    !loading;

  // Twilio start (always with normalized +61)
  async function startPhoneVerify(targetPhone: string) {
    setOtpSending(true);
    try {
      const r = await fetch('/api/auth/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: targetPhone }),
      });
      const j = await safeJson(r);
      const ok = r.ok && !getStr(j, 'error');
      if (!ok) throw new Error(getStr(j, 'error') ?? 'Failed to send code');

      setSentToPhone(targetPhone);
      setCooldown(10);
      setStep('phone_verify');
      setNotice('We sent a code via SMS. Enter it below to finish signup.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send code.');
    } finally {
      setOtpSending(false);
    }
  }

  // Verify -> create user (store +61) -> sign in
  async function verifyPhoneAndCreate(targetPhone: string) {
    // 1) verify code
    const r = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: targetPhone, code: code.trim() }),
    });
    const j = await safeJson(r);
    const approved = Boolean(getBool(j, 'approved'));
    if (!approved) throw new Error(getStr(j, 'error') ?? 'Invalid or expired code.');

    // 2) create user
    const createRes = await fetch('/api/auth/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: targetPhone, password }),
    });
    const createJson = await safeJson(createRes);
    const createOk = createRes.ok && Boolean(getBool(createJson, 'ok'));
    if (!createOk) {
      if (createRes.status === 409) throw new Error(getStr(createJson, 'error') ?? 'Phone already in use.');
      throw new Error(getStr(createJson, 'error') ?? 'Could not create account.');
    }

    // 3) sign in with phone + password
    const { error: signInErr } = await sb.auth.signInWithPassword({ phone: targetPhone, password });
    if (signInErr) throw new Error(signInErr.message);

    setStep('done');
    if (typeof window !== 'undefined') window.location.replace('/consumer');
  }

  // Submit
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    resetAlerts();
    if (!canSubmitForm) return;

    const raw = identifier.trim();

    // EMAIL PATH
    if (isEmail(raw)) {
      if (emailTaken) { setError('This email is already in use.'); return; }
      setLoading(true);
      try {
        const { error: signUpError } = await sb.auth.signUp({ email: raw, password });
        if (signUpError) throw new Error(signUpError.message);
        setNotice('Check your email to confirm your account.');
        setStep('done');
      } catch (e: unknown) {
        if (e instanceof Error && /already/i.test(e.message)) setError('This email is already in use.');
        else setError(e instanceof Error ? e.message : 'Something went wrong.');
      } finally { setLoading(false); }
      return;
    }

    // PHONE PATH — normalize to +61 always
    const normalizedPhone = normalizePhoneAU(raw);
    if (phoneTaken) { setError('This phone number is already in use.'); return; }
    await startPhoneVerify(normalizedPhone);
  }

  async function handleConfirmPhone(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    resetAlerts();
    if (!canVerifyPhone || !sentToPhone) return;

    setLoading(true);
    try {
      await verifyPhoneAndCreate(sentToPhone);
    } catch (e: unknown) {
      if (e instanceof Error) {
        const msg = e.message.toLowerCase();
        if (msg.includes('expired') || msg.includes('invalid')) setError('Invalid or expired code. Enter the newest code.');
        else setError(e.message);
      } else setError('Could not finish signup.');
    } finally { setLoading(false); }
  }

  async function handleResend() {
    if (!sentToPhone || cooldown > 0 || otpSending) return;
    await startPhoneVerify(sentToPhone);
  }

  // UI
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
        <section className="mt-6 rounded-2xl bg-[rgb(24_32_45)] border border-white/10 p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-white/60 mb-1">Email or mobile</label>
              <input
                value={identifier}
                onChange={(e) => { setIdentifier(e.target.value); resetAlerts(); }}
                placeholder="you@example.com or 0499… / +61…"
                className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm placeholder:text-white/40 focus:outline-none focus:border-[var(--color-brand-600)]"
              />
              {identifier && isEmail(identifier) && emailTaken && (
                <p className="mt-1 text-xs text-[color:rgb(248_113_113)]">This email is already in use.</p>
              )}
              {identifier && !isEmail(identifier) && phoneTaken && (
                <p className="mt-1 text-xs text-[color:rgb(248_113_113)]">This phone number is already in use.</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-white/60 mb-1">Password</label>
                <input
                  type="password"
                  minLength={6}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); resetAlerts(); }}
                  placeholder="••••••••"
                  className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm placeholder:text-white/40 focus:outline-none focus:border-[var(--color-brand-600)]"
                />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1">Confirm password</label>
                <input
                  type="password"
                  minLength={6}
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); resetAlerts(); }}
                  placeholder="Re-enter password"
                  className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm placeholder:text-white/40 focus:outline-none focus:border-[var(--color-brand-600)]"
                />
                {confirm && password !== confirm && (
                  <p className="mt-1 text-xs text-[color:rgb(248_113_113)]">Passwords don’t match.</p>
                )}
              </div>
            </div>

            {error && (
              <div className="rounded-xl p-3 bg-[color:rgb(254_242_242)] text-[color:rgb(153_27_27)] text-sm">
                {error}
              </div>
            )}
            {notice && (
              <div className="rounded-2xl p-3 bg-[color:rgb(16_185_129_/_0.18)] border border-[color:rgb(16_185_129_/_0.35)] text-[color:rgb(16_185_129)] text-sm">
                {notice}
              </div>
            )}

            <button
              disabled={!canSubmitForm}
              type="submit"
              className="w-full rounded-full bg-[var(--color-brand-600)] py-3 font-semibold hover:brightness-110 disabled:opacity-60"
            >
              {loading ? 'Please wait…' : 'Sign up'}
            </button>
          </form>

          <div className="mt-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-white/50">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <p className="mt-4 text-xs text-white/50">
            Already have an account?{' '}
            <Link href="/signin" className="text-[var(--color-brand-600)] hover:underline">Sign in</Link>
          </p>
        </section>
      )}

      {step === 'phone_verify' && (
        <section className="mt-6 rounded-2xl bg-[rgb(24_32_45)] border border-white/10 p-5 space-y-4">
          <p className="text-sm">
            We sent a code to <span className="font-mono">{sentToPhone}</span>. Enter it below to finish signup.
          </p>
          <form onSubmit={handleConfirmPhone} className="space-y-3">
            <input
              inputMode="numeric"
              placeholder="Enter code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
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
                onClick={handleResend}
                className="rounded-full px-4 py-3 bg-white/10 border border-white/10 text-sm font-semibold hover:bg-white/15 disabled:opacity-60"
              >
                {otpSending ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend'}
              </button>
            </div>

            {error && (
              <div className="rounded-xl p-3 bg-[color:rgb(254_242_242)] text-[color:rgb(153_27_27)] text-sm">{error}</div>
            )}
            {notice && (
              <div className="rounded-2xl p-3 bg-[color:rgb(16_185_129_/_0.18)] border border-[color:rgb(16_185_129_/_0.35)] text-[color:rgb(16_185_129)] text-sm">{notice}</div>
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

      {step === 'done' && (
        <section className="mt-6 rounded-2xl bg-[rgb(24_32_45)] border border-white/10 p-5">
          <div className="rounded-md bg-green-50 p-3 text-green-700 text-sm">
            If you signed up with email, check your inbox to confirm. If you used your phone, you’re good to go!
          </div>
        </section>
      )}

      <div className="h-24" />
    </main>
  );
}
