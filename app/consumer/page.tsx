/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { sb } from "@/lib/supabaseBrowser";
import { useRouter } from "next/navigation";
import Gold3DBanner from "@/components/Gold3DBanner";

import type { Coupon, Town, Step } from "./components/types";
import {
  resolvePublicUrl,
  firstOrNull,
  getMerchantName,
  getMerchantLogo,
  getMerchantAddress,
  getSydneyDateUTC,
  getSydneyToday,
} from "./components/helpers";

import AreaGate from "./components/AreaGate";
import DealsGrid from "./components/DealsGrid";
import RedeemModal from "./components/RedeemModal";

export default function ConsumerDealsPage() {
  const router = useRouter();

  // Deals
  const [deals, setDeals] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Towns
  const [towns, setTowns] = useState<Town[]>([]);
  const [selectedArea, setSelectedArea] = useState<string | null>(null); // town.slug

  // Area access gate
  const [accessCode, setAccessCode] = useState("");
  const [areaUnlocked, setAreaUnlocked] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlockLoading, setUnlockLoading] = useState(false);

  // Redemption modal
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<Step>("instructions");
  const [activeDeal, setActiveDeal] = useState<Coupon | null>(null);

  // Flyer code (6-digit code printed under the QR)
  const [flyerCode, setFlyerCode] = useState("");
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /* -----------------------
     Fetch towns
     ----------------------- */

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data, error } = await sb
        .from("towns")
        .select("id, name, slug, access_code, is_free")
        .order("name", { ascending: true });

      if (!mounted) return;

      if (error) {
        console.error("Error loading towns", error);
        setTowns([]);
        return;
      }

      const mapped: Town[] =
        (data ?? []).map((t: any) => ({
          id: String(t.id),
          name: String(t.name ?? ""),
          slug: String(t.slug ?? "").toLowerCase().trim(),
          access_code:
            t.access_code === null || t.access_code === undefined
              ? null
              : String(t.access_code),
          is_free: Boolean(t.is_free),
        })) ?? [];

      setTowns(mapped);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  /* -----------------------
     Fetch deals
     ----------------------- */

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setErr(null);

      const { data, error } = await sb
        .from("offers")
        .select(
          `
          id,
          merchant_id,
          title,
          description,
          terms,
          image_url,
          savings_cents,
          total_limit,
          redeemed_count,
          is_active,
          created_at,
          area_key,
          area_name,
          exp_date,
          merchant:merchants(*)
        `
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (!mounted) return;

      if (error) {
        console.error("Error loading offers", error);
        setErr(error.message);
        setDeals([]);
        setLoading(false);
        return;
      }

      const todaySydney = getSydneyToday();

      const mappedRaw = (data ?? []).map((r: any) => {
        const img = resolvePublicUrl(
          r?.image_url ?? null,
          process.env.NEXT_PUBLIC_OFFER_BUCKET || "offer-media"
        );

        const mRaw = firstOrNull<any>(r?.merchant);

        const logoPath = getMerchantLogo(mRaw);
        const logoUrl = resolvePublicUrl(
          logoPath,
          process.env.NEXT_PUBLIC_MERCHANT_BUCKET || "merchant-media"
        );

        const dollars =
          typeof r?.savings_cents === "number" && Number.isFinite(r.savings_cents)
            ? Math.max(0, Math.round(r.savings_cents) / 100)
            : 0;

        const areaKey: string = String(
          r?.area_key ?? r?.area_slug ?? r?.area ?? r?.area_name ?? "default"
        )
          .toLowerCase()
          .trim();

        const areaLabel: string = String(
          r?.area_name ?? r?.area_label ?? r?.area ?? "Local deals"
        );

        let daysLeft: number | null = null;
        if (r?.exp_date) {
          const expSydney = getSydneyDateUTC(new Date(r.exp_date));
          const diffMs = expSydney.getTime() - todaySydney.getTime();
          daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

          // If the offer is already expired, don't include it at all
          if (daysLeft < 0) return null;
        }

        return {
          id: String(r.id),
          title: String(r.title ?? ""),
          terms: String(r.terms ?? r.description ?? ""),
          totalValue: dollars,
          imageUrl: img,
          merchant: mRaw
            ? {
                name: getMerchantName(mRaw),
                logoUrl,
                addressText: getMerchantAddress(mRaw),
              }
            : null,
          usedCount: Number.isFinite(r?.redeemed_count) ? Number(r.redeemed_count) : 0,
          totalLimit:
            r?.total_limit === null || r?.total_limit === undefined
              ? null
              : Number(r.total_limit),
          areaKey,
          areaLabel,
          daysLeft,
        } as Coupon;
      });

      const mapped: Coupon[] = mappedRaw.filter((c): c is Coupon => c !== null);

      setDeals(mapped);
      setLoading(false);
    })();

    return () => {
      mounted = false;
      document.documentElement.style.overflow = "";
    };
  }, []);

  /* -----------------------
     Derived data
     ----------------------- */

  const areaOptions = useMemo(
    () =>
      towns.map((t) => ({
        key: t.slug,
        label: t.name,
      })),
    [towns]
  );

  useEffect(() => {
    if (!selectedArea && areaOptions.length > 0) {
      setSelectedArea(areaOptions[0].key);
    }
  }, [areaOptions, selectedArea]);

  useEffect(() => {
    setAreaUnlocked(false);
    setAccessCode("");
    setUnlockError(null);
  }, [selectedArea]);

  const visibleDeals = useMemo(() => {
    if (!selectedArea) return [];
    return deals.filter((d) => d.areaKey === selectedArea);
  }, [deals, selectedArea]);

  const currentTown: Town | undefined = useMemo(
    () => towns.find((t) => t.slug === (selectedArea ?? "")),
    [towns, selectedArea]
  );

  /* -----------------------
     Area unlock
     ----------------------- */

  async function handleUnlockArea(e?: React.FormEvent) {
    if (e) e.preventDefault();

    if (!selectedArea) {
      setUnlockError("Please select a town/area first.");
      return;
    }

    const town = towns.find((t) => t.slug === selectedArea);
    if (!town) {
      setUnlockError("Unknown town. Please try again.");
      return;
    }

    if (!accessCode || accessCode.trim().length < 4) {
      setUnlockError("Enter your 4-digit access code.");
      return;
    }

    setUnlockLoading(true);
    setUnlockError(null);

    try {
      const expected = (town.access_code ?? "").trim();
      if (!expected) {
        setAreaUnlocked(true);
      } else if (expected === accessCode.trim()) {
        setAreaUnlocked(true);
      } else {
        setUnlockError("Invalid code. Please double-check and try again.");
        setAreaUnlocked(false);
      }
    } finally {
      setUnlockLoading(false);
    }
  }

  /* -----------------------
     Redemption flow
     ----------------------- */

  const openModal = (deal: Coupon) => {
    setActiveDeal(deal);
    setStep("instructions");
    setFlyerCode("");
    setLastScanned(null);
    setSubmitError(null);
    setSubmitting(false);
    setModalOpen(true);
    document.documentElement.style.overflow = "hidden";
  };

  const closeModal = () => {
    setModalOpen(false);
    setActiveDeal(null);
    setFlyerCode("");
    setLastScanned(null);
    setSubmitError(null);
    setSubmitting(false);
    setStep("instructions");
    document.documentElement.style.overflow = "";
  };

  // Accepts optional override code so QR scan can auto-confirm.
  async function handleConfirmRedemption(codeOverride?: string) {
    if (!activeDeal) return;

    const pin = (codeOverride ?? flyerCode).trim();

    if (!pin || pin.length < 6) {
      setSubmitError("Enter the 6-digit code from the flyer to confirm.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const { error } = await sb.rpc("redeem_offer_with_pin", {
        p_offer_id: activeDeal.id,
        p_pin: pin,
      });

      if (error) {
        console.error("redeem_offer_with_pin failed", error);
        setSubmitError(
          "Code incorrect or redemption not allowed. Please check the flyer and try again."
        );
        setSubmitting(false);
        return;
      }

      setStep("success");
    } catch (e) {
      console.error(e);
      setSubmitError("Something went wrong. Please try again.");
      setSubmitting(false);
    } finally {
      setSubmitting(false);
    }
  }

  // When QR is scanned we now auto-confirm redemption.
  function handleQrDetected(value: string) {
    if (step !== "instructions") return;

    const digits = value.replace(/[^\d]/g, "").slice(0, 6);
    if (!digits) return;

    setFlyerCode(digits);
    setLastScanned(digits);
    setSubmitError(null);

    // Auto-confirm redemption using scanned code
    void handleConfirmRedemption(digits);
  }

  /**
   * When user taps "Redeem in store":
   * - If not logged in -> /signup
   * - If town is free (is_free = true) -> open modal directly
   * - Else -> /payment?town=slug&deal=id
   */
  async function handleShowGate(deal: Coupon) {
    const {
      data: { session },
    } = await sb.auth.getSession();

    if (!session) {
      router.push(`/signup?next=${encodeURIComponent("/consumer")}`);
      return;
    }

    const town = towns.find((t) => t.slug === (selectedArea ?? ""));
    const isFreeTown = town?.is_free ?? false;

    if (isFreeTown) {
      openModal(deal);
      return;
    }

    const params = new URLSearchParams();
    if (selectedArea) params.set("town", selectedArea);
    params.set("deal", deal.id);
    router.push(`/payment?${params.toString()}`);
  }

  /* -----------------------
     Render
     ----------------------- */

  const body = useMemo(() => {
    if (loading) return <p className="text-gray-300/80 text-sm">Loading deals…</p>;

    if (err) {
      return (
        <p className="text-red-300 text-sm">
          Error loading deals: <span className="font-semibold">{err}</span>
        </p>
      );
    }

    if (!areaOptions.length) {
      return <p className="text-gray-300/80 text-sm">No active towns yet.</p>;
    }

    return (
      <div className="space-y-8">
        <AreaGate
          areaOptions={areaOptions}
          selectedArea={selectedArea}
          onSelectArea={setSelectedArea}
          accessCode={accessCode}
          onChangeAccessCode={setAccessCode}
          currentTown={currentTown}
          unlockError={unlockError}
          unlockLoading={unlockLoading}
          onSubmit={handleUnlockArea}
        />

        <DealsGrid
          areaUnlocked={areaUnlocked}
          visibleDeals={visibleDeals}
          onRedeem={handleShowGate}
        />
      </div>
    );
  }, [
    loading,
    err,
    areaOptions,
    selectedArea,
    accessCode,
    currentTown,
    unlockError,
    unlockLoading,
    areaUnlocked,
    visibleDeals,
  ]);

  return (
    <main className="relative min-h-screen bg-[#0A0F13] overflow-x-hidden">
      {/* subtle blurry blobs (blue bias) */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-[380px] w-[380px] rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 right-[-60px] h-[420px] w-[420px] rounded-full bg-blue-400/10 blur-3xl" />

      {/* Banner */}
      <div className="relative z-10 flex justify-center pt-10 pb-4">
        <Gold3DBanner />
      </div>

      {/* Deals section */}
      <section className="relative mx-auto max-w-5xl px-4 py-8">{body}</section>

      <RedeemModal
        open={modalOpen}
        onClose={closeModal}
        activeDeal={activeDeal}
        step={step}
        lastScanned={lastScanned}
        flyerCode={flyerCode}
        setFlyerCode={setFlyerCode}
        submitting={submitting}
        submitError={submitError}
        onConfirm={handleConfirmRedemption}
        onQrDetected={handleQrDetected}
      />
    </main>
  );
}
