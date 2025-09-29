'use client';

import { useEffect, useState } from 'react';
import { sb } from '@/lib/supabaseBrowser';
import QRCode from 'react-qr-code';

type Offer = {
  id: string;
  title: string;
  description: string | null;
  merchant_id: string;
  image_url: string | null;
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

  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  return `${base}/storage/v1/object/public/offer-media/${val.replace(/^\/+/, '')}`;
}

export default function ConsumerPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [rowState, setRowState] = useState<Record<string, RowState>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loadingOffers, setLoadingOffers] = useState<boolean>(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalOfferTitle, setModalOfferTitle] = useState('');
  const [modalTokenId, setModalTokenId] = useState('');
  const [modalExpiresAt, setModalExpiresAt] = useState('');

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
      const { data, error } = await sb.from('me').select('user_id,role,paid').single();

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

    const { data, error: meErr } = await sb.from('me').select('user_id,role,paid').single();
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

    const expiresAtISO = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString();
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
          SAVE <span className="text-[#14F195] drop-shadow-[0_0_24px_rgba(20,241,149,.4)]">up to $3,200</span>
        </h1>
        <p className="text-sm text-[#9ADABF] mt-1">
          Pay <span className="font-semibold text-white">$99</span> once. Unlock hundreds in local freebies today.
        </p>
      </div>

      {/* CONTENT */}
      <div className="p-4">
        {globalError && <p className="text-[#FCA5A5] text-sm mb-3">Error: {globalError}</p>}
        {loadingOffers && <p className="text-sm text-[#9ADABF] mb-3">Loading deals…</p>}
        {!loadingOffers && offers.length === 0 && (
          <p className="text-sm text-[#9ADABF] mb-3">No active deals yet.</p>
        )}

        {/* COUPON LIST */}
        <ul className="space-y-4">
          {offers.map((o) => {
            const state: RowState =
              rowState[o.id] ?? { loading: false, error: null, tokenId: null, expiresAt: null };
            const src = resolveOfferImageUrl(o.image_url);

            return (
              <li key={o.id}>
                <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.06] backdrop-blur shadow-[0_10px_30px_rgba(20,241,149,.15)]">
                  <div className="relative flex">
                    {/* LEFT: image */}
                    <div className="relative w-[40%] max-w-[240px] min-w-[180px]">
                      <div className="aspect-[4/3] w-full">
                        {src ? (
                          <img
                            src={src}
                            alt={o.title}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-full w-full bg-black/30" />
                        )}
                      </div>
                      <div className="pointer-events-none absolute inset-y-0 -left-4 my-auto h-8 w-8 rounded-full bg-[#0B1210] border border-white/10" />
                      <div className="pointer-events-none absolute inset-y-0 left-[calc(40%)] -translate-x-1/2 my-auto h-8 w-8 rounded-full bg-[#0B1210] border border-white/10" />
                    </div>

                    {/* RIGHT */}
                    <div className="flex-1 p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-base sm:text-lg font-extrabold leading-snug line-clamp-2">{o.title}</h3>
                        <div className="pointer-events-none relative">
                          <div className="absolute -right-6 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-[#0B1210] border border-white/10" />
                        </div>
                      </div>
                      {o.description && (
                        <p className="mt-1 text-xs sm:text-sm text-[#9ADABF] line-clamp-3">{o.description}</p>
                      )}
                      <div className="mt-3 max-w-sm">
                        <GlowButton onClick={() => createToken(o)} disabled={state.loading}>
                          {state.loading ? 'Creating…' : 'Show QR'}
                        </GlowButton>
                      </div>
                      {state.error && <div className="mt-2 text-[11px] text-[#FCA5A5]">{state.error}</div>}
                    </div>
                  </div>
                  <div
                    className="pointer-events-none absolute left-[40%] top-0 -translate-x-1/2 h-2 w-[60%] opacity-40"
                    style={{
                      backgroundImage: 'radial-gradient(circle, rgba(232,255,243,0.0) 2px, transparent 2px)',
                      backgroundSize: '10px 2px',
                      backgroundRepeat: 'repeat-x',
                      maskImage: 'linear-gradient(to right, transparent, white 10%, white 90%, transparent)',
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>

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

function GlowButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const base =
    'relative inline-flex w-full items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold ' +
    'text-[#0B1210] bg-[#14F195] shadow-[0_10px_26px_rgba(20,241,149,.35)] ' +
    'transition-transform active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-[#14F195]/40 ' +
    'overflow-hidden disabled:opacity-60';

  const shine =
    "before:content-[''] before:absolute before:inset-0 before:-translate-x-full " +
    'before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent ' +
    'hover:before:translate-x-full before:transition-transform before:duration-700';

  return (
    <button className={`${base} ${shine}`} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}
