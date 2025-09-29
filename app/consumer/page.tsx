'use client';

import { useEffect, useState } from 'react';
import { sb } from '@/lib/supabaseBrowser';
import QRCode from 'react-qr-code';

type Offer = {
  id: string;
  title: string;
  description: string | null;
  merchant_id: string;
  image_url: string | null; // full URL or storage path
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

    setModalOfferTitle(offer.title);
    setModalTokenId(token.id);
    setModalExpiresAt(token.expires_at);
    setModalOpen(true);
  };

  return (
    <div className="min-h-dvh bg-[#0B1210] text-[#E8FFF3]">
      {/* HERO / PROMO */}
      <div className="relative px-5 pt-8 pb-6 border-b border-white/10 overflow-hidden">
        <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-[#14F195]/20 blur-3xl" />
        <h1 className="text-3xl font-black leading-tight">
          SAVE <span className="text-[#14F195] drop-shadow-[0_0_24px_rgba(20,241,149,.4)]">up to $3,000</span>
        </h1>
        <p className="text-sm text-[#9ADABF] mt-1">
          Pay <span className="font-semibold text-white">$99</span> once. Unlock hundreds in local freebies today.
        </p>
      </div>

      {/* CONTENT */}
      <div className="p-4">
        {globalError && (
          <p className="text-[#FCA5A5] text-sm mb-3">Error: {globalError}</p>
        )}
        {loadingOffers && (
          <p className="text-sm text-[#9ADABF] mb-3">Loading deals…</p>
        )}
        {!loadingOffers && offers.length === 0 && (
          <p className="text-sm text-[#9ADABF] mb-3">No active deals yet.</p>
        )}

        {/* TICKET GRID */}
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
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
              <li key={o.id} className="relative">
                {/* Ticket card */}
                <div
                  className="group rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden shadow-[0_10px_30px_rgba(20,241,149,.15)]"
                >
                  {/* Square image area */}
                  <div className="relative aspect-square">
                    {src ? (
                      <img
                        src={src}
                        alt={o.title}
                        decoding="async"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-black/30" />
                    )}
                    {/* value glow badge example (optional; hidden if no desc) */}
                    {o.description && (
                      <div className="absolute bottom-2 left-2 rounded-full bg-[#14F195] px-2.5 py-1 text-[11px] font-bold text-[#0B1210] shadow-[0_0_18px_rgba(20,241,149,.45)]">
                        Deal
                      </div>
                    )}
                  </div>

                  {/* perforation & content */}
                  <div className="relative p-3">
                    {/* perforated edge */}
                    <div
                      className="absolute -top-2 left-0 right-0 h-2 bg-repeat-x opacity-40"
                      style={{
                        backgroundImage:
                          'radial-gradient(circle, #0B1210 2px, transparent 2px)',
                        backgroundSize: '10px 2px',
                        backgroundPosition: 'center',
                      }}
                      aria-hidden
                    />
                    <div className="text-[13px] font-bold leading-tight line-clamp-2">
                      {o.title}
                    </div>
                    {o.description && (
                      <div className="mt-1 text-[11px] text-[#9ADABF] line-clamp-2">
                        {o.description}
                      </div>
                    )}

                    <div className="mt-2">
                      <GlowButton
                        onClick={() => createToken(o)}
                        disabled={state.loading}
                      >
                        {state.loading ? 'Creating…' : 'Show QR'}
                      </GlowButton>
                    </div>

                    {state.error && (
                      <div className="mt-1 text-[11px] text-[#FCA5A5]">
                        {state.error}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {/* account banner */}
        <div className="mt-6 text-xs text-[#9ADABF]">
          {me?.paid ? 'Your account: Paid' : 'Your account: Not paid'}
        </div>
      </div>

      {/* QR MODAL */}
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

/** Money-green glow button with a subtle shine sweep (Tailwind-only). */
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
  const base =
    'relative inline-flex w-full items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold ' +
    'text-[#0B1210] bg-[#14F195] shadow-[0_10px_26px_rgba(20,241,149,.35)] ' +
    'transition-transform active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-[#14F195]/40 ' +
    'overflow-hidden disabled:opacity-60';

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
