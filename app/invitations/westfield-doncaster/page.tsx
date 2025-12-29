"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function WestfieldDoncasterBetaPage() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);

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
      router.push("/signup?role=consumer&area=westfield-doncaster");
    }
  };

  return (
    <main className="relative min-h-screen bg-[#05090C] text-white overflow-x-hidden">
      {/* Soft glows */}
      <div className="pointer-events-none absolute -top-40 -left-24 h-[420px] w-[420px] rounded-full bg-red-500/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-[-80px] h-[460px] w-[460px] rounded-full bg-orange-500/10 blur-3xl" />

      <section className="relative mx-auto max-w-5xl px-4 pt-12 pb-16 sm:pt-16 sm:pb-20">
        {/* Hero badge + location button */}
        <div className="flex flex-col gap-3 mb-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[11px] font-medium text-white/80 ring-1 ring-white/10">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
              Today&apos;s Stash • Founding Beta
            </div>

            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("join")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="inline-flex items-center rounded-full border border-red-400/60 bg-red-500/10 px-4 py-1.5 text-[12px] font-semibold text-red-100 shadow-[0_0_12px_rgba(239,68,68,0.35)] hover:bg-red-500/20 transition"
            >
              Westfield Doncaster • Founding location
            </button>
          </div>

          <p className="text-[11px] sm:text-xs text-white/55 sm:max-w-xs sm:text-right">
            Beta access is{" "}
            <span className="font-semibold text-red-300">free</span> for
            Westfield Doncaster until capacity is reached.
          </p>
        </div>

        {/* Hero copy */}
        <div className="space-y-4 max-w-3xl">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight">
            A special invitation to{" "}
            <span className="text-red-400">Westfield Doncaster</span>.
          </h1>
          <p className="text-sm sm:text-base text-white/70">
            After decades of helping Australians save with Urban Promotions,
            we&apos;re launching something new —{" "}
            <span className="font-semibold text-white">Today&apos;s Stash</span>.
            And we&apos;re bringing it to one of Australia&apos;s busiest retail
            destinations first.
          </p>
          <p className="text-sm sm:text-base text-white/70">
            For a strictly limited beta period,{" "}
            <span className="font-semibold text-red-300">
              consumers and businesses at Westfield Doncaster pay $0
            </span>{" "}
            to access the platform. No subscriptions. No commissions.
          </p>
        </div>

        {/* Hero CTAs */}
        <div
          className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
          id="join"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={handleConsumerClick}
              className="inline-flex items-center justify-center rounded-full bg-red-500 hover:bg-red-400 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_22px_rgba(239,68,68,0.7)] transition-transform active:scale-[0.97]"
            >
              Join as a consumer – FREE
            </button>
            <a
              href="/merchant?area=westfield-doncaster"
              className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition"
            >
              Register your business – FREE
            </a>
          </div>

          <p className="text-xs text-white/55 sm:ml-1">
            Limited beta spots. Free access closes once capacity is reached.
          </p>
        </div>

        {/* Content grid */}
        <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] items-start">
          {/* Left column */}
          <div className="space-y-5">
            <h2 className="text-xl sm:text-2xl font-semibold">
              Help shape Today&apos;s Stash before it launches nationwide.
            </h2>
            <p className="text-sm sm:text-base text-white/70">
              We&apos;re inviting shoppers and retailers at Westfield Doncaster
              to help refine the platform. In return, you&apos;ll lock in{" "}
              <span className="font-semibold text-red-300">
                completely free beta access
              </span>{" "}
              on terms that won&apos;t be repeated.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 sm:p-5">
                <p className="text-xs font-semibold text-red-300 mb-1.5 uppercase tracking-[0.16em]">
                  If you&apos;re a shopper
                </p>
                <ul className="space-y-1.5 text-xs sm:text-[13px] text-white/80">
                  <li>• Permanent free beta access</li>
                  <li>• Exclusive retail & dining offers</li>
                  <li>• First access to new deals</li>
                  <li>• Help shape the experience</li>
                </ul>
              </div>

              <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 sm:p-5">
                <p className="text-xs font-semibold text-red-300 mb-1.5 uppercase tracking-[0.16em]">
                  If you&apos;re a business
                </p>
                <ul className="space-y-1.5 text-xs sm:text-[13px] text-white/80">
                  <li>• Unlimited offers during beta</li>
                  <li>• Drive foot traffic during quiet periods</li>
                  <li>• No fees, no commission</li>
                  <li>• Become a founding venue</li>
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-red-500/40 bg-red-500/5 px-4 py-3 text-xs text-red-50">
              <p className="font-semibold mb-1">
                Strictly limited Westfield Doncaster beta
              </p>
              <p className="text-white/80">
                To maintain quality, places are capped. When we&apos;re full,{" "}
                <span className="font-semibold">
                  free access closes for this location.
                </span>
              </p>
            </div>
          </div>

          {/* Right column */}
          <aside className="space-y-4">
            <div className="rounded-2xl bg-[#0B1215] ring-1 ring-white/10 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-red-300/80 mb-3">
                How it works
              </p>
              <ol className="space-y-3 text-sm text-white/80">
                <li>
                  <span className="font-semibold text-red-300">1.</span> Join as
                  a shopper or business for free.
                </li>
                <li>
                  <span className="font-semibold text-red-300">2.</span> Get
                  access to early Westfield Doncaster offers.
                </li>
                <li>
                  <span className="font-semibold text-red-300">3.</span> Use the
                  app and help us improve it.
                </li>
              </ol>
            </div>

            <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
              <p className="text-xs font-semibold text-red-300 mb-1.5">
                Why Westfield Doncaster?
              </p>
              <p className="text-xs sm:text-[13px] text-white/75">
                One of Australia&apos;s busiest retail hubs — the perfect place
                to prove how modern digital offers drive real foot traffic at
                scale.
              </p>
            </div>
          </aside>
        </div>

        {/* Bottom CTAs */}
        <div className="mt-12 border-t border-white/10 pt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <span className="text-xs text-white/60">
            Ready to join the founding Westfield Doncaster beta?
          </span>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={handleConsumerClick}
              className="inline-flex items-center justify-center rounded-full bg-red-500 hover:bg-red-400 px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_0_16px_rgba(239,68,68,0.6)] transition-transform active:scale-[0.97]"
            >
              Join as consumer – FREE
            </button>
            <a
              href="/merchant?area=westfield-doncaster"
              className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/5 px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-white/10 transition"
            >
              Register your business – FREE
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
