"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function SussexInletBetaPage() {
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
      router.push("/signup?role=consumer&area=sussex-inlet");
    }
  };

  return (
    <main className="relative min-h-screen bg-[#05090C] text-white overflow-x-hidden">
      {/* Soft glows */}
      <div className="pointer-events-none absolute -top-40 -left-24 h-[420px] w-[420px] rounded-full bg-emerald-500/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-[-80px] h-[460px] w-[460px] rounded-full bg-blue-500/10 blur-3xl" />

      <section className="relative mx-auto max-w-5xl px-4 pt-12 pb-16 sm:pt-16 sm:pb-20">
        {/* Hero badge + Sussex button */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[11px] font-medium text-white/80 ring-1 ring-white/10">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Today&apos;s Stash • Founding Beta
            </div>

            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("join")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="inline-flex items-center rounded-full border border-emerald-400/60 bg-emerald-500/10 px-4 py-1.5 text-[12px] font-semibold text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.35)] hover:bg-emerald-500/20 transition"
            >
              Sussex Inlet • Founding town
            </button>
          </div>

          <p className="text-[11px] sm:text-xs text-white/55 max-w-xs text-right">
            Beta access is{" "}
            <span className="font-semibold text-emerald-300">free</span> for
            Sussex Inlet until we hit our internal cap.
          </p>
        </div>

        {/* Hero copy */}
        <div className="space-y-4 max-w-3xl">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight">
            A special invitation to{" "}
            <span className="text-emerald-400">Sussex Inlet</span>.
          </h1>
          <p className="text-sm sm:text-base text-white/70">
            After 20+ years helping Australian communities save with Urban
            Promotions, we&apos;re launching something new —{" "}
            <span className="font-semibold text-white">Today&apos;s Stash</span>.
            And we want <span className="font-semibold">Sussex Inlet</span> to be
            our founding town.
          </p>
          <p className="text-sm sm:text-base text-white/70">
            For a strictly limited beta period,{" "}
            <span className="font-semibold text-emerald-300">
              consumers and businesses in Sussex Inlet pay $0
            </span>{" "}
            to access the platform. No subscription fees, no listing fees, no
            commissions.
          </p>
        </div>

        {/* Hero CTAs */}
        <div className="mt-8 flex flex-wrap gap-3" id="join">
          <button
            type="button"
            onClick={handleConsumerClick}
            className="inline-flex items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-400 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_22px_rgba(16,185,129,0.7)] transition-transform active:scale-[0.97]"
          >
            Join as a consumer – FREE
          </button>
          <a
            href="/merchant?area=sussex-inlet"
            className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition"
          >
            Register your business – FREE
          </a>
          <p className="w-full text-xs text-white/55 sm:ml-1 sm:w-auto">
            Limited beta spots. Once we reach capacity, free access closes.
          </p>
        </div>

        {/* Story / benefits section */}
        <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] items-start">
          {/* Story-driven left column */}
          <div className="space-y-5">
            <h2 className="text-xl sm:text-2xl font-semibold">
              Help us shape Today&apos;s Stash before it launches nationally.
            </h2>
            <p className="text-sm sm:text-base text-white/70">
              We&apos;re looking for real people and real local businesses to
              help us perfect the platform. In return for your feedback and
              participation, you&apos;ll lock in{" "}
              <span className="font-semibold text-emerald-300">
                completely free beta access
              </span>{" "}
              on terms that may never be offered again.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Consumers card */}
              <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 sm:p-5 shadow-[0_18px_40px_rgba(0,0,0,0.7)]">
                <p className="text-xs font-semibold text-emerald-300 mb-1.5 uppercase tracking-[0.16em]">
                  If you&apos;re a consumer
                </p>
                <ul className="space-y-1.5 text-xs sm:text-[13px] text-white/80">
                  <li>• Permanent free access for the beta community</li>
                  <li>• Thousands of dollars in local savings</li>
                  <li>• First look at exclusive offers in Sussex Inlet</li>
                  <li>• Help shape the app you&apos;ll use every week</li>
                </ul>
              </div>

              {/* Businesses card */}
              <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 sm:p-5">
                <p className="text-xs font-semibold text-emerald-300 mb-1.5 uppercase tracking-[0.16em]">
                  If you&apos;re a business
                </p>
                <ul className="space-y-1.5 text-xs sm:text-[13px] text-white/80">
                  <li>• Post unlimited offers with zero platform fees</li>
                  <li>• Attract new locals during quiet times</li>
                  <li>• No commission, no ad spend, no risk</li>
                  <li>• Partner with us as a founding venue</li>
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-50">
              <p className="font-semibold mb-1">
                Strictly limited Sussex Inlet beta
              </p>
              <p className="text-white/80">
                To keep things high quality, we&apos;re only accepting a capped
                number of consumers and businesses. When we&apos;re full,{" "}
                <span className="font-semibold">
                  the free Sussex Inlet offer closes.
                </span>
              </p>
            </div>
          </div>

          {/* Right column: simple step cards / social proof */}
          <aside className="space-y-4">
            <div className="rounded-2xl bg-[#0B1215] ring-1 ring-white/10 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
              <p className="text-xs uppercase tracking-[0.18em] text-emerald-300/80 mb-3">
                How it works
              </p>
              <ol className="space-y-3 text-sm text-white/80">
                <li>
                  <span className="font-semibold text-emerald-300">1.</span>{" "}
                  Choose whether you&apos;re a consumer or a business and
                  register for free.
                </li>
                <li>
                  <span className="font-semibold text-emerald-300">2.</span>{" "}
                  We&apos;ll invite you into the beta with early Sussex Inlet
                  offers and simple instructions.
                </li>
                <li>
                  <span className="font-semibold text-emerald-300">3.</span>{" "}
                  Use Today&apos;s Stash in your day-to-day life — and tell us
                  what you love and what we can improve.
                </li>
              </ol>
            </div>

            <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
              <p className="text-xs font-semibold text-emerald-300 mb-1.5">
                Why Sussex Inlet?
              </p>
              <p className="text-xs sm:text-[13px] text-white/75">
                We&apos;ve helped local towns across Australia save for decades.
                Sussex Inlet is the perfect community to showcase how modern
                digital coupons can drive real foot traffic to local venues —
                from cafés and takeaways to hair, beauty, recreation and more.
              </p>
            </div>

            <div className="rounded-2xl bg-[#020712] ring-1 ring-white/10 p-4 flex flex-col gap-2">
              <p className="text-[11px] text-white/60">
                <span className="font-semibold text-emerald-300">
                  Future areas:
                </span>{" "}
                Outside Sussex Inlet, the first 100 consumers to join the
                waiting list for their town will receive{" "}
                <span className="font-semibold text-white">
                  6 months free membership
                </span>{" "}
                at launch.
              </p>
              <a
                href="/waitlist"
                className="inline-flex items-center justify-center self-start rounded-full bg-white/10 px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-white/15 transition"
              >
                Join the waiting list for your town
              </a>
            </div>
          </aside>
        </div>

        {/* Bottom CTAs repeated */}
        <div className="mt-12 border-t border-white/10 pt-8 flex flex-wrap items-center gap-3">
          <span className="text-xs text-white/60">
            Ready to be part of the founding Sussex Inlet community?
          </span>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleConsumerClick}
              className="inline-flex items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-400 px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_0_16px_rgba(16,185,129,0.6)] transition-transform active:scale-[0.97]"
            >
              Join as consumer – FREE
            </button>
            <a
              href="/merchant?area=sussex-inlet"
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
