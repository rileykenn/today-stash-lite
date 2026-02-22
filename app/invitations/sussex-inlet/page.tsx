"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/* ── animated count-down hook ──────────────────────────── */
function useCountDown(from: number, to: number, durationMs = 1800) {
  const [value, setValue] = useState(from);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const t = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(from - (from - to) * eased);
      setValue(current);
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [from, to, durationMs]);

  return value;
}

export default function SussexInletBetaPage() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const businessSpots = useCountDown(50, 20, 1600);
  const consumerSpots = useCountDown(300, 100, 2000);

  useEffect(() => {
    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      setLoggedIn(!!data.session);
    }
    loadSession();
  }, []);

  const handleConsumerClick = () => {
    if (loggedIn) {
      router.push("/consumer");
    } else {
      router.push("/signup?role=consumer&area=sussex-inlet");
    }
  };

  return (
    <main className="min-h-screen bg-white text-gray-900 overflow-x-hidden">

      {/* ══════════════════════════════════════════════════
          HERO — cinematic full-bleed launch announcement
          ══════════════════════════════════════════════════ */}
      <section className="relative min-h-[100svh] flex items-center justify-center overflow-hidden">

        {/* background image */}
        <img
          src="/Sussexinlet/sussexheroimage.JPG"
          alt="Sussex Inlet aerial view"
          className="absolute inset-0 h-full w-full object-cover"
        />

        {/* layered gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />
        {/* subtle emerald tint at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-emerald-950/30 to-transparent" />

        {/* content */}
        <div className="relative z-10 mx-auto max-w-4xl px-5 py-24 text-center">

          {/* top badges */}
          <div className="flex items-center justify-center gap-2.5 mb-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 text-[13px] font-bold text-white shadow-lg">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Launching Now
            </span>
            <span className="rounded-full bg-emerald-500 px-4 py-2 text-[13px] font-bold text-white shadow-lg shadow-emerald-500/30">
              Founding Town
            </span>
          </div>

          {/* headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold text-white leading-[1.05] tracking-tight">
            Sussex Inlet,
            <br />
            <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-400 bg-clip-text text-transparent">
              your deals are here.
            </span>
          </h1>

          {/* sub-headline */}
          <p className="mt-6 text-lg sm:text-xl md:text-2xl text-white/80 font-medium max-w-2xl mx-auto leading-relaxed">
            Today&apos;s Stash is launching in Sussex Inlet. The first businesses
            and locals get{" "}
            <span className="text-white font-bold">6 months completely free</span>.
          </p>

          {/* urgency indicator */}
          <div className="mt-8 inline-flex items-center gap-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 px-6 py-3">
            <span className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-400" />
              </span>
              <span className="text-sm font-bold text-white/90">Only</span>
            </span>
            <span className="text-2xl font-extrabold text-emerald-400">{businessSpots}</span>
            <span className="text-sm text-white/70 font-medium">business spots left</span>
            <span className="text-white/30">|</span>
            <span className="text-2xl font-extrabold text-blue-400">{consumerSpots}</span>
            <span className="text-sm text-white/70 font-medium">consumer spots left</span>
          </div>

          {/* CTAs */}
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <a
              href="/merchant?area=sussex-inlet"
              className="group inline-flex items-center justify-center rounded-2xl bg-emerald-500 hover:bg-emerald-400 px-8 py-4 text-base font-bold text-white shadow-xl shadow-emerald-500/30 transition-all duration-200 hover:scale-[1.03] hover:shadow-emerald-500/50 active:scale-[0.97]"
            >
              Claim My Free Business Spot
              <svg className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </a>
            <button
              type="button"
              onClick={handleConsumerClick}
              className="group inline-flex items-center justify-center rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/25 px-8 py-4 text-base font-bold text-white shadow-xl transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
            >
              Get Free Coupons
              <svg className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>

          {/* trust line */}
          <p className="mt-8 text-sm text-white/50 font-medium">
            Free advertising &middot; Free coupons &middot; No fees, no catch &middot; No credit card required
          </p>

        </div>

        {/* scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
          <span className="text-[11px] uppercase tracking-[0.2em] text-white/40 font-bold">Learn more</span>
          <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce" />
          </div>
        </div>

      </section>

      {/* ══════════════════════════════════════════════════
          SPOT CARDS — street photo background
          ══════════════════════════════════════════════════ */}
      <section className="relative py-12 sm:py-16">
        {/* background image */}
        <div className="absolute inset-0">
          <img
            src="/Sussexinlet/Streetbirdseye.JPG"
            alt="Sussex Inlet streets"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-white/85" />
        </div>
        <div className="relative z-10 mx-auto max-w-4xl px-4">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-center mb-3">
            Claim your free spot
          </h2>
          <p className="text-sm text-gray-500 text-center mb-10 max-w-md mx-auto">
            Limited spots available. Once they fill, standard pricing applies.
          </p>

          <div className="grid gap-6 sm:grid-cols-2">

            {/* Business card */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-5">
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-[12px] font-bold text-emerald-700 uppercase tracking-wide">
                  For Businesses
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-red-500 uppercase tracking-wide">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                  </span>
                  Limited
                </span>
              </div>

              <div className="text-center mb-5">
                <span className="text-6xl sm:text-7xl font-extrabold text-gray-900">{businessSpots}</span>
                <p className="text-base font-bold text-gray-500 mt-1">free spots remaining</p>
                <p className="text-sm text-gray-400 mt-2">
                  6 months free advertising. No fees, no commissions, no catch.
                </p>
              </div>

              <ul className="space-y-2 mb-6">
                {["Free advertising to locals", "Zero platform fees", "No commissions or risk", "Drive foot traffic", "Founding partner status"].map((t) => (
                  <li key={t} className="flex items-center gap-2.5 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {t}
                  </li>
                ))}
              </ul>

              <a
                href="/merchant?area=sussex-inlet"
                className="flex items-center justify-center w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.01] active:scale-[0.98]"
              >
                Claim My Free Business Spot
              </a>
            </div>

            {/* Consumer card */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-5">
                <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-[12px] font-bold text-blue-700 uppercase tracking-wide">
                  For Consumers
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-red-500 uppercase tracking-wide">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                  </span>
                  Limited
                </span>
              </div>

              <div className="text-center mb-5">
                <span className="text-6xl sm:text-7xl font-extrabold text-gray-900">{consumerSpots}</span>
                <p className="text-base font-bold text-gray-500 mt-1">free spots remaining</p>
                <p className="text-sm text-gray-400 mt-2">
                  6 months of free coupons and deals from local businesses.
                </p>
              </div>

              <ul className="space-y-2 mb-6">
                {["Free coupons from local shops", "Save where you already visit", "6 months completely free", "Discover local businesses", "Early access to deals"].map((t) => (
                  <li key={t} className="flex items-center gap-2.5 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {t}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={handleConsumerClick}
                className="flex items-center justify-center w-full rounded-xl bg-blue-500 hover:bg-blue-400 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.01] active:scale-[0.98]"
              >
                Claim My Free Consumer Spot
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          THE CONSUMER EXPERIENCE
          ══════════════════════════════════════════════════ */}
      <section className="mx-auto max-w-4xl px-4 py-14 sm:py-16">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-center mb-3">
          The consumer experience
        </h2>
        <p className="text-sm text-gray-500 text-center mb-12 max-w-md mx-auto">
          Finding deals, redeeming them, and saving money. It only takes three steps.
        </p>

        <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr_auto_1fr] items-start">
          {/* Step 1: Search */}
          <div className="text-center">
            <img src="/Sussexinlet/Search.png" alt="Search" className="w-28 h-28 mx-auto object-contain mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">Search</h3>
            <p className="text-sm text-gray-500">
              Browse live deals from local businesses in Sussex Inlet. Find something you like and grab it.
            </p>
          </div>

          {/* Arrow 1 */}
          <div className="hidden sm:flex items-center justify-center pt-10">
            <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </div>

          {/* Step 2: Scan */}
          <div className="text-center">
            <img src="/Sussexinlet/Scan.png" alt="Scan" className="w-28 h-28 mx-auto object-contain mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">Scan</h3>
            <p className="text-sm text-gray-500">
              Visit the business and scan their QR flyer. The deal is verified and redeemed instantly.
            </p>
          </div>

          {/* Arrow 2 */}
          <div className="hidden sm:flex items-center justify-center pt-10">
            <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </div>

          {/* Step 3: Save */}
          <div className="text-center">
            <img src="/Sussexinlet/Save.png" alt="Save" className="w-28 h-28 mx-auto object-contain mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">Save</h3>
            <p className="text-sm text-gray-500">
              You save money on things you already buy. Businesses get real customers through the door. Everyone wins.
            </p>
          </div>
        </div>

        {/* Community message */}
        <div className="mt-12 rounded-2xl bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-100 p-6 sm:p-8 text-center">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Strengthening our community</h3>
          <p className="text-sm text-gray-600 max-w-xl mx-auto leading-relaxed">
            Today&apos;s Stash is more than just coupons. It is about bringing Sussex Inlet together.
            When locals support local businesses, the whole community benefits. More foot traffic,
            stronger shops, and a town that looks after its own.
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          EVERY TYPE OF BUSINESS
          ══════════════════════════════════════════════════ */}
      <section className="mx-auto max-w-4xl px-4 py-12 sm:py-14 text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">
          For every local business
        </h2>
        <p className="text-sm text-gray-500 mb-8 max-w-lg mx-auto">
          Not just cafes and restaurants. If you run a business in Sussex Inlet, this is for you.
        </p>
        <div className="flex flex-wrap justify-center gap-2.5">
          {[
            "Cafes", "Restaurants", "Barbers", "Hair Salons", "Beauty & Nails",
            "Retail Shops", "Bars & Pubs", "Takeaway", "Bakeries", "Mechanics",
            "Bait & Tackle", "Toy Stores", "Pet Shops", "Florists", "Gyms & Fitness",
            "Day Spas", "Clothing Stores", "Gift Shops", "Surf Shops", "Pizza Shops",
            "Fish & Chips", "Ice Cream", "Bottle Shops", "Newsagents", "Pharmacies",
            "And more...",
          ].map((cat) => (
            <span
              key={cat}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${cat === "And more..."
                ? "bg-emerald-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700"
                }`}
            >
              {cat}
            </span>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          HOW IT WORKS
          ══════════════════════════════════════════════════ */}
      <section className="bg-gray-50 py-14">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-center mb-10">
            How it works
          </h2>

          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { n: "1", title: "Choose your role", desc: "Business or consumer. Sign up for free in 60 seconds.", color: "bg-emerald-500" },
              { n: "2", title: "Get instant access", desc: "Businesses post deals. Consumers start saving. Simple.", color: "bg-blue-500" },
              { n: "3", title: "Enjoy 6 months free", desc: "Use Today's Stash across Sussex Inlet at zero cost.", color: "bg-purple-500" },
            ].map((step) => (
              <div key={step.n} className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 text-center">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${step.color} text-white text-xl font-bold mb-4`}>
                  {step.n}
                </div>
                <h3 className="text-lg font-bold mb-1">{step.title}</h3>
                <p className="text-sm text-gray-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          ABOUT CARDS
          ══════════════════════════════════════════════════ */}
      <section className="mx-auto max-w-4xl px-4 py-14">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-6">
            <h3 className="text-lg font-bold text-emerald-700 mb-2">Why Sussex Inlet?</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              A tight knit town full of local cafes, takeaways, salons, and
              services. Exactly the kind of community that benefits most from
              digital coupons. We want to prove the model here first, then take it
              national.
            </p>
          </div>
          <div className="rounded-2xl bg-blue-50 border border-blue-100 p-6">
            <h3 className="text-lg font-bold text-blue-700 mb-2">Backed by experience</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Today&apos;s Stash is built by the team behind Urban Promotions, who
              have helped Australian communities save for over 20 years. We know
              what works for small towns and we are building the next generation
              of it.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          FINAL CTA
          ══════════════════════════════════════════════════ */}
      <section className="bg-emerald-500 py-14">
        <div className="mx-auto max-w-3xl px-4 text-center text-white">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">
            Ready to claim your free spot?
          </h2>
          <p className="text-emerald-100 mb-8 max-w-lg mx-auto">
            Once the spots fill, this offer closes and standard pricing begins.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <a
              href="/merchant?area=sussex-inlet"
              className="inline-flex items-center justify-center rounded-full bg-white hover:bg-gray-50 px-8 py-4 text-base font-bold text-emerald-600 shadow-xl transition-all hover:scale-[1.02] active:scale-[0.97]"
            >
              Claim My Free Business Spot
            </a>
            <button
              type="button"
              onClick={handleConsumerClick}
              className="inline-flex items-center justify-center rounded-full border-2 border-white/40 bg-white/10 hover:bg-white/20 px-8 py-4 text-base font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.97]"
            >
              Claim My Free Consumer Spot
            </button>
          </div>
        </div>
      </section>

      {/* ── Not in Sussex Inlet? ───────────────────────── */}
      <section className="bg-gray-50 py-10">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <p className="text-sm text-gray-500 mb-3">
            <span className="font-bold text-gray-700">Not in Sussex Inlet?</span>{" "}
            Join the waiting list for your area. The first 100 consumers in each new town get 6 months free at launch.
          </p>
          <a
            href="/waitlist"
            className="inline-flex items-center justify-center rounded-full bg-gray-900 hover:bg-gray-800 px-6 py-2.5 text-sm font-bold text-white transition"
          >
            Join the waiting list
          </a>
        </div>
      </section>

      {/* ── footer ─────────────────────────────────────── */}
      <footer className="py-6 text-center text-[12px] text-gray-400">
        Today&apos;s Stash by Urban Promotions{" "}
        <a href="/about" className="underline hover:text-gray-600 transition">About</a>{" "}
        <a href="/support" className="underline hover:text-gray-600 transition">Support</a>
      </footer>
    </main>
  );
}
