/* eslint-disable @next/next/no-img-element */
// app/page.tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import LogoBannerDynamic from "@/components/LogoBannerDynamic";

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

export default function HomePage() {
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
          {/* Left: copy */}
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

          {/* Right: visual */}
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
                      Limited tables · Show your QR at payment
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/5 px-3 py-2">
                    <div className="flex justify-between">
                      <span>Breakfast café · Weekdays</span>
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

        {/* Partner / Logo marquee */}
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
        <section className="mt-10 space-y-6">
          <header className="max-w-3xl">
            <h2 className="text-xl font-semibold sm:text-2xl">
              How Today’s Stash works
            </h2>
            <p className="mt-2 text-sm text-white/75">
              We connect people with real, in-store offers from local
              businesses. Simple for customers, powerful for venues.
            </p>
          </header>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Discover local offers",
                body: "Browse verified deals in your area – from cafés and restaurants to beauty, fitness, retail and more.",
              },
              {
                title: "Redeem in-store",
                body: "Show your secure, time-limited QR in-store to redeem. No awkward haggling, no surprises.",
              },
              {
                title: "Win-win for everyone",
                body: "You save on your bill while local businesses fill quiet times, reward regulars and attract new customers.",
              },
            ].map((item) => (
              <article
                key={item.title}
                className="group rounded-2xl border border-white/10 bg-white/5 p-4 text-sm backdrop-blur transition hover:-translate-y-1 hover:border-emerald-400/50 hover:bg-white/10"
              >
                <h3 className="text-sm font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-white/75">
                  {item.body}
                </p>
                <div className="mt-4 h-0.5 w-10 rounded-full bg-emerald-400/70 transition group-hover:w-16" />
              </article>
            ))}
          </div>
        </section>

        {/* STORY / LEGACY (INTRO + OUR LEGACY) */}
        <section className="mt-14 grid gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:items-start">
          {/* Intro story */}
          <div className="rounded-3xl bg-[#0D1620]/95 p-6 ring-1 ring-white/10 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
              From the creators of Urban Promotions®
            </p>
            <h2 className="mt-3 text-xl font-semibold">
              A trusted history of local savings.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/80">
              From 1996 to 2017, our team built and ran{" "}
              <span className="font-semibold">Urban Promotions®</span>, one of
              Australia’s most successful local coupon companies. With hundreds
              of thousands of happy customers and thousands of participating
              businesses nationwide, we helped local communities save money and
              helped small businesses grow.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-white/85">
              Now, we’re back — with a new name, a new platform, and even bigger
              savings.{" "}
              <span className="font-semibold">Welcome to Today’s Stash.</span>
            </p>

            <div className="mt-5 grid gap-3 text-xs text-white/70 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/5 p-3">
                <p className="font-semibold text-white">
                  100% coupon based, no tricks.
                </p>
                <p className="mt-1 text-[11px] text-white/65">
                  Real offers people loved to use – now reimagined for mobile.
                </p>
              </div>
              <div className="rounded-2xl bg-white/5 p-3">
                <p className="font-semibold text-white">
                  Built for local businesses.
                </p>
                <p className="mt-1 text-[11px] text-white/65">
                  From family-run shops to national brands, we understand what
                  works.
                </p>
              </div>
              <div className="rounded-2xl bg-white/5 p-3">
                <p className="font-semibold text-white">
                  Designed for this decade.
                </p>
                <p className="mt-1 text-[11px] text-white/65">
                  Time-limited QR codes, live offers and real-time control.
                </p>
              </div>
            </div>
          </div>

          {/* Legacy block with image + quotes */}
          <div className="rounded-3xl bg-[#13202B]/95 p-6 ring-1 ring-white/10 backdrop-blur">
            <h3 className="text-lg font-semibold">Our legacy</h3>

            <div className="mt-4">
              <Image
                src={URBAN_CARD_URL}
                alt="Urban Promotions booklet cover"
                width={200}
                height={280}
                unoptimized
                className="float-left mr-4 mb-3 h-auto w-[110px] rounded-lg ring-1 ring-white/15"
              />
              <p className="text-sm leading-relaxed text-white/80">
                Urban Promotions® (1996–2017) connected local businesses with
                hundreds of thousands of customers through trusted coupon
                programs — from family-run shops to national brands.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-white/80">
                Through coupon booklets and marketing support, we helped over{" "}
                <span className="font-semibold">10,000</span> businesses reach
                new audiences. Consumers loved Urban Promotions because the
                offers were real and risk-free — free coupons, no strings
                attached.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-white/75">
                We distributed hundreds of millions of dollars in free coupon
                offers, generating hundreds of millions in new revenue for
                Australian businesses — a true win-win.
              </p>
              <div className="clear-both" />
            </div>

            <div className="mt-4 space-y-3 text-xs text-white/80">
              <blockquote className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/12">
                “By the end of the first month, I had already made my money back
                by using the vouchers. From that point on, the savings were
                enormous!”{" "}
                <span className="text-white/60">— Rita, Mortlake VIC</span>
              </blockquote>
              <blockquote className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/12">
                “The best thing about Urban Promotions vouchers is that they are
                interchangeable. There are so many great choices of local
                businesses that even if I don’t have a use for one voucher, I
                can give it to someone who does.”{" "}
                <span className="text-white/60">— Lyle, Narrandera NSW</span>
              </blockquote>
            </div>
          </div>
        </section>

        {/* NEW ERA + PROMISE (rest of About content) */}
        <section className="mt-14 grid gap-6 md:grid-cols-2">
          <article className="rounded-3xl bg-[#13202B]/95 p-6 ring-1 ring-white/10 backdrop-blur">
            <h2 className="text-lg font-semibold">A new era of savings</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/80">
              We’re evolving that trusted legacy for a new generation. Today’s
              Stash uses modern technology to deliver the same proven value —
              but instantly, digitally, and locally.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-white/85">
              <li>• Discover exclusive local offers right on your phone</li>
              <li>• Share and redeem deals with ease</li>
              <li>• Support your favorite local businesses ❤️</li>
            </ul>
            <p className="mt-4 text-sm leading-relaxed text-white/75">
              Our mission hasn’t changed — just the way we deliver it. We’re
              still about connecting people with local businesses, helping
              communities thrive, and making savings simple.
            </p>
          </article>

          <article className="rounded-3xl bg-[#13202B]/95 p-6 ring-1 ring-white/10 backdrop-blur">
            <h2 className="text-lg font-semibold">Our promise</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/80">
              To connect local people with local businesses — through great
              deals, honest value, and a platform that truly benefits both
              sides.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-white/80">
              Join us as we build the next chapter of local savings in
              Australia. Because great deals — and great businesses — should
              always be right around the corner.
            </p>
          </article>
        </section>

        {/* WHO IT'S FOR (For Consumers / For Businesses) */}
        <section className="mt-14 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl bg-[#0D1620]/95 p-6 ring-1 ring-white/10 backdrop-blur">
            <h3 className="text-lg font-semibold">For consumers</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/80">
              Join the waiting list for your town to be among the first to
              access exclusive offers.
            </p>
            <Link
              href="/waitlist"
              className="mt-4 inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_16px_rgba(16,185,129,0.45)] transition hover:bg-emerald-400"
            >
              Join the waiting list
            </Link>
          </div>

          <div className="rounded-3xl bg-[#0D1620]/95 p-6 ring-1 ring-white/10 backdrop-blur">
            <h3 className="text-lg font-semibold">For businesses</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/80">
              Register your interest to feature your business in Today’s Stash
              and start attracting new customers.
            </p>
            <Link
              href="/merchant"
              className="mt-4 inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_16px_rgba(16,185,129,0.45)] transition hover:bg-emerald-400"
            >
              Register your interest
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

