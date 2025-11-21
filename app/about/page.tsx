/* eslint-disable @next/next/no-img-element */
// app/about/page.tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import LogoBannerDynamic from "@/components/LogoBannerDynamic";
import HowItWorksSection from "@/components/HowItWorksSection";

/** ---------- Controls ---------- */
const HERO_LOGO_WIDTH = 220;

/** ---------- Assets ---------- */
const CHEST_LOGO_URL =
  "https://ufxmucwtywfavsmorkpr.supabase.co/storage/v1/object/public/LOGO/todays%20stash%20logo%20chest%20only.png";
const URBAN_CARD_URL =
  "https://ufxmucwtywfavsmorkpr.supabase.co/storage/v1/object/public/LOGO/Urban%20promotion%20card.png";

export const metadata: Metadata = {
  title: "Today’s Stash — Local deals, unlocked.",
  description:
    "Save at the places you already love. Today’s Stash connects locals with exclusive in-store deals, from the creators of Urban Promotions®.",
};

export default function AboutPage() {
  return (
    <div className="relative isolate overflow-hidden bg-[#0A0F13] text-white">
      {/* Background scaffold */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_700px_at_0%_0%,rgba(34,197,94,0.32),transparent_60%),radial-gradient(1000px_600px_at_100%_100%,rgba(15,23,42,0.9),transparent_55%),linear-gradient(to_bottom,rgba(15,23,42,0.4),rgba(15,23,42,1))]"
      />

      <main className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        {/* HERO */}
        <section className="grid gap-10 pt-6 pb-10 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-emerald-300 ring-1 ring-emerald-400/40 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Local deals • Verified in-store
            </div>

            <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              Save more at the places{" "}
              <span className="text-emerald-400">you already love.</span>
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
              Today’s Stash is your local shortcut to real, in-store savings –
              built by the team behind{" "}
              <span className="font-semibold text-white">
                Urban Promotions®
              </span>
              , one of Australia’s most successful local coupon programs.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/consumer"
                className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(16,185,129,0.45)] transition hover:bg-emerald-400 hover:shadow-[0_0_32px_rgba(16,185,129,0.6)]"
              >
                View deals in your area
              </Link>

              <Link
                href="/merchant"
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/90 transition hover:border-white/30 hover:bg-white/10"
              >
                For businesses
              </Link>

              <Link
                href="/waitlist"
                className="text-xs font-medium text-white/65 underline-offset-4 hover:text-white hover:underline"
              >
                Join the waiting list for your town
              </Link>
            </div>

            <dl className="mt-7 grid max-w-md grid-cols-3 gap-4 text-[11px] text-white/65 sm:text-xs">
              <div>
                <dt className="font-semibold text-white">20+ years</dt>
                <dd>Helping Aussies save locally.</dd>
              </div>
              <div>
                <dt className="font-semibold text-white">10,000+</dt>
                <dd>Businesses supported with promotions.</dd>
              </div>
              <div>
                <dt className="font-semibold text-white">Millions</dt>
                <dd>In coupon value distributed nationwide.</dd>
              </div>
            </dl>
          </div>

          <div className="relative flex justify-center md:justify-end">
            <div className="relative w-full max-w-xs rounded-3xl bg-gradient-to-b from-emerald-500/15 via-slate-900 to-slate-900 p-[1px] shadow-[0_0_40px_rgba(16,185,129,0.25)]">
              <div className="rounded-3xl bg-[#050810] px-6 pb-6 pt-7">
                <div className="flex justify-center">
                  <img
                    src={CHEST_LOGO_URL}
                    alt="Today’s Stash chest logo"
                    style={{ width: HERO_LOGO_WIDTH, height: "auto" }}
                    className="pointer-events-none select-none drop-shadow-[0_0_26px_rgba(16,185,129,0.35)]"
                  />
                </div>

                <p className="mt-5 text-center text-xs text-white/70">
                  Tap into exclusive offers at cafés, restaurants, gyms and more
                  around your town. All verified, all local, all win-win.
                </p>

                <div className="mt-5 grid gap-2 text-[11px] text-white/70">
                  <div className="rounded-2xl bg-white/5 px-3 py-2">
                    <div className="flex justify-between">
                      <span>Tonight only • Local bistro</span>
                      <span className="font-semibold text-emerald-300">
                        40% off
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-white/50">
                      Limited tables · Tap redeem &amp; scan at the counter
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/5 px-3 py-2">
                    <div className="flex justify-between">
                      <span>Breakfast café • Weekdays</span>
                      <span className="font-semibold text-emerald-300">
                        2-for-1
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-white/50">
                      Perfect for locals and regulars
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/15 blur-3xl"
            />
          </div>
        </section>

        {/* LOGO MARQUEE */}
        <section className="mt-2 border-y border-white/10 py-4">
          <LogoBannerDynamic
            bucket="Logo banner"
            logoHeight={26}
            gap={28}
            speed={40}
            leftToRight
            grayscale
            refreshInterval={120000}
            className="opacity-80"
          />
        </section>

        {/* HOW IT WORKS */}
        <HowItWorksSection />

        {/* ────────────────────────────────
            TRACK RECORD & LEGACY
           ──────────────────────────────── */}
        <section className="mt-16 space-y-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300/80">
                FROM THE CREATORS OF URBAN PROMOTIONS®
              </p>
              <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">
                A trusted history of{" "}
                <span className="text-emerald-300">local savings</span>.
              </h2>
            </div>
            <p className="max-w-md text-xs leading-relaxed text-white/65">
              Today’s Stash is the digital evolution of a proven print program
              that moved millions of dollars into local venues — now rebuilt for
              QR codes, live reporting and a better on-counter experience.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:items-start">
            {/* Left: Story & credibility */}
            <div className="flex h-full flex-col rounded-3xl bg-[#0D1620]/95 px-6 pb-6 pt-6 ring-1 ring-white/10 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                Proven operator, not a prototype
              </p>
              <p className="mt-3 text-sm leading-relaxed text-white/82">
                From 1996 to 2017, our team built and ran{" "}
                <span className="font-semibold">Urban Promotions®</span>, one of
                Australia’s most successful local coupon companies. We connected
                small businesses, national brands and hundreds of thousands of
                households with simple, high-value offers that actually got
                used.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-white/82">
                That experience sits inside Today’s Stash — only now it’s
                delivered via a modern, trackable platform that feels premium
                for consumers and clean for staff to run at the counter.
              </p>

              <div className="mt-5 grid gap-3 text-xs text-white/80 sm:grid-cols-3">
                <div className="rounded-2xl bg-white/5 p-3">
                  <p className="text-[11px] font-semibold text-white">
                    20+ years in-market
                  </p>
                  <p className="mt-1 text-[11px] text-white/70">
                    Deep understanding of what actually fills tables in local
                    communities.
                  </p>
                </div>
                <div className="rounded-2xl bg-white/5 p-3">
                  <p className="text-[11px] font-semibold text-white">
                    10,000+ venues
                  </p>
                  <p className="mt-1 text-[11px] text-white/70">
                    From cafés and family operators through to national chains.
                  </p>
                </div>
                <div className="rounded-2xl bg-white/5 p-3">
                  <p className="text-[11px] font-semibold text-white">
                    Built for this decade
                  </p>
                  <p className="mt-1 text-[11px] text-white/70">
                    Always-on QR codes, live controls and transparent
                    performance data.
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Visual legacy + testimonials */}
            <div className="flex h-full flex-col rounded-3xl bg-[#13202B]/95 p-6 ring-1 ring-white/10 backdrop-blur">
              <h3 className="text-lg font-semibold">Our legacy in one glance</h3>

              <div className="mt-4 flex flex-col gap-4 sm:flex-row">
                <div className="shrink-0">
                  <Image
                    src={URBAN_CARD_URL}
                    alt="Urban Promotions booklet cover"
                    width={220}
                    height={280}
                    unoptimized
                    className="h-auto w-[140px] rounded-xl ring-1 ring-white/18"
                  />
                </div>
                <div className="space-y-3 text-sm leading-relaxed text-white/80">
                  <p>
                    Urban Promotions® connected local businesses with new
                    customers through trusted coupon programs — long before QR
                    codes and apps were mainstream.
                  </p>
                  <p>
                    We saw first-hand how curated, quality offers can change the
                    rhythm of a town: busier mid-week services, higher average
                    spend and repeat local trade.
                  </p>
                  <p className="text-xs text-white/65">
                    Today’s Stash takes that same philosophy and gives it a
                    modern, digital shell that investors, councils and venues
                    can all stand behind.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 text-xs text-white/80 sm:grid-cols-2">
                <blockquote className="rounded-2xl bg-white/6 p-3 ring-1 ring-white/12">
                  “By the end of the first month, I had already made my money
                  back by using the vouchers. From that point on, the savings
                  were enormous!”{" "}
                  <span className="block pt-1 text-[11px] text-white/60">
                    — Rita, Mortlake VIC
                  </span>
                </blockquote>
                <blockquote className="rounded-2xl bg-white/6 p-3 ring-1 ring-white/12">
                  “Urban Promotions vouchers were always interchangeable and
                  easy to use.”{" "}
                  <span className="block pt-1 text-[11px] text-white/60">
                    — Lyle, Narrandera NSW
                  </span>
                </blockquote>
              </div>
            </div>
          </div>
        </section>

        {/* ────────────────────────────────
            SUPPORT & FEEDBACK
           ──────────────────────────────── */}
        <section className="mt-14">
          <div className="rounded-3xl bg-[#0D1620]/95 px-6 py-6 ring-1 ring-white/10 backdrop-blur sm:px-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  SUPPORT & PRODUCT FEEDBACK
                </p>
                <h2 className="mt-2 text-lg font-semibold sm:text-xl">
                  Direct line to the team building Today’s Stash.
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-white/82">
                  If you ever run into an issue — or you see a way we can make
                  the experience sharper for consumers, venues or partners —
                  we’re listening. The product is actively developed and guided
                  by real-world use.
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/72">
                  Every message is read by the core team behind the platform,
                  not an outsourced help desk.
                </p>
              </div>

              <div className="shrink-0 text-right md:text-left lg:text-right">
                <Link
                  href="mailto:support@todaysstash.com"
                  className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_18px_rgba(16,185,129,0.45)] transition hover:bg-emerald-400"
                >
                  Contact support
                </Link>
                <p className="mt-2 text-[11px] text-white/65">
                  Found a bug, got feedback or want to discuss a partnership?
                  Send it through.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ────────────────────────────────
            WHO TODAY’S STASH IS FOR
           ──────────────────────────────── */}
        <section className="mt-14">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                WHO IT’S DESIGNED FOR
              </p>
              <h3 className="mt-2 text-2xl font-semibold sm:text-3xl">
                Aligned value for{" "}
                <span className="text-emerald-300">locals</span>,{" "}
                <span className="text-sky-300">venues</span> and{" "}
                <span className="text-emerald-200">partners</span>.
              </h3>
            </div>
            <p className="max-w-md text-xs leading-relaxed text-white/65">
              The product is intentionally simple on the surface and engineered
              for scale underneath — so it feels effortless to use, but
              credible in a boardroom or investor deck.
            </p>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {/* Consumers */}
            <div className="flex flex-col rounded-3xl bg-[#0D1620]/95 p-5 ring-1 ring-white/10 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
                CONSUMERS
              </p>
              <h4 className="mt-3 text-base font-semibold">
                One “stash” that pays for itself.
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-white/80">
                Locals and visitors unlock a curated set of in-store deals
                across a town — not random coupons or spammy offers.
              </p>
              <ul className="mt-3 space-y-1.5 text-xs text-white/70">
                <li>• Clear value and transparent redemption limits.</li>
                <li>• Premium experience, not a discount book.</li>
                <li>• Built to feel like a membership, not a gimmick.</li>
              </ul>
              <Link
                href="/waitlist"
                className="mt-4 inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-[0_0_14px_rgba(16,185,129,0.45)] transition hover:bg-emerald-400"
              >
                Join the waiting list
              </Link>
            </div>

            {/* Businesses */}
            <div className="flex flex-col rounded-3xl bg-[#0D1620]/95 p-5 ring-1 ring-white/10 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
                BUSINESSES
              </p>
              <h4 className="mt-3 text-base font-semibold">
                More full tables, controlled margins.
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-white/80">
                Venues decide when their offers apply, how often they can be
                used and what “quiet times” they want to target.
              </p>
              <ul className="mt-3 space-y-1.5 text-xs text-white/70">
                <li>• QR + PIN flow that fits neatly into service.</li>
                <li>• Reporting on redemptions and new customers.</li>
                <li>• No need for complex marketing tools or new hardware.</li>
              </ul>
              <Link
                href="/merchant"
                className="mt-4 inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-[0_0_14px_rgba(16,185,129,0.45)] transition hover:bg-emerald-400"
              >
                Register as a business
              </Link>
            </div>

            {/* Councils / Partners / Investors */}
            <div className="flex flex-col rounded-3xl bg-[#0D1620]/95 p-5 ring-1 ring-white/10 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">
                COUNCILS & PARTNERS
              </p>
              <h4 className="mt-3 text-base font-semibold">
                A structured, town-level program.
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-white/80">
                Today’s Stash can be rolled out town by town, giving regions a
                clear, trackable way to support local business ecosystems.
              </p>
              <ul className="mt-3 space-y-1.5 text-xs text-white/70">
                <li>• Clean data on participation and customer behaviour.</li>
                <li>• Simple narrative for funding bodies and stakeholders.</li>
                <li>• Scalable blueprint that can extend beyond one town.</li>
              </ul>
              <p className="mt-4 text-[11px] text-white/60">
                To discuss pilots, partnerships or investment, reach us at{" "}
                <a
                  href="mailto:adrian@todaysstash.com.au"
                  className="underline underline-offset-2 hover:text-white"
                >
                  adrian@todaysstash.com.au
                </a>
                .
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
