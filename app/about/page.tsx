/* eslint-disable @next/next/no-img-element */
// app/about/page.tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import LogoBannerDynamic from "@/components/LogoBannerDynamic";

/** ---------- Controls ---------- */
const HERO_LOGO_WIDTH = 215;

/** ---------- Assets ---------- */
const CHEST_LOGO_URL =
  "https://ufxmucwtywfavsmorkpr.supabase.co/storage/v1/object/public/LOGO/todays%20stash%20logo%20chest%20only.png";
const URBAN_CARD_URL =
  "https://ufxmucwtywfavsmorkpr.supabase.co/storage/v1/object/public/LOGO/Urban%20promotion%20card.png";

export const metadata: Metadata = {
  title: "About — Today’s Stash",
  description:
    "From the creators of Urban Promotions® — a modern, digital way to discover and redeem local deals.",
};

export default function AboutPage() {
  return (
    <div className="relative isolate overflow-hidden bg-[#0A0F13]">
      {/* --- Subtle, dark gradient scaffold (nearly invisible) --- */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_700px_at_10%_-10%,rgba(18,29,41,0.35),transparent_60%),radial-gradient(1000px_600px_at_110%_110%,rgba(10,18,24,0.45),transparent_55%),linear-gradient(to_bottom,rgba(0,0,0,0)_0%,rgba(0,0,0,0.25)_100%)]"
      />

      {/* --- Ultra-subtle ambient glows (blue bias + faint money green) --- */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {/* deep blue corner washes */}
        <div className="absolute -top-28 -left-24 h-[360px] w-[360px] rounded-full bg-[#0B1220]/25 blur-[140px] mix-blend-soft-light" />
        <div className="absolute -bottom-24 -right-20 h-[420px] w-[420px] rounded-full bg-[#0C1524]/22 blur-[160px] mix-blend-soft-light" />
        {/* whisper of emerald to tie into money theme */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[520px] w-[520px] rounded-full bg-emerald-500/6 blur-[180px] mix-blend-soft-light" />
      </div>

      <main className="relative z-10 mx-auto max-w-5xl px-4 py-10 text-[#E8FFF3]">
        {/* Partner / Logo marquee */}
        <LogoBannerDynamic
          bucket="Logo banner"
          logoHeight={26}
          gap={28}
          speed={40}
          leftToRight
          grayscale
          refreshInterval={120000}
          className="py-4 border-b border-white/10 mb-6"
        />

        {/* HERO */}
        <header className="text-center">
          <div className="mx-auto mb-5 flex justify-center">
            <img
              src={CHEST_LOGO_URL}
              alt="Today’s Stash chest logo"
              style={{ width: HERO_LOGO_WIDTH, height: "auto" }}
              className="select-none pointer-events-none drop-shadow-[0_0_24px_rgba(16,185,129,0.18)]" // emerald glow
            />
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Today’s Stash
          </h1>
          <p className="mt-3 text-sm sm:text-base text-white/75">
            From the creators of{" "}
            <span className="font-semibold text-white">Urban Promotions®</span>{" "}
            – trusted by Australians for over 20 years.
          </p>
        </header>

        {/* INTRO */}
        <section className="mt-10 rounded-2xl bg-[#0D1620]/90 ring-1 ring-white/10 p-5 sm:p-6 backdrop-blur-[2px]">
          <p className="text-sm sm:text-base leading-relaxed text-white/85">
            From 1996 to 2017, our team built and ran{" "}
            <span className="font-semibold">Urban Promotions®</span>, one of
            Australia’s most successful local coupon companies. With hundreds of
            thousands of happy customers and thousands of participating
            businesses nationwide, we helped local communities save money and
            helped small businesses grow.
          </p>
          <p className="mt-4 text-sm sm:text-base leading-relaxed text-white/85">
            Now, we’re back — with a new name, a new platform, and even bigger
            savings. <span className="font-semibold">Welcome to Today’s Stash.</span>
          </p>
        </section>

        {/* TWO-COLUMN */}
        <section className="mt-8 grid gap-5 sm:grid-cols-2 items-stretch">
          <div className="h-full rounded-2xl bg-[#13202B]/90 ring-1 ring-white/10 p-5 sm:p-6 backdrop-blur-[2px]">
            <h2 className="text-xl font-bold">A New Era of Savings</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/80">
              We’re evolving that trusted legacy for a new generation. Today’s
              Stash uses modern technology to deliver the same proven value —
              but instantly, digitally, and locally.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-white/85">
              <li>• Discover exclusive local offers right on your phone</li>
              <li>• Share and redeem deals with ease</li>
              <li>• Support your favorite local businesses ❤️</li>
            </ul>
            <p className="mt-4 text-sm leading-relaxed text-white/70">
              Our mission hasn’t changed — just the way we deliver it. We’re
              still about connecting people with local businesses, helping
              communities thrive, and making savings simple.
            </p>

            <h3 className="mt-8 text-xl font-bold">Our Promise</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/85">
              To connect local people with local businesses — through great
              deals, honest value, and a platform that truly benefits both
              sides.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-white/80">
              Join us as we build the next chapter of local savings in
              Australia. Because great deals — and great businesses — should
              always be right around the corner.
            </p>
          </div>

          <div className="h-full rounded-2xl bg-[#13202B]/90 ring-1 ring-white/10 p-5 sm:p-6 backdrop-blur-[2px]">
            <h2 className="text-xl font-bold">Our Legacy</h2>

            <div className="mt-3">
              <Image
                src={URBAN_CARD_URL}
                alt="Urban Promotions booklet cover"
                width={180}
                height={270}
                unoptimized
                className="float-left mr-4 mb-2 w-[92px] sm:w-[108px] md:w-[120px] h-auto rounded-lg ring-1 ring-white/10"
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

            <div className="mt-4 space-y-3">
              <blockquote className="rounded-xl bg-white/5 ring-1 ring-white/10 p-3 text-xs text-white/80">
                “By the end of the first month, I had already made my money back
                by using the vouchers. From that point on, the savings were
                enormous!”{" "}
                <span className="text-white/60">— Rita, Mortlake VIC</span>
              </blockquote>
              <blockquote className="rounded-xl bg-white/5 ring-1 ring-white/10 p-3 text-xs text-white/80">
                “The best thing about Urban Promotions vouchers is that they are
                interchangeable. There are so many great choices of local
                businesses that even if I don’t have a use for one voucher, I
                can give it to someone who does.”{" "}
                <span className="text-white/60">— Lyle, Narrandera NSW</span>
              </blockquote>
            </div>
          </div>
        </section>

        {/* GET INVOLVED */}
        <section className="mt-8 grid gap-5 sm:grid-cols-2">
          <div className="rounded-2xl bg-[#0D1620]/90 ring-1 ring-white/10 p-5 sm:p-6 backdrop-blur-[2px]">
            <h3 className="text-lg font-bold">For Consumers</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/80">
              Join the waiting list for your town to be among the first to
              access exclusive offers.
            </p>
            <Link
              href="/waitlist"
              className="mt-4 inline-flex items-center justify-center rounded-md px-4 py-2 font-semibold bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_0_8px_rgba(16,185,129,0.32)] transition"
            >
              Join the waiting list
            </Link>
          </div>

          <div className="rounded-2xl bg-[#0D1620]/90 ring-1 ring-white/10 p-5 sm:p-6 backdrop-blur-[2px]">
            <h3 className="text-lg font-bold">For Businesses</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/80">
              Register your interest to feature your business in Today’s Stash
              and start attracting new customers.
            </p>
            <Link
              href="/merchant"
              className="mt-4 inline-flex items-center justify-center rounded-md px-4 py-2 font-semibold bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_0_8px_rgba(16,185,129,0.32)] transition"
            >
              Register your interest
            </Link>
          </div>
        </section>

        <div className="h-6" />
      </main>
    </div>
  );
}
