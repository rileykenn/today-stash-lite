'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { sb } from '@/lib/supabaseBrowser';

type Step = 'form' | 'phone_verify' | 'done';

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

// AU E.164 normalizer (+61)
function normalizePhoneAU(input: string) {
  const raw = input.replace(/\s+/g, '');
  if (/^\+6104\d{8}$/.test(raw)) return '+61' + raw.slice(4);
  if (/^\+614\d{8}$/.test(raw)) return raw;
  if (/^04\d{8}$/.test(raw)) return '+61' + raw.slice(1);
  if (/^0\d{9}$/.test(raw)) return '+61' + raw.slice(1);
  return raw; // leave as-is for non-AU / already normalized
}

export default function UnifiedSignupPage() {
  // If already logged in, redirect out
  useEffect(() => {
    (async () => {
      const { data } = await sb.auth.getSession();
      if (data.session && typeof window !== 'undefined') {
        window.location.replace('/consumer');
      }
    })();
  }, []);

  const [step, setStep] = useState<Step>('form');

  // Form fields
  const [identifier, setIdentifier] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirm, setConfirm] = useState<string>('');

  // Availability flags (from RPC)
  const [emailTaken, setEmailTaken] = useState<boolean>(false);
  const [phoneTaken, setPhoneTaken] = useState<boolean>(false);

  // Phone verify state
  const [sentToPhone, setSentToPhone] = useState<string | null>(null);
  const [code, setCode] = useState<string>('');
  const [cooldown, setCooldown] = useState<number>(0);
  const [otpSending, setOtpSending] = useState<boolean>(false);

  // UX
  const [loading, setLoading] = useState<boolean>(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function resetAlerts() {
    setError(null);
    setNotice(null);
  }

  // Cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const strongPassword = useMemo(
    () => password.length >= 6 && password === confirm,
    [password, confirm]
  );

  // Debounced availability check via your RPC
  useEffect(() => {
    const handle = setTimeout(async () => {
      const raw = identifier.trim();
      if (!raw) {
        setEmailTaken(false);
        setPhoneTaken(false);
        return;
      }

      const email = isEmail(raw) ? raw : null;
      const phone = !email ? normalizePhoneAU(raw) : null;

      try {
        const { data, error } = await sb.rpc('check_identifier_available', {
          p_email: email,
          p_phone: phone,
        });

        if (error) return;

        // Expect { email_taken: boolean, phone_taken: boolean }
        const emailFlag =
          typeof (data as { email_taken?: unknown })?.email_taken === 'boolean'
            ? (data as { email_taken: boolean }).email_taken
            : false;

        const phoneFlag =
          typeof (data as { phone_taken?: unknown })?.phone_taken === 'boolean'
            ? (data as { phone_taken: boolean }).phone_taken
            : false;

        setEmailTaken(Boolean(emailFlag));
        setPhoneTaken(Boolean(phoneFlag));
      } catch {
        // ignore transient errors; don't block typing
      }
    }, 350);

    return () => clearTimeout(handle);
  }, [identifier]);

  // Button disabled logic (BLOCK when already used)
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
    step === 'phone_verify' && code.trim().length >= 4 && !loading;

  // ---- PHONE OTP helpers ----
  async function startPhoneVerify(targetPhone: string) {
    setOtpSending(true);
    try {
      const r = await fetch('/api/verify/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: targetPhone }),
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const j: unknown = await r.json();

      const ok = r.ok && (j as { error?: string | null })?.error == null;
      if (!ok) {
        const msg =
          (j as { error?: string })?.error || 'Failed to send code';
        throw new Error(msg);
      }

      setSentToPhone(targetPhone);
      setCooldown(10);
      setStep('phone_verify');
      setNotice('We sent a code via SMS. Enter it below to finish signup.');
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message);
      else setError('Failed to send code.');
    } finally {
      setOtpSending(false);
    }
  }

  async function verifyPhoneAndCreate(targetPhone: string, emailForAccount?: string) {
    // 1) Verify code with your API
    const r = await fetch('/api/verify/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: targetPhone, code: code.trim() }),
    });
    const j: unknown = await r.json();

    const approved = Boolean((j as { approved?: unknown })?.approved);
    if (!approved) {
      const msg =
        (j as { error?: string })?.error || 'Invalid or expired code.';
      throw new Error(msg);
    }

    // 2) Create Supabase user server-side
    const createRes = await fetch('/api/auth/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: targetPhone,
        email: emailForAccount || undefined,
        password,
      }),
    });
    const createJson: unknown = await createRes.json();

    const createOk =
      createRes.ok && (createJson as { ok?: boolean })?.ok === true;

    if (!createOk) {
      if (createRes.status === 409) {
        const msg =
          (createJson as { error?: string })?.error ||
          'Phone or email already in use.';
        throw new Error(msg);
      }
      const msg =
        (createJson as { error?: string })?.error ||
        'Could not create account.';
      throw new Error(msg);
    }

    // 3) Sign in with phone + password
    const { error: signInErr } = await sb.auth.signInWithPassword({
      phone: targetPhone,
      password,
    });
    if (signInErr) throw new Error(signInErr.message);

    setStep('done');
    if (typeof window !== 'undefined') {
      window.location.replace('/consumer');
    }
  }

  // ---- HANDLERS ----
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    resetAlerts();
    if (!canSubmitForm) return;

    const raw = identifier.trim();

    // EMAIL PATH
    if (isEmail(raw)) {
      if (emailTaken) {
        setError('This email is already in use.');
        return;
      }
      setLoading(true);
      try {
        const { error: signUpError } = await sb.auth.signUp({
          email: raw,
          password,
        });
        if (signUpError) throw new Error(signUpError.message);
        // Supabase sends confirmation email automatically (if enabled)
        setNotice('Check your email to confirm your account.');
        setStep('done');
      } catch (e: unknown) {
        if (e instanceof Error) {
          if (/already/i.test(e.message)) {
            setError('This email is already in use.');
          } else {
            setError(e.message);
          }
        } else {
          setError('Something went wrong.');
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    // PHONE PATH
    const normalizedPhone = normalizePhoneAU(raw);
    if (phoneTaken) {
      setError('This phone number is already in use.');
      return;
    }

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
        if (msg.includes('expired') || msg.includes('invalid')) {
          setError('Invalid or expired code. Enter the newest code.');
        } else {
          setError(e.message);
        }
      } else {
        setError('Could not finish signup.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!sentToPhone || cooldown > 0 || otpSending) return;
    await startPhoneVerify(sentToPhone);
  }

  // ---- UI ----
  return (
    <main className="mx-auto max-w-screen-sm px-4 py-8 text-white">
      <h1 className="text-3xl font-bold tracking-tight">Create your account</h1>
      <p className="mt-2 text-white/70 text-sm">
        Use your email or mobile number. We’ll confirm it after you sign up.
      </p>

      {step === 'form' && (
        <section className="mt-6 rounded-2xl bg-[rgb(24_32_45)] border border-white/10 p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-white/60 mb-1">Email or mobile</label>
              <input
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  resetAlerts();
                }}
                placeholder="you@example.com or +614…"
                className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm placeholder:text-white/40 focus:outline-none focus:border-[var(--color-brand-600)]"
              />
              {identifier && isEmail(identifier) && emailTaken && (
                <p className="mt-1 text-xs text-[color:rgb(248_113_113)]">
                  This email is already in use.
                </p>
              )}
              {identifier && !isEmail(identifier) && phoneTaken && (
                <p className="mt-1 text-xs text-[color:rgb(248_113_113)]">
                  This phone number is already in use.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-white/60 mb-1">Password</label>
                <input
                  type="password"
                  minLength={6}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    resetAlerts();
                  }}
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
                  onChange={(e) => {
                    setConfirm(e.target.value);
                    resetAlerts();
                  }}
                  placeholder="Re-enter password"
                  className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm placeholder:text-white/40 focus:outline-none focus:border-[var(--color-brand-600)]"
                />
                {confirm && password !== confirm && (
                  <p className="mt-1 text-xs text-[color:rgb(248_113_113)]">
                    Passwords don’t match.
                  </p>
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
            <Link href="/signin" className="text-[var(--color-brand-600)] hover:underline">
              Sign in
            </Link>
          </p>
        </section>
      )}

      {step === 'phone_verify' && (
        <section className="mt-6 rounded-2xl bg-[rgb(24_32_45)] border border-white/10 p-5 space-y-4">
          <p className="text-sm">
            We sent a code to{' '}
            <span className="font-mono">{sentToPhone}</span>. Enter it below to finish signup.
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
              <div className="rounded-xl p-3 bg-[color:rgb(254_242_242)] text-[color:rgb(153_27_27)] text-sm">
                {error}
              </div>
            )}
            {notice && (
              <div className="rounded-2xl p-3 bg-[color:rgb(16_185_129_/_0.18)] border border-[color:rgb(16_185_129_/_0.35)] text-[color:rgb(16_185_129)] text-sm">
                {notice}
              </div>
            )}
          </form>

          <button
            type="button"
            onClick={() => {
              setStep('form');
              setCode('');
              setNotice(null);
              setError(null);
            }}
            className="w-full rounded-full bg-white/10 border border-white/10 py-3 font-semibold hover:bg-white/15"
          >
            Use a different number
          </button>
        </section>
      )}

      {step === 'done' && (
        <section className="mt-6 rounded-2xl bg-[rgb(24_32_45)] border border-white/10 p-5">
          <div className="rounded-md bg-green-50 p-3 text-green-700 text-sm">
            If you signed up with email, check your inbox to confirm. If you used your phone,
            you’re good to go!
          </div>
        </section>
      )}

      <div className="h-24" />
    </main>
  );
}
