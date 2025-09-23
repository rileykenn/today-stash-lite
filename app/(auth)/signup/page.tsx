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
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  // Availability flags
  const [emailTaken, setEmailTaken] = useState(false);
  const [phoneTaken, setPhoneTaken] = useState(false);

  // Phone verify state (only used if identifier is phone)
  const [sentToPhone, setSentToPhone] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [otpSending, setOtpSending] = useState(false);

  // UX / control
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function resetAlerts() {
    setError(null);
    setNotice(null);
  }

  // Cooldown ticker (for resend code on phone path)
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const strongPassword = useMemo(
    () => password.length >= 6 && password === confirm,
    [password, confirm]
  );

  // Debounced availability check (via your RPC)
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

        // Expecting RPC to return { email_taken: boolean, phone_taken: boolean }
        setEmailTaken(Boolean(data?.email_taken));
        setPhoneTaken(Boolean(data?.phone_taken));
      } catch {
        // swallow; don't block user on transient RPC error
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
    step === 'phone_verify' &&
    code.trim().length >= 4 &&
    !loading;

  // ---- PHONE OTP helpers ----
  async function startPhoneVerify(targetPhone: string) {
    setOtpSending(true);
    try {
      const r = await fetch('/api/verify/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: targetPhone }),
      });
      const j = await r.json();
      if (!r.ok || j.error) throw new Error(j.error || 'Failed to send code');
      setSentToPhone(targetPhone);
      setCooldown(10);
      setStep('phone_verify');
      setNotice('We sent a code via SMS. Enter it below to finish signup.');
    } catch (e: any) {
      setError(e?.message ?? 'Failed to send code.');
    } finally {
      setOtpSending(false);
    }
  }

  async function verifyPhoneAndCreate(targetPhone: string, emailForAccount?: string) {
    // 1) Verify the code
    const r = await fetch('/api/verify/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: targetPhone, code: code.trim() }),
    });
    const j = await r.json();
    if (!j.approved) {
      throw new Error(j.error || 'Invalid or expired code.');
    }

    // 2) Create Supabase account server-side (phone_confirm true)
    const createRes = await fetch('/api/auth/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: targetPhone,
        email: emailForAccount || undefined, // optional; you can omit if phone-only
        password,
      }),
    });
    const createJson = await createRes.json();
    if (!createRes.ok || !createJson.ok) {
      if (createRes.status === 409) {
        throw new Error(createJson.error || 'Phone or email already in use.');
      }
      throw new Error(createJson.error || 'Could not create account.');
    }

    // 3) Sign in with phone + password
    const { error: signInErr } = await sb.auth.signInWithPassword({
      phone: targetPhone,
      password,
    });
    if (signInErr) throw signInErr;

    setStep('done');
    window.location.replace('/consumer');
  }

  // ---- HANDLERS ----
  async function handleSubmit(e: React.FormEvent) {
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
        if (signUpError) throw signUpError;
        // Supabase sends confirmation email automatically (if enabled)
        setNotice('Check your email to confirm your account.');
        setStep('done');
      } catch (e: any) {
        // If backend returns "User already registered", we reflect that
        const msg = e?.message ?? 'Something went wrong.';
        if (/already/i.test(msg)) {
          setError('This email is already in use.');
        } else {
          setError(msg);
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

    // Start Twilio verify (then step → phone_verify)
    await startPhoneVerify(normalizedPhone);
  }

  async function handleConfirmPhone(e: React.FormEvent) {
    e.preventDefault();
    resetAlerts();
    if (!canVerifyPhone || !sentToPhone) return;

    setLoading(true);
    try {
      await verifyPhoneAndCreate(sentToPhone);
    } catch (e: any) {
      const msg = e?.message?.toLowerCase?.() ?? '';
      if (msg.includes('expired') || msg.includes('invalid')) {
        setError('Invalid or expired code. Enter the newest code.');
      } else {
        setError(e?.message ?? 'Could not finish signup.');
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
