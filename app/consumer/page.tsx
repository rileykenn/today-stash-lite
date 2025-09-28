'use client';

import { useEffect, useState } from 'react';
import { sb } from '@/lib/supabaseBrowser';
import QRCode from 'react-qr-code';

type Offer = {
  id: string;
  title: string;
  description: string | null;
  merchant_id: string;
};

type Me = { user_id: string; role: 'admin'|'merchant'|'consumer'; paid?: boolean };

type RowState = {
  loading: boolean;
  error: string | null;
  tokenId: string | null;
  expiresAt: string | null;
};

const TOKEN_TTL_SECONDS = 120; // 2 minutes for testing

export default function ConsumerPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [rowState, setRowState] = useState<Record<string, RowState>>({}); // keyed by offer.id
  const [globalError, setGlobalError] = useState<string | null>(null);

  useEffect(() => {
    // fetch offers (public)
    sb.from('offers')
      .select('id,title,description,merchant_id')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setGlobalError(error.message);
        setOffers(data ?? []);
      });

    // fetch me (to know if paid)
    (async () => {
      const { data: sessionRes } = await sb.auth.getSession();
      if (!sessionRes?.session) {
        setMe(null);
        return;
      }
      // your view "me" may also include paid; if not, we’ll check user_access
      const { data: meRow } = await sb.from('me').select('*').single();
      if (meRow && typeof meRow.paid === 'boolean') {
        setMe(meRow as Me);
      } else {
        // fallback: check user_access
        const { data: access } = await sb.from('user_access').select('paid').eq('user_id', sessionRes.session.user.id).single();
        setMe({ user_id: sessionRes.session.user.id, role: (meRow?.role ?? 'consumer'), paid: !!access?.paid });
      }
    })();
  }, []);

  const createToken = async (offer: Offer) => {
    setRowState((s) => ({
      ...s,
      [offer.id]: { loading: true, error: null, tokenId: null, expiresAt: null },
    }));

    // must be logged in
    const { data: sessionRes } = await sb.auth.getSession();
    const userId = sessionRes?.session?.user?.id;
    if (!userId) {
      setRowState((s) => ({
        ...s,
        [offer.id]: { loading: false, error: 'Please sign in to generate a QR.', tokenId: null, expiresAt: null },
      }));
      return;
    }

    // must be paid
    const { data: meRow } = await sb.from('me').select('*').single();
    const paid = !!meRow?.paid;
    if (!paid) {
      setRowState((s) => ({
        ...s,
        [offer.id]: { loading: false, error: 'Pay the one-time $99 to unlock redemptions.', tokenId: null, expiresAt: null },
      }));
      return;
    }

    // insert token with short TTL
    const expires = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString();
    const { data: tokenInsert, error } = await sb
      .from('tokens')
      .insert({
        user_id: userId,
        offer_id: offer.id,
        merchant_id: offer.merchant_id,
        expires_at: expires,
      })
      .select('id,expires_at')
      .single();

    if (error || !tokenInsert) {
      setRowState((s) => ({
        ...s,
        [offer.id]: { loading: false, error: error?.message || 'Failed to create token', tokenId: null, expiresAt: null },
      }));
      return;
    }

    setRowState((s) => ({
      ...s,
      [offer.id]: { loading: false, error: null, tokenId: tokenInsert.id, expiresAt: tokenInsert.expires_at },
    }));
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Deals</h1>

      {globalError && <p className="text-red-500 text-sm">{globalError}</p>}
      {offers.length === 0 && <p className="text-sm">No active deals yet.</p>}

      <ul className="space-y-4">
        {offers.map((o) => {
          const state = rowState[o.id] || { loading: false, error: null, tokenId: null, expiresAt: null };
          const expiresText = state.expiresAt
            ? `Expires at ${new Date(state.expiresAt).toLocaleTimeString()}`
            : '';

          return (
            <li key={o.id} className="border rounded p-3">
              <div className="font-medium">{o.title}</div>
              {o.description && <div className="text-sm text-gray-600">{o.description}</div>}

              {/* Generate / Show QR */}
              {!state.tokenId ? (
                <button
                  className="mt-2 px-3 py-1.5 rounded bg-black text-white disabled:opacity-50"
                  onClick={() => createToken(o)}
                  disabled={state.loading}
                >
                  {state.loading ? 'Creating…' : 'Show QR'}
                </button>
              ) : (
                <div className="mt-3">
                  <div className="text-xs text-gray-600 mb-2">{expiresText}</div>
                  {/* IMPORTANT: encode RAW UUID (scanner expects plain uuid string) */}
                  <div className="inline-block bg-white p-2 rounded">
                    <QRCode value={state.tokenId} />
                  </div>
                </div>
              )}

              {state.error && <div className="mt-2 text-red-500 text-sm">Error: {state.error}</div>}
            </li>
          );
        })}
      </ul>

      {/* Optional: quick status of paywall */}
      <div className="text-xs text-gray-500">
        {me?.paid ? 'Your account: Paid' : 'Your account: Not paid'}
      </div>
    </div>
  );
}
