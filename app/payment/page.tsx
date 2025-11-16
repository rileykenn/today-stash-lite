/* app/payment/page.tsx */
/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { sb } from "@/lib/supabaseBrowser";

type AreaOption = {
  key: string;
  label: string;
  dealsCount: number;
};

export default function PaymentPage() {
  const [areas, setAreas] = useState<AreaOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const router = useRouter();

  // Fetch active areas from offers (same source as /consumer)
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErr(null);
      const { data, error } = await sb
        .from("offers")
        .select("id, area_key, area_name, is_active")
        .eq("is_active", true);

      if (!mounted) return;

      if (error) {
        setErr(error.message);
        setAreas([]);
        setLoading(false);
        return;
      }

      const map = new Map<string, AreaOption>();
      (data ?? []).forEach((row: any) => {
        const key: string = String(
          row?.area_key ?? row?.area_slug ?? row?.area ?? row?.area_name ?? "default"
        )
          .toLowerCase()
          .trim();

        const label: string = String(
          row?.area_name ?? row?.area_label ?? row?.area ?? "Local deals"
        );

        const existing = map.get(key);
        if (existing) {
          existing.dealsCount += 1;
        } else {
          map.set(key, { key, label, dealsCount: 1 });
        }
      });

      const list = Array.from(map.values()).sort((a, b) =>
        a.label.localeCompare(b.label)
      );

      setAreas(list);
      if (!selectedKey && list.length > 0) {
        setSelectedKey(list[0].key);
      }
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [selectedKey]);

  const selectedArea = useMemo(
    () => areas.find((a) => a.key === selectedKey) ?? null,
    [areas, selectedKey]
  );

  const handleCheckout = () => {
    if (!selectedArea) return;
    // This is where you'll later redirect to Stripe Checkout.
    // For now we just navigate to a placeholder route with query params.
    const params = new URLSearchParams({
      area_key: selectedArea.key,
      area_name: selectedArea.label,
      price_aud: "99",
    }).toString();
    router.push(`/checkout?${params}`);
  };

  return (
    <main className="relative min-h-screen bg-[#05090C] text-white overflow-x-hidden">
      {/* Glow background */}
      <div className="pointer-events-none absolute -top-32 -left-24 h-[420px] w-[420px] rounded-full bg-emerald-500/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-[-80px] h-[460px] w-[460px] rounded-full bg-blue-500/10 blur-3xl" />

      <section className="relative mx-auto max-w-5xl px-4 py-12 sm:py-16">
        {/* Badge / intro */}
        <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[11px] font-medium text-white/80 ring-1 ring-white/10 mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Unlimited local savings • $99 per area (AUD)
        </div>

        {/* Heading */}
        <header className="space-y-3 max-w-2xl">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight">
            Get unlimited access to coupons for{" "}
            <span className="text-emerald-400">
              {selectedArea ? selectedArea.label : "your area"}
            </span>
            .
          </h1>
          <p className="text-sm sm:text-base text-white/70">
            One low yearly payment unlocks every premium offer in your chosen
            area. No hidden fees, no surprise charges — just real, in-store
            savings you can use again and again.
          </p>
        </header>

        {/* Layout */}
        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] items-start">
          {/* Left: form + value props */}
          <div className="space-y-6">
            {/* Area selector card */}
            <div className="rounded-2xl bg-[#0B1215] ring-1 ring-white/10 p-4 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
              <h2 className="text-lg sm:text-xl font-semibold mb-4">
                Choose your area
              </h2>

              {loading ? (
                <p className="text-sm text-white/60">Loading areas…</p>
              ) : err ? (
                <p className="text-sm text-red-400">
                  Couldn&apos;t load areas:{" "}
                  <span className="font-semibold">{err}</span>
                </p>
              ) : areas.length === 0 ? (
                <p className="text-sm text-white/60">
                  No active areas available yet. Check back soon.
                </p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1.5">
                      Town / area
                    </label>
                    <select
                      value={selectedKey ?? ""}
                      onChange={(e) =>
                        setSelectedKey(e.target.value || null)
                      }
                      className="w-full h-11 rounded-xl bg-white/5 px-3 text-sm text-white outline-none ring-1 ring-white/15 focus:ring-2 focus:ring-emerald-400/70"
                    >
                      {areas.map((area) => (
                        <option key={area.key} value={area.key}>
                          {area.label}{" "}
                          {area.dealsCount > 0
                            ? `• ${area.dealsCount} active deal${
                                area.dealsCount === 1 ? "" : "s"
                              }`
                            : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedArea && (
                    <p className="text-xs text-white/60">
                      You&apos;re choosing{" "}
                      <span className="font-semibold text-white">
                        {selectedArea.label}
                      </span>
                      . You can add more areas later — each area is a separate
                      $99 AUD pass.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Value props */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                <p className="text-xs font-semibold text-emerald-300 mb-1">
                  Unlimited redemptions
                </p>
                <p className="text-xs text-white/70">
                  Use any deal in your area as many times as the venue allows —
                  no per-coupon fees.
                </p>
              </div>
              <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                <p className="text-xs font-semibold text-emerald-300 mb-1">
                  New deals added
                </p>
                <p className="text-xs text-white/70">
                  We continuously add new cafés, gyms, salons and more —
                  you&apos;re always getting fresh value.
                </p>
              </div>
              <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                <p className="text-xs font-semibold text-emerald-300 mb-1">
                  12-month access
                </p>
                <p className="text-xs text-white/70">
                  Your pass covers a full 12 months of access for that area.
                  Save hundreds from everyday spending.
                </p>
              </div>
            </div>

            {/* Guarantee */}
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-50">
              <p className="font-semibold mb-1">
                Local savings guarantee 💰
              </p>
              <p className="text-white/80">
                If you don&apos;t believe Today&apos;s Stash helped you save far
                more than $99 over the year, we don&apos;t deserve your renewal.
              </p>
            </div>
          </div>

          {/* Right: pricing card */}
          <aside className="rounded-3xl bg-gradient-to-b from-[#0F172A] to-[#020617] ring-1 ring-emerald-500/40 shadow-[0_30px_80px_rgba(6,95,70,0.7)] p-5 sm:p-7 flex flex-col gap-4">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-emerald-300/80 mb-2">
                  Area access pass
                </p>
                <h2 className="text-xl font-semibold">
                  Unlimited coupons for{" "}
                  <span className="text-emerald-400">
                    {selectedArea ? selectedArea.label : "your area"}
                  </span>
                </h2>
              </div>
              <div className="text-right">
                <div className="flex items-end justify-end gap-1">
                  <span className="text-3xl sm:text-4xl font-bold">
                    $99
                  </span>
                  <span className="text-xs text-white/60 mb-1">AUD</span>
                </div>
                <p className="text-[11px] text-white/60">
                  Once-off per area • 12 months
                </p>
              </div>
            </div>

            <ul className="mt-2 space-y-2 text-sm text-white/80">
              <li className="flex items-start gap-2">
                <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Access every premium deal in your chosen area.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>
                  Works across cafés, restaurants, gyms, hair &amp; beauty and
                  more — not just food.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>
                  Secure, in-store QR redemptions powered by Today&apos;s Stash.
                </span>
              </li>
            </ul>

            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={handleCheckout}
                disabled={!selectedArea || loading || !!err}
                className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed text-sm font-semibold text-white shadow-[0_0_18px_rgba(16,185,129,0.5)] transition-transform active:scale-[0.98]"
              >
                Continue to secure checkout
              </button>
              <p className="text-[11px] text-white/55 text-center">
                You&apos;ll be redirected to a secure Stripe checkout page to
                complete your payment for{" "}
                <span className="font-semibold">
                  {selectedArea ? selectedArea.label : "your selected area"}
                </span>
                .
              </p>
            </div>

            <div className="mt-2 flex items-center justify-center gap-2 text-[10px] text-white/45">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/20 text-[9px]">
                🔒
              </span>
              <span>
                Card details are never stored by Today&apos;s Stash. All
                payments are handled by Stripe.
              </span>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
