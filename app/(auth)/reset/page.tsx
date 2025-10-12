'use client';

import { useState } from 'react';
import { sb } from '@/lib/supabaseBrowser';
import { useRouter } from 'next/navigation';

export default function ResetPage() {
  const router = useRouter();

  const [step, setStep] = useState<'identify' | 'verify' | 'reset' | 'success'>('identify');
  const [identifier, setIdentifier] = useState(''); // email or phone
  const [code, setCode] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  // Step 1: Request reset (email or phone)
  async function handleIdentify() {
    setError(null);
    setLoading(true);

    try {
      if (identifier.includes('@')) {
        // Email reset
        const { error } = await sb.auth.resetPasswordForEmail(identifier, {
          redirectTo: `${window.location.origin}/app/(auth)/reset`,
        });
        if (error) throw error;
      } else {
        // Phone reset (Twilio, using your backend RPC)
        const { error } = await sb.rpc('send_phone_reset_code', { p_phone: identifier });
        if (error) throw error;
      }
      setStep('verify');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Verify code
  async function handleVerify() {
    setError(null);
    setLoading(true);

    try {
      if (identifier.includes('@')) {
        const { data, error } = await sb.auth.verifyOtp({
          type: 'recovery',
          email: identifier,
          token: code,
        });
        if (error) throw error;
      } else {
        const { data, error } = await sb.rpc('verify_phone_reset_code', {
          p_phone: identifier,
          p_code: code,
        });
        if (error) throw error;
      }
      setStep('reset');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Step 3: Change password
  async function handleResetPassword() {
    setError(null);
    if (newPass !== confirmPass) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);

    try {
      const { error } = await sb.auth.updateUser({ password: newPass });
      if (error) throw error;
      setSuccessMsg('You have successfully changed your password. You will be redirected shortly.');
      setStep('success');

      setTimeout(() => {
        router.replace('/consumer');
      }, 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0A0F13] flex items-center justify-center px-6">
      <div className="w-full max-w-sm bg-[#13202B] rounded-2xl p-6 shadow-lg ring-1 ring-white/10">
        {step === 'identify' && (
          <>
            <h1 className="text-xl font-bold text-white mb-4">Reset Password</h1>
            <input
              type="text"
              placeholder="Email or phone number"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full rounded-lg bg-white/10 text-white px-3 py-2 mb-3"
            />
            {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
            <button
              onClick={handleIdentify}
              disabled={loading || !identifier}
              className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-semibold text-white"
            >
              {loading ? 'Sending…' : 'Send Code'}
            </button>
          </>
        )}

        {step === 'verify' && (
          <>
            <h1 className="text-xl font-bold text-white mb-4">Enter Verification Code</h1>
            <input
              type="text"
              placeholder="Enter code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-lg bg-white/10 text-white px-3 py-2 mb-3"
            />
            {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
            <button
              onClick={handleVerify}
              disabled={loading || !code}
              className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-semibold text-white"
            >
              {loading ? 'Verifying…' : 'Verify'}
            </button>
          </>
        )}

        {step === 'reset' && (
          <>
            <h1 className="text-xl font-bold text-white mb-4">Choose New Password</h1>
            <input
              type="password"
              placeholder="New password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              className="w-full rounded-lg bg-white/10 text-white px-3 py-2 mb-2"
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              className="w-full rounded-lg bg-white/10 text-white px-3 py-2 mb-2"
            />
            {newPass && confirmPass && newPass !== confirmPass && (
              <p className="text-red-400 text-sm mb-2">Passwords do not match</p>
            )}
            {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
            <button
              onClick={handleResetPassword}
              disabled={loading || !newPass || !confirmPass}
              className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-semibold text-white"
            >
              {loading ? 'Updating…' : 'Update Password'}
            </button>
          </>
        )}

        {step === 'success' && (
          <div className="text-center">
            <h1 className="text-lg font-semibold text-emerald-400">{successMsg}</h1>
          </div>
        )}
      </div>
    </main>
  );
}
