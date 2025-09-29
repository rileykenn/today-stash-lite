'use client';

import { useEffect, useState, useMemo } from 'react';
import { sb } from '@/lib/supabaseBrowser';
import QRCode from 'react-qr-code';

type Offer = {
  id: string;
  title: string;
  description: string | null;
  merchant_id: string;
  image_url: string | null; // can be a full URL or a storage path
};

type MeRow = {
  user_id: string;
  role: 'admin' | 'merchant' | 'consumer';
  paid: boolean | null;
};

type Me = {
  user_id: string;
  role: 'admin' | 'merchant' | 'consumer';
  paid: boolean;
};

type RowState = {
  loading: boolean;
  error: string | null;
  tokenId: string | null;
  expiresAt: string | null;
};

type TokenRow = {
  id: string;
  expires_at: string;
};

const TOKEN_TTL_SECONDS = 120;

/** Resolve a value in offers.image_url to a usable <img src>. */
function resolveOfferImageUrl(image_url: string | null): string | null {
  if (!image_url) return null;
  const val = image_url.trim();
  if (val.startsWith('http://') || val.startsWith('https://')) return val;

  // Treat as Storage object path in the 'offer-media' bucket
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  return `${base}/storage/v1/object/public/offer-media/${val.replace(/^\/+/, '')}`;
}

export default function ConsumerPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [rowState, setRowState] = useState<Record<string, RowState>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loadingOffers, setLoadingOffers] = useState<boolean>(true);

  // QR modal state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalOfferTitle, setModalOfferTitle] = useState<string>('');
  const [modalTokenId, setModalTokenId] = useState<string>('');
  const [modalExpiresAt, setModalExpiresAt] = useState<string>('');

  // Load offers + me
  useEffect(() => {
    // Offers
    (async () => {
      setLoadingOffers(true);
      const { data, error } = await sb
        .from('offers')
        .select('id,title,description,merchant_id,image_url')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) setGlobalError(error.message);
      setOffers((data ?? []) as Offer[]);
      setLoadingOffers(false);
    })();

    // Me (includes paid)
    (async () => {
      const { data: sessionRes } = await sb.auth.getSession();
      if (!sessionRes?.session) {
        setMe(null);
        return;
      }
      const { data, error } = await sb
        .from('me')
        .select('user_id,role,paid')
        .single();

      if (error || !data) {
        setMe({
          user_id: sessionRes.session.user.id,
          role: 'consumer',
          paid: false,
        });
        return;
      }
      const row = data as MeRow;
      setMe({
        user_id: row.user_id,
        role: row.role,
        paid: !!row.paid,
      });
    })();
  }, []);

  const createToken = async (offer: Offer) => {
    setRowState((s) => ({
      ...s,
      [offer.id]: { loading: true, error: null, tokenId: null, expiresAt: null },
    }));

    // require login
    const { data: sessionRes } = await sb.auth.getSession();
    const userId = sessionRes?.session?.user?.id ?? null;
    if (!userId) {
      setRowState((s) => ({
        ...s,
        [offer.id]: {
          loading: false,
          error: 'Please sign in to generate a QR.',
          tokenId: null,
          expiresAt: null,
        },
      }));
      return;
    }

    // check paid from view
    const { data, error: meErr } = await sb
      .from('me')
      .select('user_id,role,paid')
      .single();

    const paid = !meErr && !!(data as MeRow).paid;
    if (!paid) {
      setRowState((s) => ({
        ...s,
        [offer.id]: {
          loading: false,
          error: 'Pay the one-time $99 to unlock redemptions.',
          tokenId: null,
          expiresAt: null,
        },
      }));
      return;
    }

    // insert short-lived token
    const expiresAtISO = new Date(
      Date.now() + TOKEN_TTL_SECONDS * 1000
    ).toISOString();

    const { data: tokenRow, error } = await sb
      .from('tokens')
      .insert({
        user_id: userId,
        offer_id: offer.id,
        merchant_id: offer.merchant_id,
        expires_at: expiresAtISO,
      })
      .select('id,expires_at')
      .single();

    if (error || !tokenRow) {
      setRowState((s) => ({
        ...s,
        [offer.id]: {
          loading: false,
          error: error?.message ?? 'Failed to create token',
          tokenId: null,
          expiresAt: null,
        },
      }));
      return;
    }

    const token = tokenRow as TokenRow;

    setRowState((s) => ({
      ...s,
      [offer.id]: {
        loading: false,
        error: null,
        tokenId: token.id,
        expiresAt: token.expires_at,
      },
    }));

    // open modal with the new token
    setModalOfferTitle(offer.title);
    setModalTokenId(token.id);
    setModalExpiresAt(token.expires_at);
    setModalOpen(true);
  };

  return (
    <div className="min-h-dvh bg-[#0B1210] text-[#E8FFF3] p-4 space-y-4">
      <header className="sticky top-0 z-10 -mx-4 px-4 py-3 backdrop-blur-md bg-[#0B1210]/70 border-b border-white/10">
        <h1 className="text-xl font-black tracking-tight">Today&apos;s Stash</h1>
        <p className="text-xs text-[#9ADABF] mt-0.5">Pay $99 • Save up to $3,000</p>
      </header>

      {globalError && (
        <p className="text-[#FCA5A5] text-sm">Error: {globalError}</p>
      )}
      {loadingOffers && <p className="text-sm text-[#9ADABF]">Loading deals…</p>}
      {!loadingOffers && offers.length === 0 && (
        <p className="text-sm text-[#9ADABF]">No active deals yet.</p>
      )}

      <ul className="space-y-4">
        {offers.map((o) => {
          const state: RowState =
            rowState[o.id] ?? {
              loading: false,
              error: null,
              tokenId: null,
              expiresAt: null,
            };

          const src = resolveOfferImageUrl(o.image_url);

          return (
            <li
              key={o.id}
              className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-3"
            >
              <div className="flex gap-3 items-start">
                {src && (
                  <img
                    src={src}
                    alt={o.title}
                    decoding="async"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      // hide broken image
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                    className="w-24 h-24 object-cover rounded-xl bg-black/30"
                  />
                )}

                <div className="flex-1">
                  <div className="font-bold text-[#E8FFF3] leading-tight">
                    {o.title}
                  </div>
                  {o.description && (
                    <div className="text-sm text-[#9ADABF] mt-0.5">
                      {o.description}
                    </div>
                  )}

                  <div className="mt-3">
                    <GlowButton
                      onClick={() => createToken(o)}
                      disabled={state.loading}
                    >
                      {state.loading ? 'Creating…' : 'Show QR'}
                    </GlowButton>
                  </div>

                  {state.error && (
                    <div className="mt-2 text-[#FCA5A5] text-sm">
                      Error: {state.error}
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="text-xs text-[#9ADABF]">
        {me?.paid ? 'Your account: Paid' : 'Your account: Not paid'}
      </div>

      {/* QR MODAL (no extra files/libs) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0B1210] p-5 shadow-[0_0_30px_rgba(20,241,149,.25)]">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-[#9ADABF]">Present to staff</div>
                <div className="text-lg font-bold text-white">{modalOfferTitle}</div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="ml-3 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
                aria-label="Close"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid place-items-center">
              <div className="rounded-2xl p-3 bg-white">
                {/* Raw UUID — matches merchant scanner expectation */}
                <QRCode value={modalTokenId} />
              </div>
              <div className="mt-3 text-xs text-[#9ADABF] text-center">
                Expires at{' '}
                <span className="text-white font-semibold">
                  {new Date(modalExpiresAt).toLocaleTimeString()}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-[#9ADABF] text-center break-all">
                Code: <span className="text-white font-semibold">{modalTokenId}</span>
              </div>
            </div>

            <div className="mt-5">
              <GlowButton onClick={() => setModalOpen(false)}>Done</GlowButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Money-green glow button with a subtle shine sweep (no custom CSS required). */
function GlowButton(
  {
    children,
    disabled,
    onClick,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
  }
) {
  // avoid string concat for classNames to stay simple
  const base =
    'relative inline-flex w-full items-center justify-center rounded-2xl px-5 py-3 font-semibold ' +
    'text-[#0B1210] bg-[#14F195] shadow-[0_10px_30px_rgba(20,241,149,.35)] ' +
    'transition-transform active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-[#14F195]/40 ' +
    'overflow-hidden disabled:opacity-60';

  // simple CSS-only shine using a pseudo element
  const shine =
    'before:content-[\"\"] before:absolute before:inset-0 before:-translate-x-full ' +
    'before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent ' +
    'hover:before:translate-x-full before:transition-transform before:duration-700';

  return (
    <button className={`${base} ${shine}`} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}
