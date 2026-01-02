// app/admin/_components/MerchantDeals.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { sb } from '@/lib/supabaseBrowser';
import CouponTicket from '@/app/consumer/components/CouponTicket';
import type { Coupon } from '@/app/consumer/components/types';
import { getSydneyDateUTC, getSydneyToday } from '@/app/consumer/components/helpers';

type OfferRow = {
  id: string;
  merchant_id: string;
  title: string | null;
  terms: string | null;
  exp_date: string | null;
  total_limit: number | null;
  redeemed_count: number | null;
  is_active: boolean | null;
  created_at: string | null;
  image_url: string | null;
  savings_cents: number | null;
  area_key: string | null;
  area_name: string | null;
};

export default function MerchantDeals({
  open,
  onClose,
  merchant,
}: {
  open: boolean;
  onClose: () => void;
  merchant: {
    id: string;
    name: string;
    street_address: string | null;
    town_name: string | null;
  } | null;
}) {
  const [rows, setRows] = useState<OfferRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !merchant?.id) return;

    (async () => {
      setLoading(true);
      const { data, error } = await sb
        .from('offers')
        .select(
          'id,merchant_id,title,terms,exp_date,total_limit,redeemed_count,is_active,created_at,image_url,savings_cents,area_key,area_name',
        )
        .eq('merchant_id', merchant.id)
        .order('created_at', { ascending: false })
        .limit(200);

      setLoading(false);

      if (error) {
        console.error('OFFERS FETCH ERROR:', error);
        setRows([]);
        return;
      }

      setRows((data as any[]) as OfferRow[]);
    })();
  }, [open, merchant?.id]);

  const coupons: Coupon[] = useMemo(() => {
    if (!merchant) return [];

    const addressText =
      [merchant.street_address, merchant.town_name].filter(Boolean).join(', ') || null;

    const today = getSydneyToday();

    return rows.map((r) => {
      let daysLeft: number | null = null;

      if (r.exp_date) {
        const exp = new Date(r.exp_date);
        if (!Number.isNaN(exp.getTime())) {
          const expSydney = getSydneyDateUTC(exp);
          const diffMs = expSydney.getTime() - today.getTime();
          daysLeft = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        }
      }

      return {
        id: r.id,
        title: r.title ?? '',
        terms: r.terms ?? '',
        totalValue: (Number(r.savings_cents || 0) || 0) / 100,
        imageUrl: r.image_url ?? null,
        merchant: {
          name: merchant.name,
          logoUrl: null,
          addressText,
        },
        usedCount: Number(r.redeemed_count || 0) || 0,
        totalLimit: r.total_limit ?? null,
        areaKey: r.area_key ?? 'unknown',
        areaLabel: r.area_name ?? (merchant.town_name ?? 'Unknown'),
        daysLeft,
      };
    });
  }, [rows, merchant]);

  if (!open || !merchant) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
      <div className="w-full max-w-3xl rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden">
        <div className="flex items-start justify-between gap-3 p-4 border-b border-slate-200">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold truncate">{merchant.name} — Deals</h3>
            <p className="text-sm text-slate-600 truncate">
              {merchant.town_name ?? '—'}
              {merchant.street_address ? ` • ${merchant.street_address}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium"
          >
            Close
          </button>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="text-sm text-slate-600">Loading deals…</div>
          ) : coupons.length === 0 ? (
            <div className="text-sm text-slate-600">No deals found for this merchant.</div>
          ) : (
            <div className="grid gap-3">
              {coupons.map((c) => (
                <CouponTicket
                  key={c.id}
                  deal={c as any}
                  onShow={() => {
                    // keep same UI as consumer; admin doesn't need redeem action
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
