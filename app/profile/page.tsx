'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sb } from '@/lib/supabaseBrowser';

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [planLabel, setPlanLabel] = useState<'pro' | 'free' | 'unknown'>('unknown');
  const [savedCents, setSavedCents] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Reset modal state
  const [resetOpen, setResetOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  /** Same role logic you use on /consumer */
  async function getUserRole(): Promise<'pro' | 'free' | 'unknown'> {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return 'unknown';

    const { data: prof } = await sb
      .from('profiles')
      .select('plan, role')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (prof) {
      const plan = String(prof.plan ?? '').toLowerCase().trim();
      const role = String(prof.role ?? '').toLowerCase().trim();
      if (plan === 'pro' || role === 'pro') return 'pro';
      if (plan === 'free' || role === 'free') return 'free';
    }

    const metaRole = String(session.user.user_metadata?.role ?? session.user.app_metadata?.role ?? '').toLowerCase().trim();
    const metaPlan = String(session.user.user_metadata?.plan ?? session.user.app_metadata?.plan ?? '').toLowerCase().trim();
    if (metaPlan === 'pro' || metaRole === 'pro') return 'pro';
    if (metaPlan === 'free' || metaRole === 'free') return 'free';

    return 'unknown';
  }

  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data: { user } } = await sb.auth.getUser();
      setUser(user);

      // resolve plan
      const role = await getUserRole();
      setPlanLabel(role);

      if (user) {
        // read total from user_savings
        const { data: savingsRow, error } = await sb
          .from('user_savings')
          .select('total_savings_cents')
          .eq('user_id', user.id)
          .single();

        if (!error && savingsRow) {
          setSavedCents(Number(savingsRow.total_savings_cents) || 0);
        } else {
          setSavedCents(0);
        }
      }

      setLoading(false);
    })();
  }, []);

  // live validation
  useEffect(() => {
    setNewPasswordError(newPassword && newPassword.length < 6 ? 'Password must be at least 6 characters long.' : '');
  }, [newPassword]);

  useEffect(() => {
    setConfirmPasswordError(confirmPassword && confirmPassword !== newPassword ? "Passwords don't match." : '');
  }, [confirmPassword, newPassword]);

  const handleResetPassword = async () => {
    if (newPasswordError || confirmPasswordError) return;
    if (!currentPassword) {
      alert('Please enter your current password or use the "Forgot" link.');
      return;
    }
    try {
      const email = user?.email;
      if (!email) throw new Error('No email on account');
      const { error: signInError } = await sb.auth.signInWithPassword({ email, password: currentPassword });
      if (signInError) throw new Error('Current password is incorrect');

      const { error } = await sb.auth.updateUser({ password: newPassword });
      if (error) throw error;

      alert('Password updated successfully');
      setResetOpen(false);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSignOut = async () => {
    await sb.auth.signOut();
    window.location.reload();
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0A0F13] flex items-center justify-center text-white/70">
        Loading…
      </main>
    );
  }

  const savedDisplay = `$${(savedCents / 100).toFixed(2)}`;

  return (
    <main className="min-h-screen bg-[#0A0F13] text-white px-4 py-8">
      <div className="max-w-md mx-auto space-y-6">
        {/* Identity + Savings */}
        <div className="bg-[#13202B] rounded-2xl p-4 ring-1 ring-white/10 shadow-md">
          <p className="text-sm text-white/60">Signed in as</p>
          <p className="font-semibold text-lg truncate">
            {user ? (user.email ?? user.phone ?? 'Sign In') : 'Sign In'}
          </p>

          <p className="mt-2 text-sm text-white/60">
            Total Saved:{' '}
            <span className="font-bold text-emerald-400">{savedDisplay}</span>
          </p>
        </div>

        {/* Account status */}
        {user && (
          <div className="bg-[#13202B] rounded-2xl p-4 ring-1 ring-white/10 shadow-md text-center">
            {planLabel === 'pro' ? (
              <p className="font-semibold text-emerald-400">Account Status: Pro</p>
            ) : (
              <>
                <p className="font-semibold text-amber-300 mb-3">Account Status: Free</p>
                <button
                  onClick={() => router.push('/upgrade')}
                  className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-semibold shadow-md"
                >
                  Upgrade Now
                </button>
              </>
            )}
          </div>
        )}

        {/* Reset Password */}
        {user && (
          <div className="bg-[#13202B] rounded-2xl p-4 ring-1 ring-white/10 shadow-md">
            <button
              onClick={() => setResetOpen(true)}
              className="w-full h-12 rounded-xl bg-white/10 hover:bg-white/15 font-semibold"
            >
              Reset Password
            </button>
          </div>
        )}

        {/* Sign Out */}
        {user && (
          <div className="bg-[#13202B] rounded-2xl p-4 ring-1 ring-white/10 shadow-md">
            <button
              onClick={handleSignOut}
              className="w-full h-12 rounded-xl bg-red-500 hover:bg-red-400 font-semibold"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* Reset Modal */}
      {resetOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-[#0D1620] p-6 text-white ring-1 ring-white/10 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Reset Password</h3>

            <label className="block text-sm mb-1">Current Password</label>
            <input
              type="password"
              className="w-full rounded-lg bg-white/10 p-2 mb-2"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <a href="/app/profile/reset" className="text-emerald-400 text-sm mb-4 inline-block">
              Forgot your current password? Click here to reset
            </a>

            <label className="block text-sm mb-1">New Password</label>
            <input
              type="password"
              className="w-full rounded-lg bg-white/10 p-2"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            {newPasswordError && <p className="text-red-400 text-xs mt-1">{newPasswordError}</p>}

            <label className="block text-sm mt-4 mb-1">Confirm New Password</label>
            <input
              type="password"
              className="w-full rounded-lg bg-white/10 p-2"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {confirmPasswordError && <p className="text-red-400 text-xs mt-1">{confirmPasswordError}</p>}

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleResetPassword}
                disabled={!!newPasswordError || !!confirmPasswordError}
                className="flex-1 h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-semibold disabled:opacity-40"
              >
                Save
              </button>
              <button
                onClick={() => setResetOpen(false)}
                className="flex-1 h-12 rounded-xl bg-white/10 hover:bg-white/15"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
