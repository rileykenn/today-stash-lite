'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';

export default function SignupPage() {
  const [target, setTarget] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'enter' | 'code' | 'done'>('enter');
  const [message, setMessage] = useState('');

  async function handleStart() {
    setMessage('');
    const res = await fetch('/api/auth/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target }),
    });
    const data = await res.json();
    if (res.ok) {
      setStep('code');
      setMessage('Code sent! Check your phone or email.');
    } else {
      setMessage(data.error || 'Failed to send code');
    }
  }

  async function handleVerify() {
    setMessage('');
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, code, password }),
    });
    const data = await res.json();
    if (res.ok) {
      setStep('done');
      setMessage('Signup complete! You can now sign in.');
    } else {
      setMessage(data.error || 'Verification failed');
    }
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-6 border rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-4">Sign Up</h1>

      {step === 'enter' && (
        <>
          <input
            className="w-full p-2 border rounded mb-2"
            placeholder="Email or phone"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
          <input
            type="password"
            className="w-full p-2 border rounded mb-2"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            className="w-full bg-blue-600 text-white py-2 rounded"
            onClick={handleStart}
          >
            Send Code
          </button>
        </>
      )}

      {step === 'code' && (
        <>
          <input
            className="w-full p-2 border rounded mb-2"
            placeholder="Enter verification code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button
            className="w-full bg-green-600 text-white py-2 rounded"
            onClick={handleVerify}
          >
            Verify & Create Account
          </button>
        </>
      )}

      {step === 'done' && (
        <p className="text-green-600 font-semibold">✅ Signup complete!</p>
      )}

      {message && <p className="mt-4 text-sm text-red-600">{message}</p>}
    </div>
  );
}
