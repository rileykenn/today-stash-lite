/* eslint-disable @next/next/no-img-element */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import { sb } from '@/lib/supabaseBrowser';

function Tab({
  href, label, active, highlight = false,
}: {
  href: string; label: string; active?: boolean; highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        'flex-1 min-w-0 px-3 py-2 rounded-full text-center text-sm font-medium',
        active ? 'bg-white/15 text-white' : 'bg-white/7 text-white/90 hover:bg-white/12',
        highlight ? 'bg-emerald-500 hover:bg-emerald-400 text-white font-semibold' : '',
      ].join(' ')}
    >
      {label}
    </Link>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const [isMerchant, setIsMerchant] = React.useState(false);

  // single function to compute merchant status using RPC
  const checkMerchant = React.useCallback(async () => {
    try {
      const { data: sess } = await sb.auth.getSession();
      const uid = sess?.session?.user?.id;
      if (!uid) {
        setIsMerchant(false);
        return;
      }
      const { data, error } = await sb.rpc('get_my_merchant');
      if (error) {
        console.warn('get_my_merchant rpc error', error);
        setIsMerchant(false);
        return;
      }
      setIsMerchant(!!data); // uuid string => truthy when linked
    } catch (e) {
      console.warn('BottomNav merchant check failed', e);
      setIsMerchant(false);
    }
  }, []);

  React.useEffect(() => {
    let mounted = true;

    // initial check (after session is available)
    checkMerchant();

    // re-check on auth state changes (login/logout/switch accounts)
    const { data: sub } = sb.auth.onAuthStateChange(() => {
      if (mounted) checkMerchant();
    });

    // also re-check when path changes (cheap extra safety)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { mounted = false; sub?.subscription?.unsubscribe?.(); };
  }, [checkMerchant, pathname]);

  return (
    <nav
      className="fixed z-[90] left-1/2 -translate-x-1/2 bottom-[max(12px,env(safe-area-inset-bottom))]
                 w-[min(480px,calc(100%-20px))] rounded-full bg-[#0D1620]/90 backdrop-blur-md
                 ring-1 ring-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.35)] px-2 py-1.5"
      aria-label="Bottom navigation"
    >
      <div className="flex items-center gap-2">
        <Tab href="/consumer" label="Deals" active={pathname === '/consumer'} />
        <Tab href="/profile"  label="Profile" active={pathname === '/profile'} />
        {isMerchant && (
          <Tab href="/merchant/scan" label="Scan" active={pathname === '/merchant/scan'} highlight />
        )}
      </div>
    </nav>
  );
}
