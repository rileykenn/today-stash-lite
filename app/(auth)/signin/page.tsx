'use client';

import { useState } from 'react';

type Stage = 'enter' | 'code' | 'done';
type ApiOk = { ok: true; [k: string]: unknown };
type ApiErr = { error: string };
type ApiRes = ApiOk | ApiErr;

function isApiErr(x: unknown): x is ApiErr {
  return typeof x === 'object' && x !== null && 'error' in x;
}

export default function SignInPage() {
  const [target, setTarget] = useState<string>('');
  const [stage, setStage] = useState<Stage>('enter');
  const [code, setCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function sendCode() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      });
      const j: ApiRes = await res.json();
      if (!res.ok || isApiErr(j)) {
        throw new Error(isApiErr(j) ? j.error : 'Failed to send code');
      }
      setStage('code');
      setMsg('Code sent. Check your phone.');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to send code';
      setMsg(message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, code }),
      });
      const j: ApiRes = await res.json();
      if (!res.ok || isApiErr(j)) {
        throw new Error(isApiErr(j) ? j.error : 'Verify failed');
      }
      setStage('done');
      setMsg('Verified! (Next: mint session + redirect)');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Verify failed';
      setMsg(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="w-full max-w-sm p-6 rounded-2xl bg-zinc-900 shadow-lg">
        <h1 className="text-2xl font-bold mb-4">Sign in</h1>

        {stage === 'enter' && (
          <>
            <label className="block text-sm mb-2">Phone (E.164, e.g. +61…)</label>
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="+61..."
              className="w-full bg-zinc-800 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-lime-400"
            />
            <button
              onClick={sendCode}
              disabled={loading || !target}
              className="mt-4 w-full rounded-lg px-4 py-2 bg-lime-500 text-black font-semibold disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send code'}
            </button>
          </>
        )}

        {stage === 'code' && (
          <>
            <div className="text-sm text-zinc-300 mb-2">
              We sent a code to <span className="font-semibold">{target}</span>
            </div>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="6-digit code"
              className="w-full bg-zinc-800 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-lime-400 tracking-[0.3em] text-center"
              maxLength={6}
              inputMode="numeric"
            />
            <button
              onClick={verifyCode}
              disabled={loading || code.length !== 6}
              className="mt-4 w-full rounded-lg px-4 py-2 bg-lime-500 text-black font-semibold disabled:opacity-50"
            >
              {loading ? 'Verifying…' : 'Verify'}
            </button>

            <button
              onClick={() => {
                setStage('enter');
                setCode('');
              }}
              className="mt-3 w-full text-sm text-zinc-400 hover:text-zinc-200"
            >
              Wrong number? Edit
            </button>
          </>
        )}

        {stage === 'done' && (
          <div className="text-lime-400 font-semibold">
            Signed in (OTP verified). Next we’ll mint a session & redirect.
          </div>
        )}

        {msg && <div className="mt-4 text-sm text-zinc-300">{msg}</div>}
      </div>
    </div>
  );
}
