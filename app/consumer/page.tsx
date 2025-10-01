/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import { sb } from '@/lib/supabaseBrowser';
import QRCode from 'react-qr-code';

/* ---------- Types ---------- */
type Offer = {
  id: string;
  title: string;
  description: string | null; // used as "Terms" in UI
  merchant_id: string;
  image_url: string | null;
  // If you later add a total_value column in Supabase, you can plumb it in:
  // total_value?: number | null;
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
  }

  return (
    <div className="relative z-0 min-h-screen bg-neutral-950 text-white overflow-x-hidden">
      {/* header */}
      <section className="px-5 pt-6 pb-3 border-b border-white/10">
        <h2 className="text-2xl font-extrabold">Sussex Inlet Deals</h2>
        <p className="text-sm text-gray-300">
          Tap a coupon ticket and show the QR to staff at checkout.
        </p>
      </section>

      <section className="max-w-screen-md mx-auto px-4 py-5 relative z-10">
        {globalError && <p className="text-rose-300 mb-3 text-sm">Error: {globalError}</p>}
        {loadingOffers && <p className="text-gray-300 mb-3 text-sm">Loading deals…</p>}
        {!loadingOffers && offers.length === 0 && (
          <p className="text-gray-300 mb-3 text-sm">No active deals yet.</p>
        )}

        <ul className="list-none p-0 space-y-4">
          {offers.map((o) => {
            const state: RowState =
              rowState[o.id] ?? { loading: false, error: null, tokenId: null, expiresAt: null };
            const src = resolveOfferImageUrl(o.image_url);

            return (
              <li key={o.id}>
                <TicketCard
                  title={o.title}
                  terms={o.description}
                  totalValue={null /* plug a value if you have it */}
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
          <div className="w-full max-w-sm rounded-2xl overflow-hidden border border-emerald-400/30 bg-[#0f1220]">
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
                <div className="rounded-2xl p-3 bg-white">
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

/* ---------- Sleek single-row Ticket Card ---------- */
function TicketCard({
  title,
  terms,
  totalValue,
  imageSrc,
  merchantName,
  loading,
  error,
  onRedeem,
}: {
  title: string;
  terms: string | null;
  totalValue?: string | number | null;
  imageSrc: string | null;
  merchantName: string | null;
  loading: boolean;
  error: string | null;
  onRedeem: () => void;
}) {
  return (
    <div
      className="
        grid grid-cols-[88px_1fr_auto] items-center gap-3
        rounded-xl border border-emerald-500/30 bg-neutral-900
        p-3
      "
    >
      {/* LEFT: photo */}
      <div className="h-20 w-20 overflow-hidden rounded-lg bg-neutral-800">
        {imageSrc ? (
          <img src={imageSrc} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[11px] text-gray-400">
            No Image
          </div>
        )}
      </div>

      {/* MIDDLE: text block */}
      <div className="min-w-0">
        <div className="flex items-start gap-2">
          <h3 className="text-base font-bold text-white truncate">{title}</h3>
          {typeof totalValue !== 'undefined' && totalValue !== null && (
            <span className="flex-shrink-0 rounded-full border border-emerald-500/40 bg-emerald-400/10 px-2 py-[2px] text-[11px] font-semibold text-emerald-300">
              ${totalValue} value
            </span>
          )}
        </div>

        {terms && (
          <p className="mt-1 text-[13px] text-gray-300 overflow-hidden text-ellipsis whitespace-nowrap">
            {terms}
          </p>
        )}

        {merchantName && (
          <div className="mt-1 text-[12px] text-gray-400 overflow-hidden text-ellipsis whitespace-nowrap">
            🏪 {merchantName}
          </div>
        )}
      </div>

      {/* RIGHT: full-height CTA */}
      <div className="flex items-stretch">
        <RedeemButton onClick={onRedeem} disabled={loading} fullHeight>
          {loading ? 'Loading…' : 'Redeem Now'}
        </RedeemButton>
      </div>

      {error && (
        <div className="col-span-full mt-2 text-[12px] text-rose-300">
          Error: {error}
        </div>
      )}
    </div>
  );
}

/* ---------- Bright green CTA (one piece) ---------- */
function RedeemButton({
  children,
  disabled,
  onClick,
  fullHeight,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  fullHeight?: boolean;
}) {
  const base =
    'inline-flex items-center justify-center rounded-lg px-4 md:px-6 text-sm font-bold ' +
    'text-black bg-emerald-400 hover:bg-emerald-300 transition ' +
    'disabled:opacity-60 disabled:cursor-not-allowed';
  return (
    <button
      className={`${base} ${fullHeight ? 'h-12 md:h-14' : 'h-12'} whitespace-nowrap`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
