'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { sb } from '@/lib/supabaseBrowser';

type Step = 'form' | 'phone_verify' | 'done';

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

// AU E.164 (+61…) normalizer; leaves non-AU as-is
function normalizePhoneAU(input: string) {
  const raw = input.replace(/\s+/g, '');
  if (/^\+6104\d{8}$/.test(raw)) return '+61' + raw.slice(4);
  if (/^\+614\d{8}$/.test(raw)) return raw;
  if (/^04\d{8}$/.test(raw)) return '+61' + raw.slice(1);
  if (/^0\d{9}$/.test(raw)) return '+61' + raw.slice(1);
  return raw;
}

export default function SignupPage() {
  // ——— session banner (no auto-redirect) ———
  const [sessionChecked, setSessionChecked] = useState(false);
  const [alreadySignedIn, setAlreadySignedIn] = useState(false);
  useEffect(() => {
    (async () => {
      const { data: { session } } = await sb.auth.getSession();
      setAlreadySignedIn(Boolean(session));
      setSessionChecked(true);
    })();
  }, []);

  // ——— flow state ———
  const [step, setStep] = useState<Step>('form');

  // form fields
  const [identifier, setIdentifier] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirm, setConfirm] = useState<string>('');

  // availability (from RPC)
  const [emailTaken, setEmailTaken] = useState<boolean>(false);
  const [phoneTaken, setPhoneTaken] = useState<boolean>(false);

  // phone verify state
  const [sentToPhone, setSentToPhone] = useState<string | null>(null);
  const [code, setCode] = useState<string>('');
  const [cooldown, setCooldown] = useState<number>(0);
  const [otpSending, setOtpSending] = useState<boolean>(false);

  // UX
  const [loading, setLoading] = useState<boolean>(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function resetAlerts() { setError(null); setNotice(null); }

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

  // ——— debounced availability check via server route ———
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
      const j = await res.json();
      if (!res.ok || j.error) return;
      setEmailTaken(Boolean(j.email_taken));
      setPhoneTaken(Boolean(j.phone_taken));
    } catch {
      // ignore transient errors
    }
  }, 350);
  return () => clearTimeout(t);
}, [identifier]);



  // block signup when already used
  const alreadyUsed = (isEmail(identifier) && emailTaken) || (!isEmail(identifier) && phoneTaken);

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

  // ——— Twilio start ———
  async function startPhoneVerify(targetPhone: string) {
    setOtpSending(true);
    try {
      const r = await fetch('/api/verify/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: targetPhone }),
      });
      const j: unknown = await r.json();
      const ok = r.ok && (j as { error?: string | null })?.error == null;
      if (!ok) throw new Error((j as { error?: string })?.error || 'Failed to send code');

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

  // ——— verify & create ———
  async function verifyPhoneAndCreate(targetPhone: string) {
    // 1) verify code
    const r = await fetch('/api/verify/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: targetPhone, code: code.trim() }),
    });
    const j: unknown = await r.json();
    const approved = Boolean((j as { approved?: unknown })?.approved);
    if (!approved) throw new Error((j as { error?: string })?.error || 'Invalid or expired code.');

    // 2) create user (server/admin)
    const createRes = await fetch('/api/auth/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: targetPhone, password }),
    });
    const createJson: unknown = await createRes.json();
    const createOk = createRes.ok && (createJson as { ok?: boolean })?.ok === true;
    if (!createOk) {
      if (createRes.status === 409) throw new Error((createJson as { error?: string })?.error || 'Phone already in use.');
      throw new Error((createJson as { error?: string })?.error || 'Could not create account.');
    }

    // 3) sign in
    const { error: signInErr } = await sb.auth.signInWithPassword({ phone: targetPhone, password });
    if (signInErr) throw new Error(signInErr.message);

    setStep('done');
    if (typeof window !== 'undefined') window.location.replace('/consumer');
  }

  // ——— handlers ———
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
      } finally {
        setLoading(false);
      }
      return;
    }

    // PHONE PATH
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
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!sentToPhone || cooldown > 0 || otpSending) return;
    await startPhoneVerify(sentToPhone);
  }

  // ——— UI ———
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
                placeholder="you@example.com or +614…"
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
