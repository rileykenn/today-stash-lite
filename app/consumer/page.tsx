/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import { sb } from '@/lib/supabaseBrowser';
import QRCode from 'react-qr-code';

/* ---------- Types (no any) ---------- */
type Offer = {
  id: string;
  title: string;
  description: string | null;
  merchant_id: string;           // we'll show this as the merchant label (no schema changes)
  image_url: string | null;      // full URL or Supabase storage path
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

/* ---------- Helpers ---------- */
function resolveOfferImageUrl(image_url: string | null): string | null {
  if (!image_url) return null;
  const val = image_url.trim();
  if (val.startsWith('http://') || val.startsWith('https://')) return val;
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  return `${base}/storage/v1/object/public/offer-media/${val.replace(/^\/+/, '')}`;
}

/* ---------- Page ---------- */
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

  async function createToken(offer: Offer) {
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
  }

  return (
    <div className="min-h-dvh bg-black text-white">
      {/* header copy */}
      <section className="px-5 pt-6 pb-3 border-b border-white/10">
        <h2 className="text-2xl font-extrabold">Sussex Inlet Deals</h2>
        <p className="text-sm text-gray-300">Tap a coupon ticket and show the QR to staff at checkout.</p>
      </section>

      <section className="max-w-screen-md mx-auto px-4 py-5">
        {globalError && <p className="text-rose-300 mb-3 text-sm">Error: {globalError}</p>}
        {loadingOffers && <p className="text-gray-300 mb-3 text-sm">Loading deals…</p>}
        {!loadingOffers && offers.length === 0 && (
          <p className="text-gray-300 mb-3 text-sm">No active deals yet.</p>
        )}

        {/* ONE column list of tickets */}
        <ul className="list-none p-0 space-y-5">
          {offers.map((o) => {
            const state: RowState =
              rowState[o.id] ?? { loading: false, error: null, tokenId: null, expiresAt: null };
            const src = resolveOfferImageUrl(o.image_url);

            return (
              <li key={o.id}>
                <TicketCard
                  title={o.title}
                  description={o.description}
                  imageSrc={src}
                  merchantName={o.merchant_id || null}
                  loading={state.loading}
                  error={state.error}
                  onRedeem={() => createToken(o)}
                />
              </li>
            );
          })}
        </ul>

        <div className="mt-6 text-xs text-gray-300">
          {me?.paid ? 'Your account: Paid' : 'Your account: Not paid'}
        </div>
      </section>

      {/* QR MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/70">
          <div className="w-full max-w-sm rounded-3xl overflow-hidden border border-emerald-400/30 bg-[#0f1220]">
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-gray-300">Present to staff</div>
                  <div className="text-lg font-extrabold">{modalOfferTitle}</div>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="ml-3 rounded-full bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20"
                  aria-label="Close"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 grid place-items-center">
                <div className="rounded-2xl p-3 bg-white shadow-[0_0_40px_rgba(16,185,129,.35)]">
                  <QRCode value={modalTokenId} />
                </div>
                <div className="mt-3 text-xs text-gray-300 text-center">
                  Expires at{' '}
                  <span className="font-semibold text-white">
                    {new Date(modalExpiresAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-gray-300 text-center break-all">
                  Code: <span className="font-semibold text-white">{modalTokenId}</span>
                </div>
              </div>

              <div className="mt-5">
                <RedeemButton onClick={() => setModalOpen(false)}>Done</RedeemButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Ticket Card ---------- */
function TicketCard({
  title,
  description,
  imageSrc,
  merchantName,
  loading,
  error,
  onRedeem,
}: {
  title: string;
  description: string | null;
  imageSrc: string | null;
  merchantName: string | null;
  loading: boolean;
  error: string | null;
  onRedeem: () => void;
}) {
  return (
    <div
      className="
        relative flex overflow-hidden rounded-2xl border border-gray-700
        bg-gradient-to-br from-[#1A1A27] to-[#0E0E14]
        shadow-[0_10px_30px_rgba(0,0,0,.45)]
      "
      /* scalloped (notched) sides using masks; graceful if unsupported */
      style={{
        WebkitMaskImage:
          'radial-gradient(circle at left center, transparent 10px, black 11px), radial-gradient(circle at right center, transparent 10px, black 11px)',
        WebkitMaskComposite: 'destination-in',
        maskComposite: 'intersect',
        WebkitMaskRepeat: 'no-repeat',
        WebkitMaskSize: '22px 100%',
        WebkitMaskPosition: 'left center, right center',
      }}
    >
      {/* LEFT: image sticker */}
      <div className="flex-shrink-0 p-3 flex items-center justify-center">
        <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-800 ring-2 ring-white/10">
          {imageSrc ? (
            <img src={imageSrc} alt={title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
              No Image
            </div>
          )}
        </div>
      </div>

      {/* PERFORATED DIVIDER + scissors */}
      <div className="flex flex-col items-center px-1">
        <div className="h-full border-l-2 border-dashed border-gray-600" />
        <div className="-mt-5 text-gray-500 text-xs" aria-hidden>✂️</div>
      </div>

      {/* RIGHT: text + CTA */}
      <div className="flex-1 p-4">
        <div>
          <h3 className="text-lg font-extrabold text-white leading-tight">{title}</h3>
          {description && (
            <p className="text-sm text-gray-300 mt-1">{description}</p>
          )}
          {merchantName && (
            <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
              <span role="img" aria-label="merchant">🏪</span>
              <span className="truncate">{merchantName}</span>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-center">
          <RedeemButton onClick={onRedeem} disabled={loading}>
            {loading ? 'Loading…' : 'Redeem Now'}
          </RedeemButton>
        </div>

        {error && <p className="mt-2 text-xs text-rose-300">Error: {error}</p>}
      </div>
    </div>
  );
}

/* ---------- Bright green pill CTA ---------- */
function RedeemButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const base =
    'relative inline-flex w-full items-center justify-center rounded-full px-6 py-2 text-sm font-bold ' +
    'text-black bg-emerald-400 hover:bg-emerald-300 transition ' +
    'shadow-[0_6px_18px_rgba(16,185,129,.55)] disabled:opacity-60';
  // subtle shine on hover
  const shine =
    'before:content-[\" \"] before:absolute before:inset-0 before:-translate-x-full ' +
    'before:bg-gradient-to-r before:from-transparent before:via-white/50 before:to-transparent ' +
    'hover:before:translate-x-full before:transition-transform before:duration-700 rounded-full overflow-hidden';
  return (
    <button className={`${base} ${shine}`} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}
