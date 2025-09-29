// @ts-nocheck
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { sb } from '@/lib/supabaseBrowser';
import AdminLink from '@/components/AdminLink';

export default function NavBar() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSignedIn(!!data?.session));
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session);
    });
    return () => {
      // handle both shapes across SDK versions
      sub?.subscription?.unsubscribe?.();
      sub?.unsubscribe?.();
    };
  }, []);

  const handleSignOut = async () => {
    await sb.auth.signOut();
    window.location.href = '/';
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-white/10 bg-[#0B1210]/80 backdrop-blur">
      <div className="mx-auto max-w-5xl h-14 px-4 flex items-center">
        {/* Left: admin link (renders only if user is admin inside component) */}
        <div className="flex-1 min-w-0">
          <AdminLink />
        </div>

        {/* Center: brand */}
        <div className="flex-1 min-w-0 text-center">
          <Link
            href="/"
            className="inline-block select-none text-lg sm:text-xl font-extrabold tracking-tight"
          >
            todays <span className="text-[#14F195]">stash</span>
          </Link>
        </div>

        {/* Right: auth button */}
        <div className="flex-1 min-w-0 flex justify-end">
          {signedIn ? (
            <button
              onClick={handleSignOut}
              className="rounded-xl px-3 py-1.5 text-sm font-semibold bg-white/10 hover:bg-white/20 text-white transition"
            >
              Sign out
            </button>
          ) : (
            <Link
              href="/signin"
              className="rounded-xl px-3 py-1.5 text-sm font-semibold text-[#0B1210] bg-[#14F195] shadow-[0_8px_20px_rgba(20,241,149,.25)] hover:opacity-95 transition"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
