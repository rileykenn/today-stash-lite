'use client';

import { useState } from 'react';

type Stage = 'form' | 'code' | 'done';
type ApiOk = { ok: true; [k: string]: unknown };
type ApiErr = { error: string };

function isApiErr(x: unknown): x is ApiErr {
  return typeof x === 'object' && x !== null && 'error' in x;
}

export default function SignupPage() {
  const [target, setTarget] = useState<string>('');      // email or phone
  const [password, setPassword] = useState<string>('');  // not used yet (session step)
  const [confirm, setConfirm] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [stage, setStage] = useState<Stage>('form');
  const [loading, setLoading] = useState<boolean>(false);
  const [msg, setMsg] = useState<string | null>(null);

  const passwordsMatch = password.length >= 8 && password === confirm;
  const canSubmit = target.trim().length > 0 && passwordsMatch;

  async function startVerify() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/auth/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: target.trim() }),
      });
      const j: ApiOk | ApiErr = await res.json();
      if (!res.ok || isApiErr(j)) {
        throw new Error(isApiErr(j) ? j.error : 'Failed to send code');
      }
      setStage('code');
      setMsg('We sent you a code. Enter it below.');
    } catch (e) {
      const m = e instanceof Error ? e.message : 'Error sending code';
      setMsg(m);
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: target.trim(), code: code.trim() }),
      });
      const j: ApiOk | ApiErr = await res.json();
      if (!res.ok || isApiErr(j)) {
        throw new Error(isApiErr(j) ? j.error : 'Verify failed');
      }
      // ✅ Code approved by Twilio. Next step (separate): create Supabase user + session.
      setStage('done');
      setMsg('Verified! Next we’ll create your account & sign you in.');
    } catch (e) {
      const m = e instanceof Error ? e.message : 'Verify failed';
      setMsg(m);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="w-full max-w-sm p-6 rounded-2xl bg-zinc-900 shadow-lg">
        <h1 className="text-2xl font-bold mb-4">Create your account</h1>

        {stage === 'form' && (
          <>
            <label className="block text-sm mb-2">Email or Phone</label>
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="you@example.com or +61..."
              className="w-full bg-zinc-800 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-lime-400"
            />

            <label className="block text-sm mt-4 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full bg-zinc-800 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-lime-400"
            />

            <label className="block text-sm mt-4 mb-2">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter password"
              className="w-full bg-zinc-800 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-lime-400"
            />

            <button
              onClick={startVerify}
              disabled={loading || !canSubmit}
              className="mt-6 w-full rounded-lg px-4 py-2 bg-lime-500 text-black font-semibold disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Sign up'}
            </button>
          </>
        )}

        {stage === 'code' && (
          <>
            <p className="text-sm text-zinc-300 mb-3">
              We sent a code to <span className="font-semibold">{target}</span>
            </p>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter 6-digit code"
              maxLength={6}
              inputMode="numeric"
              className="w-full bg-zinc-800 rounded-lg px-3 py-2 text-center tracking-[0.3em] outline-none focus:ring-2 focus:ring-lime-400"
            />
            <button
              onClick={verifyCode}
              disabled={loading || code.length !== 6}
              className="mt-4 w-full rounded-lg px-4 py-2 bg-lime-500 text-black font-semibold disabled:opacity-50"
            >
              {loading ? 'Verifying…' : 'Verify code'}
            </button>

            <button
              onClick={() => setStage('form')}
              className="mt-3 w-full text-sm text-zinc-400 hover:text-zinc-200"
            >
              Change email/phone
            </button>
          </>
        )}

        {stage === 'done' && (
          <div className="text-lime-400 font-semibold">
            Verified! 🎉 Next: we’ll create your Supabase account and sign you in.
          </div>
        )}

        {msg && <div className="mt-4 text-sm text-zinc-300">{msg}</div>}
      </div>
    </div>
  );
}
