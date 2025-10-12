/* eslint-disable @next/next/no-img-element */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import { sb } from '@/lib/supabaseBrowser';

function Tab({ href, label, active, highlight = false }:{
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

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: auth, error: authErr } = await sb.auth.getUser();
        if (authErr) console.warn('getUser error', authErr);
        const uid = auth?.user?.id;
        if (!uid) {
          console.warn('No logged-in user');
          mounted && setIsMerchant(false);
          return;
        }

        const { data, error } = await sb
          .from('merchant_staff')
          .select('merchant_id')   // existence-only
          .eq('user_id', uid)
          .limit(1);

        if (error) {
          console.warn('merchant_staff select error', error);
          mounted && setIsMerchant(false);
          return;
        }

        mounted && setIsMerchant(!!data?.length);
      } catch (e) {
        console.warn('BottomNav check failed', e);
        mounted && setIsMerchant(false);
      }
    })();
    return () => { mounted = false; };
  }, [pathname]);

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
