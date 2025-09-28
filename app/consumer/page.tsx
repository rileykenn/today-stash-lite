'use client';
import { useEffect, useState } from 'react';
import { sb } from '@/lib/supabaseBrowser';
import Link from 'next/link';

type Offer = { id: string; title: string; description: string | null; merchant_id: string };

export default function ConsumerPage() {
  const [offers, setOffers] = useState<Offer[]>([]);

  useEffect(() => {
    sb.from('offers').select('id,title,description,merchant_id').eq('is_active', true)
      .then(({ data }) => setOffers(data ?? []));
  }, []);

  return (
    <div className="p-4">
      <h1>Deals</h1>
      <ul>
        {offers.map(o => (
          <li key={o.id}>
            <Link href={`/consumer/offer/${o.id}`}>{o.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
