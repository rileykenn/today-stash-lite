/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { sb } from "@/lib/supabaseBrowser";
import Loading from "@/components/Loading";
import { Checkbox } from "@/components/Checkbox";
import {
  BuildingStorefrontIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  QrCodeIcon,
  PlusIcon,
  SparklesIcon,
  ClockIcon,
  TrashIcon,
  ArrowPathIcon,
  PhotoIcon,
  MapPinIcon,
  CheckBadgeIcon
} from "@heroicons/react/24/outline";

/* =======================
   Types
   ======================= */

type Merchant = {
  id: string;
  name: string;
};

type RedemptionRow = {
  id: string;
  redeemed_at: string | null;
  user_id: string | null;
  offer_id: string | null;
};

type OfferLite = {
  id: string;
  title: string;
  savings_cents: number | null;
};

type ProfileLite = {
  user_id: string;
  email: string | null;
};

type EnrichedRedemption = {
  id: string;
  redeemed_at: string | null;
  customerEmail: string | null;
  offerTitle: string;
  savingsCents: number;
};

type DaySchedule = {
  isOpen: boolean;
  open: string;
  close: string;
};

type WeeklyHours = {
  [key: string]: DaySchedule;
};

const DEFAULT_HOURS: WeeklyHours = {
  monday: { isOpen: true, open: "09:00", close: "17:00" },
  tuesday: { isOpen: true, open: "09:00", close: "17:00" },
  wednesday: { isOpen: true, open: "09:00", close: "17:00" },
  thursday: { isOpen: true, open: "09:00", "close": "17:00" },
  friday: { isOpen: true, open: "09:00", close: "17:00" },
  saturday: { isOpen: true, open: "09:00", close: "17:00" },
  sunday: { isOpen: false, open: "09:00", close: "17:00" },
};

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

type State =
  | { status: "loading" }
  | { status: "not-logged-in" }
  | { status: "not-merchant" }
  | { status: "application-pending"; app: any }
  | {
    status: "ready";
    merchant: Merchant;
    totalRedemptions: number;
    uniqueCustomers: number;
    estimatedRevenueCents: number;
    redemptions: EnrichedRedemption[];
    merchantOffers: any[];
    error: string | null;
  };

/* =======================
   Helpers
   ======================= */

function formatMoneyAUD(cents: number) {
  const dollars = (cents || 0) / 100;
  return dollars.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatDateTime(dt: string | null) {
  if (!dt) return "-";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-AU", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/* =======================
   Page
   ======================= */

export default function MerchantDashboardPage() {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading" });
  const [deletingOfferId, setDeletingOfferId] = useState<string | null>(null);

  // Restock State
  const [restockingOffer, setRestockingOffer] = useState<any>(null);
  const [restockAmount, setRestockAmount] = useState("");
  const [savingRestock, setSavingRestock] = useState(false);

  // Settings State
  const [hours, setHours] = useState<WeeklyHours>(DEFAULT_HOURS);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [streetAddress, setStreetAddress] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Mobile Deal Show More State
  const [showAllActive, setShowAllActive] = useState(false);
  const [showAllExpired, setShowAllExpired] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const {
        data: { session },
      } = await sb.auth.getSession();

      if (!session) {
        if (!cancelled) setState({ status: "not-logged-in" });
        return;
      }

      const userId = session.user.id;

      const { data: profile, error: profileErr } = await sb
        .from("profiles")
        .select("user_id, email, merchant_id, role")
        .eq("user_id", userId)
        .maybeSingle();

      if (profileErr) {
        if (!cancelled)
          setState({
            status: "ready",
            merchant: { id: "", name: "" },
            totalRedemptions: 0,
            uniqueCustomers: 0,
            estimatedRevenueCents: 0,
            redemptions: [],
            merchantOffers: [],
            error: "Failed to load profile/merchant data.",
          });
        console.error("profiles query error:", profileErr);
        return;
      }

      // If not a merchant, check if they have a PENDING application
      if (!profile || !profile.merchant_id || profile.role !== "merchant") {

        // Check for application
        const { data: appData, error: appErr } = await sb
          .from("applications")
          .select("*")
          .eq("user_id", userId)
          // We might want to get the latest one
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (appData) {
          // User has an application
          if (!cancelled) setState({ status: "application-pending", app: appData });
          return;
        }

        if (!cancelled) setState({ status: "not-merchant" });
        return;
      }

      const merchantId = String(profile.merchant_id);

      const { data: merchantRow, error: merchantErr } = await sb
        .from("merchants")
        .select("id, name, operating_hours, banner_url, logo_url, street_address")
        .eq("id", merchantId)
        .maybeSingle();

      if (merchantErr || !merchantRow) {
        if (!cancelled)
          setState({
            status: "ready",
            merchant: { id: merchantId, name: merchantRow?.name ?? "" },
            totalRedemptions: 0,
            uniqueCustomers: 0,
            estimatedRevenueCents: 0,
            redemptions: [],
            merchantOffers: [],
            error: "Failed to load merchant data.",
          });
        console.error("merchants query error:", merchantErr);
        return;
      }

      // Initialize Settings State
      if (merchantRow.operating_hours) {
        setHours({ ...DEFAULT_HOURS, ...(merchantRow.operating_hours as WeeklyHours) });
      }
      if (merchantRow.banner_url) {
        setBannerUrl(merchantRow.banner_url);
        setBannerPreview(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${process.env.NEXT_PUBLIC_OFFER_BUCKET || "offer-media"}/${merchantRow.banner_url}`);
      }
      if ((merchantRow as any).logo_url) {
        setLogoUrl((merchantRow as any).logo_url);
        setLogoPreview(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${process.env.NEXT_PUBLIC_OFFER_BUCKET || "offer-media"}/${(merchantRow as any).logo_url}`);
      }
      if (merchantRow.street_address) {
        setStreetAddress(merchantRow.street_address);
      }

      // Fetch offers
      const { data: offersData, error: offersFetchErr } = await sb
        .from('offers')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false });

      if (offersFetchErr) {
        console.error("Error fetching offers with count:", offersFetchErr);
      }

      const merchant: Merchant = {
        id: merchantRow.id,
        name: merchantRow.name ?? "Your venue",
      };

      const {
        data: redemptionRows,
        error: redErr,
        status: redStatus,
      } = await sb
        .from("redemptions")
        .select("id, redeemed_at, user_id, offer_id, merchant_id")
        .eq("merchant_id", merchant.id)
        .order("redeemed_at", { ascending: false })
        .limit(50);

      if (redErr && redStatus !== 406) {
        if (!cancelled)
          setState({
            status: "ready",
            merchant,
            totalRedemptions: 0,
            uniqueCustomers: 0,
            estimatedRevenueCents: 0,
            redemptions: [],
            merchantOffers: [],
            error: "Failed to load redemptions.",
          });
        console.error("redemptions query error:", redErr);
        return;
      }

      const redRows: RedemptionRow[] = redemptionRows ?? [];

      if (redRows.length === 0) {
        if (!cancelled)
          setState({
            status: "ready",
            merchant,
            totalRedemptions: 0,
            uniqueCustomers: 0,
            estimatedRevenueCents: 0,
            redemptions: [],
            merchantOffers: offersData ?? [],
            error: null,
          });
        return;
      }

      const offerIds = Array.from(
        new Set(
          redRows
            .map((r) => r.offer_id)
            .filter((v): v is string => Boolean(v && v.length))
        )
      );

      const offersMap = new Map<string, OfferLite>();
      if (offerIds.length > 0) {
        const { data: offers, error: offersErr } = await sb
          .from("offers")
          .select("id, title, savings_cents")
          .in("id", offerIds);

        if (offersErr) {
          console.error("offers query error:", offersErr);
        } else if (offers) {
          for (const o of offers as any[]) {
            offersMap.set(String(o.id), {
              id: String(o.id),
              title: String(o.title ?? ""),
              savings_cents:
                typeof o.savings_cents === "number" ? o.savings_cents : 0,
            });
          }
        }
      }

      const userIds = Array.from(
        new Set(
          redRows
            .map((r) => r.user_id)
            .filter((v): v is string => Boolean(v && v.length))
        )
      );

      const profileMap = new Map<string, ProfileLite>();
      if (userIds.length > 0) {
        const { data: profiles, error: profErr } = await sb
          .from("profiles")
          .select("user_id, email")
          .in("user_id", userIds);

        if (profErr) {
          console.error("profiles (for customers) query error:", profErr);
        } else if (profiles) {
          for (const p of profiles as any[]) {
            profileMap.set(String(p.user_id), {
              user_id: String(p.user_id),
              email: p.email ? String(p.email) : null,
            });
          }
        }
      }

      const enriched: EnrichedRedemption[] = redRows.map((r) => {
        const offer = r.offer_id ? offersMap.get(r.offer_id) : undefined;
        const prof = r.user_id ? profileMap.get(r.user_id) : undefined;

        return {
          id: r.id,
          redeemed_at: r.redeemed_at,
          customerEmail: prof?.email ?? null,
          offerTitle: offer?.title ?? "Offer",
          savingsCents: offer?.savings_cents ?? 0,
        };
      });

      const totalRedemptions = enriched.length;
      const uniqueCustomers = new Set(
        redRows.map((r) => r.user_id).filter(Boolean)
      ).size;

      const estimatedRevenueCents = enriched.reduce(
        (sum, r) => sum + (r.savingsCents || 0),
        0
      );

      if (!cancelled)
        setState({
          status: "ready",
          merchant,
          totalRedemptions,
          uniqueCustomers,
          estimatedRevenueCents,
          redemptions: enriched,
          merchantOffers: offersData ?? [],
          error: null,
        });
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [router]);

  /* =======================
     Settings Handlers
     ======================= */

  const handleDayChange = (day: string, field: keyof DaySchedule, value: any) => {
    setHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const saveSettings = async () => {
    if (state.status !== "ready") return;
    setSavingSettings(true);
    setSettingsError(null);

    try {
      let finalBannerUrl = bannerUrl;
      let finalLogoUrl = logoUrl;

      if (bannerFile) {
        const fileExt = bannerFile.name.split('.').pop();
        const fileName = `banner-${state.merchant.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const { error: uploadError } = await sb.storage
          .from(process.env.NEXT_PUBLIC_OFFER_BUCKET || "offer-media")
          .upload(fileName, bannerFile);
        if (uploadError) throw uploadError;
        finalBannerUrl = fileName;
      }

      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `logo-${state.merchant.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const { error: uploadError } = await sb.storage
          .from(process.env.NEXT_PUBLIC_OFFER_BUCKET || "offer-media")
          .upload(fileName, logoFile);
        if (uploadError) throw uploadError;
        finalLogoUrl = fileName;
      }

      const { error: updateError } = await sb
        .from("merchants")
        .update({
          operating_hours: hours,
          banner_url: finalBannerUrl,
          logo_url: finalLogoUrl,
          street_address: streetAddress
        } as any)
        .eq("id", state.merchant.id);

      if (updateError) throw updateError;

      setBannerUrl(finalBannerUrl);
      setBannerFile(null);
      setLogoUrl(finalLogoUrl);
      setLogoFile(null);
      alert("Settings saved successfully!");
    } catch (err: any) {
      console.error(err);
      setSettingsError(err.message || "Failed to save settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRestockSave = async () => {
    if (!restockingOffer) return;
    setSavingRestock(true);

    try {
      const addedAmount = parseInt(restockAmount, 10);
      if (isNaN(addedAmount) || addedAmount < 0) {
        alert("Please enter a valid amount.");
        return;
      }

      const currentRedeemed = restockingOffer.redeemed_count || 0;
      const newTotalLimit = currentRedeemed + addedAmount;

      const { error } = await sb
        .from("offers")
        .update({ total_limit: newTotalLimit })
        .eq("id", restockingOffer.id);

      if (error) throw error;

      // Update local state
      setState((prev) => {
        if (prev.status !== "ready") return prev;
        const updatedOffers = prev.merchantOffers.map((o) =>
          o.id === restockingOffer.id ? { ...o, total_limit: newTotalLimit } : o
        );
        return { ...prev, merchantOffers: updatedOffers };
      });

      setRestockingOffer(null);
      setRestockAmount("");
      alert("Stock updated successfully!");
    } catch (err: any) {
      console.error(err);
      alert("Failed to update stock.");
    } finally {
      setSavingRestock(false);
    }
  };

  /* =======================
     Render
     ======================= */

  if (state.status === "loading") {
    return <Loading message="Loading Merchant Dashboard..." />;
  }

  if (state.status === "not-logged-in") {
    return (
      <main className="min-h-screen bg-[#05070A] text-white flex items-center justify-center p-4">
        <section className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <BuildingStorefrontIcon className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold">Merchant Dashboard</h1>
          <p className="text-white/60">
            Please sign in to access your business dashboard.
          </p>
          <button
            type="button"
            onClick={() => router.push("/signin?next=/merchant-dashboard")}
            className="w-full inline-flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20"
          >
            Sign In
          </button>
        </section>
      </main>
    );
  }

  if (state.status === "application-pending") {
    const { app } = state;
    const status = app.status || "pending";
    const isDenied = status === 'denied';
    const isApproved = status === 'approved';

    return (
      <main className="min-h-screen bg-[#05070A] text-white flex items-center justify-center p-4">
        <section className="max-w-xl w-full">
          <div className={`rounded-2xl border ${isDenied ? 'border-red-500/30 bg-red-500/5' : 'border-white/10 bg-[#111821]'} p-8 space-y-6 text-center`}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${isDenied ? 'bg-red-500/20' : 'bg-emerald-500/20'}`}>
              {isDenied ? (
                <TrashIcon className="w-8 h-8 text-red-400" />
              ) : isApproved ? (
                <CheckBadgeIcon className="w-8 h-8 text-emerald-400" />
              ) : (
                <ClockIcon className="w-8 h-8 text-amber-400" />
              )}
            </div>

            <h1 className="text-2xl font-bold">
              {isDenied ? 'Application Denied' : (isApproved ? 'Application Approved' : 'Application Received')}
            </h1>

            <p className="text-white/60">
              {isDenied
                ? "Sorry, your merchant application was not approved at this time."
                : "Thanks for registering! We've received your details and our team is reviewing them."}
            </p>

            <div className="bg-white/5 rounded-xl p-4 text-left space-y-3 text-sm mt-6 border border-white/5">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-white/50">Business Name</span>
                <span className="font-medium">{app.business_name}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-white/50">Status</span>
                <span className={`font-medium px-2 py-0.5 rounded text-xs ${status === 'denied' ? 'bg-red-500/20 text-red-400' :
                  status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                    'bg-amber-500/20 text-amber-400'
                  }`}>
                  {status.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Submitted</span>
                <span>{formatDateTime(app.created_at)}</span>
              </div>
            </div>

            {isDenied && (
              <button
                onClick={() => router.push('/venue-register')}
                className="w-full bg-white/10 hover:bg-white/20 text-white rounded-xl py-3 font-semibold transition"
              >
                Submit New Application
              </button>
            )}
          </div>
        </section>
      </main>
    )
  }

  if (state.status === "not-merchant") {
    return (
      <main className="min-h-screen bg-[#05070A] text-white flex items-center justify-center p-4">
        <section className="max-w-lg w-full">
          <div className="rounded-2xl bg-[#111821] border border-white/10 p-8 space-y-6 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
              <BuildingStorefrontIcon className="w-8 h-8 text-white/50" />
            </div>
            <h1 className="text-xl font-semibold">Merchant Account Required</h1>
            <p className="text-sm text-white/60 leading-relaxed">
              This dashboard is only for businesses that partner with Today&apos;s Stash.
              Register your business to start reaching more customers.
            </p>

            <button
              type="button"
              onClick={() => router.push("/venue-register")}
              className="w-full inline-flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-400 transition"
            >
              Register Business
            </button>
          </div>
        </section>
      </main>
    );
  }


  const {
    merchant,
    totalRedemptions,
    uniqueCustomers,
    estimatedRevenueCents,
    redemptions,
    error,
  } = state;

  // Split offers into active and expired
  const now = new Date();
  const activeOffers = state.merchantOffers.filter((o: any) => {
    if (!o.valid_until) return true;
    return new Date(o.valid_until) > now;
  });
  const expiredOffers = state.merchantOffers.filter((o: any) => {
    if (!o.valid_until) return false;
    return new Date(o.valid_until) <= now;
  });

  return (
    <main className="min-h-screen bg-[#05070A] text-white p-4 lg:p-8">
      <div className="w-full max-w-[1920px] mx-auto">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-6 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded text-[11px] font-medium tracking-wide border border-emerald-500/20">MERCHANT DASHBOARD</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">{merchant.name}</h1>
            <p className="text-white/50 mt-2 text-sm max-w-2xl">
              Track performance, manage deals, and update your venue settings all in one place.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/merchant-dashboard/ai-deal"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition shadow-lg shadow-emerald-500/20"
            >
              <PlusIcon className="w-4 h-4" />
              Create Deal
            </Link>
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200 flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
            {error}
          </div>
        )}

        <div className="grid grid-cols-12 gap-8">

          {/* LEFT COLUMN (Main Content) */}
          <div className="col-span-12 xl:col-span-8 space-y-8">

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard
                label="Total Redemptions"
                value={totalRedemptions.toString()}
                icon={<QrCodeIcon className="w-5 h-5 text-blue-400" />}
                trend="All time"
              />
              <StatCard
                label="Unique Customers"
                value={uniqueCustomers.toString()}
                icon={<UserGroupIcon className="w-5 h-5 text-purple-400" />}
                trend="Distinct members"
              />
              <StatCard
                label="Est. Revenue"
                value={formatMoneyAUD(estimatedRevenueCents)}
                icon={<CurrencyDollarIcon className="w-5 h-5 text-emerald-400" />}
                trend="Driven by deals"
              />
            </div>

            {/* Active Deals */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                  Active Deals
                </h2>
                <span className="text-xs text-white/40 font-medium px-2 py-1 bg-white/5 rounded-lg border border-white/5">{activeOffers.length} Live</span>
              </div>

              {activeOffers.length === 0 ? (
                <div className="bg-[#111821] border border-white/5 border-dashed rounded-2xl p-12 text-center">
                  <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <PlusIcon className="w-6 h-6 text-white/30" />
                  </div>
                  <h3 className="text-white font-medium mb-1">No active deals</h3>
                  <p className="text-white/40 text-sm mb-4">Create a deal to start attracting customers.</p>
                  <Link href="/merchant-dashboard/create-deal" className="text-emerald-400 text-sm font-medium hover:underline">
                    + Create first deal
                  </Link>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeOffers.map((offer: any, idx: number) => (
                      <div key={offer.id} className={idx > 0 && !showAllActive ? "hidden md:block" : ""}>
                        <ActiveDealCard
                          offer={offer}
                          router={router}
                          onRestock={(o: any) => {
                            setRestockingOffer(o);
                            setRestockAmount("10"); // Default recommendation or empty
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  {activeOffers.length > 1 && (
                    <button
                      onClick={() => setShowAllActive(!showAllActive)}
                      className="md:hidden w-full mt-3 py-2 text-xs font-medium text-white/50 hover:text-white bg-[#111821] rounded-lg border border-white/5 transition"
                    >
                      {showAllActive ? "Show Less" : `Show ${activeOffers.length - 1} More Active Deals`}
                    </button>
                  )}
                </>
              )}
            </section>

            {/* Expired Deals */}
            {expiredOffers.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4 mt-8">
                  <h2 className="text-lg font-semibold text-white/80">Past Deals</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {expiredOffers.map((offer: any, idx: number) => (
                    <div key={offer.id} className={idx > 0 && !showAllExpired ? "hidden md:block" : ""}>
                      <ExpiredDealCard
                        offer={offer}
                        router={router}
                        onDelete={async () => {
                          if (!confirm(`Delete "${offer.title}"? This cannot be undone.`)) return;
                          setDeletingOfferId(offer.id);
                          try {
                            const { error } = await sb.from('offers').delete().eq('id', offer.id);
                            if (error) throw error;
                            window.location.reload();
                          } catch (err) {
                            console.error(err);
                            alert('Failed to delete deal');
                          } finally {
                            setDeletingOfferId(null);
                          }
                        }}
                        isDeleting={deletingOfferId === offer.id}
                      />
                    </div>
                  ))}
                </div>
                {expiredOffers.length > 1 && (
                  <button
                    onClick={() => setShowAllExpired(!showAllExpired)}
                    className="md:hidden w-full mt-3 py-2 text-xs font-medium text-white/50 hover:text-white bg-[#111821] rounded-lg border border-white/5 transition"
                  >
                    {showAllExpired ? "Show Less" : `Show ${expiredOffers.length - 1} More Past Deals`}
                  </button>
                )}
              </section>
            )}

            {/* Recent Redemptions */}
            <section className="bg-[#111821] border border-white/5 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <h2 className="font-semibold">Recent Redemptions</h2>
                <span className="text-xs text-white/40">Last 50</span>
              </div>

              {redemptions.length === 0 ? (
                <div className="p-12 text-center text-white/40 text-sm">
                  No redemptions recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-white/70">
                    <thead className="bg-white/[0.02] text-xs uppercase tracking-wider text-white/40 font-medium">
                      <tr>
                        <th className="px-6 py-4">Time</th>
                        <th className="px-6 py-4">Customer</th>
                        <th className="px-6 py-4">Deal</th>
                        <th className="px-6 py-4 text-right">Savings</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {redemptions.map((r) => (
                        <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-white/50 text-xs">
                            {formatDateTime(r.redeemed_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-white font-medium">
                            {r.customerEmail || 'Guest User'}
                          </td>
                          <td className="px-6 py-4">
                            {r.offerTitle}
                          </td>
                          <td className="px-6 py-4 text-right text-emerald-400 font-medium">
                            {formatMoneyAUD(r.savingsCents)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          {/* RIGHT COLUMN (Sidebar) */}
          <div className="col-span-12 xl:col-span-4 space-y-8">

            {/* QR Code Card */}
            <div className="bg-[#111821] border border-white/5 rounded-2xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-white">In-store QR Code</h3>
                  <p className="text-xs text-white/50 mt-1">Customers scan this to redeem deals.</p>
                </div>
                <QrCodeIcon className="w-10 h-10 text-white/10" />
              </div>
              <button
                onClick={() => router.push(`/merchant-qr-poster?merchantId=${merchant.id}`)}
                className="w-full bg-white/5 hover:bg-white/10 text-white py-2.5 rounded-xl text-sm font-medium transition border border-white/5"
              >
                Generate PDF Poster
              </button>
            </div>

            {/* Venue Settings Card */}
            <div className="bg-[#111821] border border-white/5 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-white/5">
                <h2 className="text-lg font-semibold">Venue Settings</h2>
                <p className="text-sm text-white/50 mt-1">Manage brand & hours</p>
              </div>

              <div className="p-6 space-y-6">

                {/* Business Logo */}
                <div>
                  <label className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Business Logo</label>
                  <div className="flex items-center gap-4">
                    <div className="relative group">
                      <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/10 bg-[#0A0F13] flex items-center justify-center">
                        {logoPreview ? (
                          <img src={logoPreview} className="w-full h-full object-cover" alt="Logo" />
                        ) : (
                          <BuildingStorefrontIcon className="w-8 h-8 text-white/15" />
                        )}
                      </div>
                      <label className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                        <PhotoIcon className="w-5 h-5 text-white" />
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoFileChange} />
                      </label>
                    </div>
                    <div className="text-xs text-white/40">
                      <p>Upload your business logo</p>
                      <p className="text-white/25 mt-0.5">Square image recommended</p>
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Business Address</label>
                  <div className="relative">
                    <MapPinIcon className="w-4 h-4 text-white/30 absolute left-3 top-3.5" />
                    <input
                      type="text"
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      placeholder="e.g. 123 Main St"
                      className="w-full bg-[#0A0F13] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors placeholder:text-white/20"
                    />
                  </div>
                </div>

                {/* Default Deal Banner Image */}
                <div>
                  <label className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-1">Default Deal Banner Image</label>
                  <p className="text-[11px] text-white/25 mb-2">This image will be used as the default for all your deals</p>
                  <div className="relative group rounded-xl overflow-hidden border border-white/10 bg-[#0A0F13] aspect-[3/1]">
                    {bannerPreview ? (
                      <img src={bannerPreview} className="w-full h-full object-cover" alt="Banner" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <PhotoIcon className="w-8 h-8 text-white/10" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 group-hover:opacity-100 opacity-0 transition-opacity flex items-center justify-center">
                      <label className="cursor-pointer bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-lg border border-white/10 backdrop-blur-sm transition">
                        Change Image
                        <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Operating Hours */}
                <div>
                  <label className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-3">Operating Hours</label>
                  <div className="space-y-3">
                    {DAYS.map(day => (
                      <div key={day} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3 w-32">
                          <Checkbox
                            checked={hours[day]?.isOpen}
                            onChange={(checked) => handleDayChange(day, "isOpen", checked)}
                          />
                          <span className="capitalize text-white/70">{day}</span>
                        </div>

                        {hours[day]?.isOpen ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              value={hours[day]?.open}
                              onChange={(e) => handleDayChange(day, "open", e.target.value)}
                              className="bg-[#0A0F13] border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500/50 w-20 text-center"
                            />
                            <span className="text-white/20">-</span>
                            <input
                              type="time"
                              value={hours[day]?.close}
                              onChange={(e) => handleDayChange(day, "close", e.target.value)}
                              className="bg-[#0A0F13] border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500/50 w-20 text-center"
                            />
                          </div>
                        ) : (
                          <span className="text-xs text-white/30 italic mr-8">Closed</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {settingsError && (
                  <div className="text-xs text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                    {settingsError}
                  </div>
                )}

                <button
                  onClick={saveSettings}
                  disabled={savingSettings}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold text-sm transition shadow-lg shadow-emerald-900/20 mt-2"
                >
                  {savingSettings ? "Saving..." : "Save Settings"}
                </button>

              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Restock Modal */}
      {restockingOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111821] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Restock Deal</h3>
            <p className="text-sm text-white/60 mb-6">
              Adjust the <strong>remaining stock</strong> for this deal.
            </p>

            <div className="space-y-4">
              <div className="flex justify-between text-sm py-2 border-b border-white/5">
                <span className="text-white/40">Total Sold</span>
                <span className="text-white font-mono">{restockingOffer.redeemed_count || 0}</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
                  New Remaining Quantity
                </label>
                <input
                  type="number"
                  value={restockAmount}
                  onChange={(e) => setRestockAmount(e.target.value)}
                  className="w-full bg-[#0A0F13] border border-white/10 rounded-xl py-3 px-4 text-lg text-white font-bold focus:outline-none focus:border-emerald-500/50 transition-colors"
                  placeholder="0"
                  autoFocus
                />
                <p className="text-xs text-white/30 mt-2">
                  This will set the Total Capacity to {(restockingOffer.redeemed_count || 0) + (parseInt(restockAmount || "0", 10))}.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  onClick={() => setRestockingOffer(null)}
                  className="bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl text-sm font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRestockSave}
                  disabled={savingRestock}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl text-sm font-semibold transition shadow-lg shadow-emerald-900/20 disabled:opacity-50"
                >
                  {savingRestock ? "Saving..." : "Update Stock"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main >
  );
}

/* =======================
   Sub-Components
   ======================= */

function StatCard({
  label,
  value,
  icon,
  trend
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend: string;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#111821] p-5 flex flex-col justify-between h-32 hover:border-white/10 transition-colors">
      <div className="flex justify-between items-start">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
          {label}
        </p>
        <div className="bg-white/5 p-1.5 rounded-lg border border-white/5">
          {icon}
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
        <p className="text-xs text-white/40 mt-1">{trend}</p>
      </div>
    </div>
  );
}


function ActiveDealCard({ offer, router, onRestock }: { offer: any, router: any, onRestock: (offer: any) => void }) {
  const isRecurring = offer.recurring_schedule && offer.recurring_schedule.length > 0;
  const totalLimit = offer.total_limit || 0;
  const redeemedCount = offer.redeemed_count || 0;
  const remaining = Math.max(0, totalLimit - redeemedCount);

  let recurringDays = "";
  if (isRecurring) {
    const days = offer.recurring_schedule.map((s: any) => s.day.substring(0, 3));
    const formattedDays = days.map((d: string) => d.charAt(0).toUpperCase() + d.slice(1));
    recurringDays = formattedDays.join(", ");
  }

  return (
    <div className="bg-[#111821] rounded-2xl p-5 border border-white/5 hover:border-emerald-500/30 transition-all group flex flex-col h-full">
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-white group-hover:text-emerald-400 transition-colors">{offer.title}</h3>
          {isRecurring && <span className="text-[10px] text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 w-fit">Runs {recurringDays}</span>}
        </div>
        <div className="flex items-center gap-1 text-[10px] bg-white/5 text-white/50 px-2 py-1 rounded-lg border border-white/5">
          <ClockIcon className="w-3 h-3" />
          <span>Active</span>
        </div>
      </div>

      <p className="text-sm text-white/60 mb-4 line-clamp-2 flex-grow">{offer.description}</p>

      <div className="grid grid-cols-2 gap-4 mb-4 bg-black/20 p-3 rounded-xl border border-white/5">
        <div>
          <span className="text-[10px] text-white/30 uppercase tracking-wide block mb-0.5">Price</span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-white">{formatMoneyAUD(offer.price_cents)}</span>
            <span className="text-xs text-white/40 line-through">{formatMoneyAUD(offer.original_price_cents)}</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-white/30 uppercase tracking-wide block mb-0.5">Remaining</span>
          <span className="text-lg font-bold text-emerald-400">{remaining}</span>
          <span className="text-xs text-white/40 ml-1">/ {totalLimit}</span>
        </div>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-3">
        <Link
          href={`/merchant-dashboard/create-deal?id=${offer.id}`}
          className="bg-white/5 hover:bg-white/10 text-white text-xs font-medium py-2.5 rounded-xl border border-white/5 transition flex items-center justify-center gap-2"
        >
          Edit Deal
        </Link>
        <button
          onClick={() => onRestock(offer)}
          className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium py-2.5 rounded-xl border border-emerald-500/20 transition flex items-center justify-center gap-2"
        >
          Restock
        </button>
      </div>
    </div>
  )
}

function ExpiredDealCard({ offer, router, onDelete, isDeleting }: { offer: any, router: any, onDelete: any, isDeleting: boolean }) {
  return (
    <div className="bg-[#111821] rounded-2xl p-5 border border-white/5 opacity-75 hover:opacity-100 transition-all flex flex-col h-full group">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-white/70 group-hover:text-white transition-colors">{offer.title}</h3>
        <span className="text-[10px] bg-white/5 text-white/30 px-2 py-1 rounded border border-white/5">Expired</span>
      </div>

      <div className="flex gap-3 text-sm text-white/40 mb-4">
        <span className="text-white/60">{formatMoneyAUD(offer.price_cents)}</span>
        <span className="line-through">{formatMoneyAUD(offer.original_price_cents)}</span>
      </div>

      <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/5">
        <div className="flex items-center gap-1.5 text-xs text-white/40">
          <UserGroupIcon className="w-3 h-3" />
          <span>{offer.redeemed_count || 0} used</span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="p-2 hover:bg-red-500/10 text-white/30 hover:text-red-400 rounded-lg transition"
            title="Delete Deal"
          >
            {isDeleting ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <TrashIcon className="w-4 h-4" />}
          </button>
          <Link
            href={`/merchant-dashboard/create-deal?id=${offer.id}`}
            className="bg-white/5 hover:bg-white/10 text-white text-xs px-3 py-2 rounded-lg border border-white/5 transition"
          >
            Re-use
          </Link>
        </div>
      </div>
    </div>
  )
}
