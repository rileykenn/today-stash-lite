'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import QRCode from 'react-qr-code';
import { sb } from '@/lib/supabaseBrowser';

export default function OfferDetail() {
  const { id } = useParams<{id:string}>();
  const [tokenId, setTokenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createToken() {
    const { data: sess } = await sb.auth.getUser();
    if (!sess.user) { setError('Please sign in to redeem.'); return; }
    const { data: me } = await sb.from('me').select('*').single();
    if (!me?.paid) { setError('Pay $99 once to unlock redemptions.'); return; }

    // fetch offer + merchant_id
    const { data: offer } = await sb.from('offers').select('id, merchant_id, is_active, valid_from, valid_to').eq('id', id).single();
    if (!offer?.is_active) { setError('Offer not active.'); return; }

    const expiresAt = new Date(Date.now() + 1000*60*5).toISOString(); // 5 minutes

    const { data, error } = await sb.from('tokens').insert({
      user_id: sess.user.id,
      offer_id: id,
      merchant_id: offer.merchant_id,
      expires_at: expiresAt
    }).select('id').single();

    if (error) setError(error.message);
    else setTokenId(data.id);
  }

  return (
    <div className="p-4">
      <h2>Offer</h2>
      {!tokenId ? (
        <>
          {error && <p>{error}</p>}
          <button onClick={createToken}>Generate QR</button>
        </>
      ) : (
        <>
          <p>Show this QR to the cashier.</p>
          <QRCode value={JSON.stringify({ t: tokenId })} />
        </>

      )}
    </div>
  );
}
