/* eslint-disable @next/next/no-img-element */
// app/consumer/page.tsx — Server Component (SSR)
// Fetches initial deals + towns server-side so Google sees real content.
// All interactivity is handled by ConsumerDealsClient (client component).

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import ConsumerDealsClient from "./ConsumerDealsClient";

import type { Coupon, Town } from "./components/types";
import {
  resolvePublicUrl,
  getMerchantName,
  getMerchantLogo,
  getMerchantBanner,
  getMerchantAddress,
} from "./components/helpers";

export default async function ConsumerDealsPage() {
  // ── Fetch towns server-side ──
  const { data: townsData } = await supabaseAdmin
    .from("towns")
    .select("id, name, slug, is_free")
    .order("name");

  const towns: Town[] = (townsData || []).map((t: any) => ({
    ...t,
    slug: (t.slug ?? "").toLowerCase().trim(),
  }));

  // ── Fetch active deals server-side ──
  const { data: offersData } = await supabaseAdmin
    .from("offers")
    .select(`
      id, merchant_id, title, description, terms, image_url, savings_cents,
      total_limit, redeemed_count, is_active, created_at, area_key, area_name, exp_date,
      price_cents, original_price_cents, valid_from, valid_until, recurring_schedule,
      merchant:merchants(id, name, logo_url, banner_url, street_address, operating_hours, town_id, category)
    `)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  // ── Map to Coupon type (simplified — no time-dependent logic on server) ──
  // Server renders a static snapshot for Google. Client-side hydration
  // will re-fetch with full scheduling/time logic.
  const initialDeals: Coupon[] = (offersData ?? []).map((r: any) => {
    const townSlug = String(r?.area_key ?? "").toLowerCase().trim();

    return {
      id: String(r.id),
      title: String(r.title ?? ""),
      terms: String(r.terms ?? r.description ?? ""),
      totalValue: (r.savings_cents ?? 0) / 100,
      imageUrl: resolvePublicUrl(
        r.image_url,
        process.env.NEXT_PUBLIC_OFFER_BUCKET || "offer-media"
      ),
      merchant: {
        id: r.merchant?.id,
        name: getMerchantName(r.merchant),
        logoUrl: getMerchantLogo(r.merchant),
        bannerUrl: getMerchantBanner(r.merchant),
        addressText: getMerchantAddress(r.merchant),
        townId: r.merchant?.town_id,
        category: r.merchant?.category,
        isClosed: false, // Server doesn't know real-time hours
        nextOpen: undefined,
        closesAt: null,
      },
      usedCount: r.redeemed_count ?? 0,
      totalLimit: r.total_limit,
      areaKey: townSlug,
      areaLabel: r.area_name ?? "Local",
      townSlug: townSlug,
      daysLeft: null,

      price: r.price_cents ? r.price_cents / 100 : null,
      originalPrice: r.original_price_cents
        ? r.original_price_cents / 100
        : null,
      descriptionMerchant: null,
      validFrom: r.valid_from,
      validUntil: r.valid_until,
      collectionWindow: null,
      todayStart: null,
      todayEnd: null,
      nextAvailableStart: null,
      nextAvailableEnd: null,
    } as Coupon;
  });

  return (
    <ConsumerDealsClient initialDeals={initialDeals} initialTowns={towns} />
  );
}
