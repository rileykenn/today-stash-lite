'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';

function normalizePhoneAU(input: string) {
  const raw = input.replace(/\s+/g, '');
  if (/^\+6104\d{8}$/.test(raw)) return '+61' + raw.slice(4);
  if (/^\+614\d{8}$/.test(raw)) return raw;
  if (/^04\d{8}$/.test(raw)) return '+61' + raw.slice(1);
  if (/^0\d{9}$/.test(raw)) return '+61' + raw.slice(1);
  return raw;
}

type OtpState = 'idle' | 'sending_code' | 'code_sent';
type RpcResult = { email_taken: boolean | null; phone_taken: boolean | null };

export default function SignupPage() {
  const sb = getSupabaseClient();

  // bounce if already logged in
  useEffect(() => {
    (async () => {
      const { data } = await sb.auth.getSession();
      if (data.session && typeof window !== 'undefined') {
        window.location.replace('/deals');
      }
    })();
  }, [sb]);

  // state
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [sentToPhone, setSentToPhone] = useState<string | null>(null); // exact phone used for OTP
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const [otpState, setOtpState] = useState<OtpState>('idle');
  const [cooldown, setCooldown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // availability flags (RPC)
  const [emailTaken, setEmailTaken] = useState(false);
  const [phoneTaken, setPhoneTaken] = useState(false);

  function resetAlerts() {
    setError(null);
    setNotice(null);
  }

  // cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const strongPassword = useMemo(
    () => password.length >= 6 && password === confirm,
    [password, confirm]
  );

  const canRequestCode = useMemo(
    () => phone.trim().length >= 8 && otpState !== 'sending_code' && cooldown === 0,
    [phone, otpState, cooldown]
  );

  const canSubmit = useMemo(() => {
    const idsOk = !emailTaken && !phoneTaken;
    const hasCode = code.trim().length >= 4;
    return Boolean(
      email.trim() && phone.trim() && strongPassword && idsOk && hasCode && !loading
    );
  }, [email, phone, strongPassword, emailTaken, phoneTaken, code, loading]);

  // availability RPC (debounced) — uses the SQL function we created
  useEffect(() => {
    const handle = setTimeout(async () => {
      const e = email.trim();
      const p = normalizePhoneAU(phone.trim());
      if (!e && !p) {
        setEmailTaken(false);
        setPhoneTaken(false);
        return;
      }
      try {
        const { data, error } = await sb.rpc('check_identifier_available', {
          p_email: e || null,
          p_phone: p || null,
        });
        if (!error && data) {
          const res = data as unknown as RpcResult;
          setEmailTaken(Boolean(res.email_taken));
          setPhoneTaken(Boolean(res.phone_taken));
        }
      } catch {
        // ignore network glitches; keep previous flags
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [email, phone, sb]);

  // SEND CODE (Twilio Verify via our API) — no Supabase user yet
  async function handleSendCode() {
    resetAlerts();
    if (!canRequestCode) return;

    const normalized = normalizePhoneAU(phone.trim());
    setPhone(normalized);
    setCode('');

    if (phoneTaken) {
      setError('This phone number is already associated with an account.');
      return;
    }
    if (emailTaken) {
      setError('This email is already associated with an account.');
      return;
    }

    try {
      setOtpState('sending_code');
      const r = await fetch('/api/auth/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: normalized }),
      });
      const j: unknown = await r.json();
      if (!r.ok || (j as { error?: string } | null)?.error) {
        const msg = (j as { error?: string } | null)?.error || 'Failed to send code';
        throw new Error(msg);
      }

      setOtpState('code_sent');
      setCooldown(10);
      setSentToPhone(normalized);
      setNotice('We sent a code. Enter it below, then press Sign up.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to send code.';
      setError(msg);
      setOtpState('idle');
    }
  }

  // SUBMIT: verify code (server) → server creates confirmed user → sign in with phone+password
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    resetAlerts();

    if (!canSubmit) return;
    if (!sentToPhone) {
      setError('Tap “Get code” first.');
      return;
    }
    if (emailTaken) {
      setError('This email is already associated with an account.');
      return;
    }
    if (phoneTaken) {
      setError('This phone number is already associated with an account.');
      return;
    }

    const token = code.trim();
    const normalizedPhone = sentToPhone;
    const trimmedEmail = email.trim(); // optional; currently stored only if you add it to user_metadata server-side

    setLoading(true);
    try {
      // 1) Verify code with our API (Twilio Verify) which also creates the user
      const r = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: normalizedPhone,
          code: token,
          password,
          // If you later want to persist email on phone accounts, add it to user_metadata in the route
          // email: trimmedEmail,
        }),
      });
      const j: unknown = await r.json();
      if (!r.ok || (j as { error?: string } | null)?.error) {
        const msg = (j as { error?: string } | null)?.error || 'Invalid or expired code.';
        throw new Error(msg);
      }

      // 2) Sign in on the client with PHONE + password
      const { error: signInErr } = await sb.auth.signInWithPassword({
        phone: normalizedPhone,
        password,
      });
      if (signInErr) throw signInErr;

      // 3) Hard redirect to reset RSC header
      window.location.replace('/deals');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong. Please try again.';
      const lower = msg.toLowerCase();
      if (lower.includes('expired') || lower.includes('invalid')) {
        setError('Invalid or expired code. Use the newest code or tap “Resend”.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-screen-sm px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">Create your account</h1>
      <p className="mt-2 text-gray-600 text-sm">
        You can browse deals without an account. You’ll sign in when you redeem.
      </p>

      <section className="mt-6 rounded-2xl border border-gray-200 p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-md border px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring"
            />
            {email && emailTaken && (
              <p className="mt-1 text-xs text-red-500">
                This email is already associated with an account.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Mobile phone</label>
            <div className="flex gap-2">
              <input
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+61…"
                readOnly={otpState === 'code_sent'}
                className="flex-1 rounded-md border px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring"
              />
              <button
                type="button"
                onClick={handleSendCode}
                disabled={!canRequestCode}
                className="rounded-md px-4 py-2 border text-sm font-semibold disabled:opacity-60"
              >
                {otpState === 'sending_code'
                  ? 'Sending…'
                  : cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : otpState === 'code_sent'
                  ? 'Resend code'
                  : 'Get code'}
              </button>
            </div>
            {phone && phoneTaken && (
              <p className="mt-1 text-xs text-red-500">
                This phone number is already associated with an account.
              </p>
            )}

            <div className="mt-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter code"
                inputMode="numeric"
                className="w-full rounded-md border px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Create a password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-md border px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Confirm password</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter password"
                className="w-full rounded-md border px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring"
              />
              {confirm && password !== confirm && (
                <p className="mt-1 text-xs text-red-500">Passwords don’t match.</p>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-md p-3 bg-red-50 text-red-700 text-sm">{error}</div>
          )}
          {notice && (
            <div className="rounded-md p-3 bg-emerald-50 text-emerald-700 text-sm">
              {notice}
            </div>
          )}

          <button
            disabled={!canSubmit}
            type="submit"
            className="w-full rounded-full bg-blue-600 text-white py-3 font-semibold hover:brightness-110 disabled:opacity-60"
          >
            {loading ? 'Please wait…' : 'Sign up'}
          </button>
        </form>

        <p className="mt-4 text-xs text-gray-600">
          Already have an account?{' '}
          <Link href="/signin" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </section>

      <div className="h-24" />
    </main>
  );
}
