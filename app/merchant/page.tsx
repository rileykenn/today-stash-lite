/* eslint-disable @next/next/no-img-element */
// app/merchant/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import LogoBannerDynamic from "@/components/LogoBannerDynamic";

export const metadata: Metadata = {
  title: "For Businesses — Today’s Stash",
  description:
    "Turn quiet times into loyal customers with Today’s Stash — a QR-based local offers platform for cafés, salons, gyms, retail and more.",
};

export default function MerchantPage() {
  return (
    <div className="relative isolate overflow-hidden bg-[#05080C] text-white">
      {/* Background gradients */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(1300px_800px_at_10%_-10%,rgba(16,185,129,0.26),transparent_60%),radial-gradient(1100px_760px_at_110%_110%,rgba(37,99,235,0.24),transparent_60%),linear-gradient(to_bottom,rgba(15,23,42,0.95),rgba(3,7,18,0.98))]"
      />

      <main className="relative z-10 mx-auto max-w-5xl px-4 pb-14 pt-10 sm:px-6 lg:px-8">
        {/* Partner banner */}
        <LogoBannerDynamic
          bucket="Logo banner"
          logoHeight={26}
          gap={28}
          speed={40}
          leftToRight
          grayscale
          refreshInterval={120000}
          className="py-4 border-b border-white/10 mb-10"
        />

        {/* HERO: More customers, more often */}
        <section className="grid gap-10 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)] md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300/90">
              For businesses
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.8rem]">
              More customers, more often.
            </h1>
            <p className="mt-4 max-w-xl text-sm sm:text-base text-white/80">
              Today’s Stash helps local businesses turn spare capacity into
              steady revenue. List time-limited in-store offers, fill quiet
              times and bring customers back again and again — without
              discounting your brand to death.
            </p>

            {/* Primary CTA */}
            <div className="mt-7">
              <Link
                href="/venue-register"
                className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-black shadow-[0_0_20px_rgba(16,185,129,0.6)] transition hover:bg-emerald-400"
              >
                Register as a business
              </Link>
            </div>

            {/* Secondary CTAs */}
            <div className="mt-5 flex flex-wrap gap-3 text-xs">
              <Link
                href="/success-stories"
                className="inline-flex items-center rounded-full border border-white/16 bg-white/5 px-3 py-1.5 font-semibold text-white/85 hover:border-emerald-400/70 hover:bg-emerald-500/10"
              >
                Read our success stories
                <span className="ml-1 text-sm">↗</span>
              </Link>
              <Link
                href="/"
                className="inline-flex items-center rounded-full bg-white/5 px-3 py-1.5 font-semibold text-white/80 hover:bg-white/10"
              >
                See the consumer experience
              </Link>
            </div>
          </div>

          {/* Quick stat cards */}
          <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm leading-relaxed text-white/80 backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
              Why businesses partner with us
            </p>
            <ul className="mt-2 space-y-3 text-sm">
              <li>
                <span className="font-semibold text-white">Built for locals</span>{" "}
                – Today’s Stash works for{" "}
                <span className="font-medium">
                  cafés, restaurants, salons, gyms, mechanics, retailers
                </span>{" "}
                and more. Anywhere people spend locally, we can drive foot
                traffic.
              </li>
              <li>
                <span className="font-semibold text-white">Proven model</span> – from
                the creators of Urban Promotions®, which helped over{" "}
                <span className="font-semibold text-white">10,000+</span>{" "}
                Australian businesses fill seats and grow revenue.
              </li>
              <li>
                <span className="font-semibold text-white">Low effort</span> –
                create offers once, let our platform and local marketing do the
                heavy lifting.
              </li>
            </ul>
          </div>
        </section>

        {/* Divider + stat row */}
        <section className="mt-12 border-y border-white/10 py-6 text-xs sm:text-sm">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-white/60">20+ years</p>
              <p className="text-white/80">
                Helping Aussie businesses bring in local customers.
              </p>
            </div>
            <div>
              <p className="text-white/60">10,000+ venues</p>
              <p className="text-white/80">
                Supported through our previous Urban Promotions® programs.
              </p>
            </div>
            <div>
              <p className="text-white/60">A platform for every main street</p>
              <p className="text-white/80">
                Not just food – we’re built for any business with in-store
                customers.
              </p>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS FOR BUSINESSES */}
        <section id="how-it-works" className="mt-12 space-y-10">
          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
              How it works for businesses
            </p>
            <h2 className="mt-2 text-xl font-semibold sm:text-2xl">
              Turn spare capacity into repeat customers.
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-white/80">
              Today’s Stash plugs into the way your business already runs. You
              stay in control of your pricing and capacity — we bring you people
              who want to spend with you in-store.
            </p>
          </header>

          <div className="space-y-10">
            {/* Step 01 */}
            <div className="grid gap-6 rounded-3xl border border-white/10 bg-white/5 p-5 sm:grid-cols-[auto,minmax(0,1fr)] sm:p-7">
              <div className="text-3xl font-semibold text-white/15 sm:text-4xl">
                01
              </div>
              <div>
                <h3 className="text-base font-semibold sm:text-lg">
                  Choose the times you want more customers.
                </h3>
                <p className="mt-2 text-sm text-white/80">
                  Identify your quiet windows — Monday nights, mid-week
                  afternoons, rainy days — and decide how many extra customers
                  you’d like. Today’s Stash lets you structure offers around the
                  capacity you actually have.
                </p>
                <ul className="mt-3 space-y-1.5 text-sm text-white/80">
                  <li>• Highlight off-peak times without undercutting busy periods.</li>
                  <li>• Run offers only on the days that make sense for you.</li>
                  <li>• Pause or adjust anytime as your business changes.</li>
                </ul>
              </div>
            </div>

            {/* Step 02 */}
            <div className="grid gap-6 rounded-3xl border border-white/10 bg-white/5 p-5 sm:grid-cols-[auto,minmax(0,1fr)] sm:p-7">
              <div className="text-3xl font-semibold text-white/15 sm:text-4xl">
                02
              </div>
              <div>
                <h3 className="text-base font-semibold sm:text-lg">
                  Create offers that attract the right customers.
                </h3>
                <p className="mt-2 text-sm text-white/80">
                  Together we design in-store offers that feel generous to
                  customers but sustainable for your margins — from “2-for-1
                  mains” to “$20 off cut and colour” or “Free PT session for new
                  members”.
                </p>
                <ul className="mt-3 space-y-1.5 text-sm text-white/80">
                  <li>• Offers are time-limited and redeemed via secure QR codes.</li>
                  <li>• You can cap the total redemptions to protect capacity.</li>
                  <li>• All offers are verified and presented clearly to customers.</li>
                </ul>
              </div>
            </div>

            {/* Step 03 */}
            <div className="grid gap-6 rounded-3xl border border-white/10 bg-white/5 p-5 sm:grid-cols-[auto,minmax(0,1fr)] sm:p-7">
              <div className="text-3xl font-semibold text-white/15 sm:text-4xl">
                03
              </div>
              <div>
                <h3 className="text-base font-semibold sm:text-lg">
                  Customers discover you, redeem in-store, and come back.
                </h3>
                <p className="mt-2 text-sm text-white/80">
                  Locals browse Today’s Stash on their phone, favourite your
                  business and redeem offers at your counter with a
                  time-limited QR code. You simply scan or confirm the code and
                  serve them like any other customer.
                </p>
                <ul className="mt-3 space-y-1.5 text-sm text-white/80">
                  <li>• No physical coupons, no extra hardware, no complex POS changes.</li>
                  <li>• You see which offers drive the best revenue and repeat visits.</li>
                  <li>• Turn first-time customers into regulars with follow-up offers.</li>
                </ul>
              </div>
            </div>

            {/* Step 04 */}
            <div className="grid gap-6 rounded-3xl border border-emerald-500/40 bg-emerald-500/10 p-5 sm:grid-cols-[auto,minmax(0,1fr)] sm:p-7">
              <div className="text-3xl font-semibold text-emerald-300/40 sm:text-4xl">
                04
              </div>
              <div>
                <h3 className="text-base font-semibold sm:text-lg">
                  No lock-in contracts. Start small, scale what works.
                </h3>
                <p className="mt-2 text-sm text-emerald-50/90">
                  We know small businesses can’t afford long-term gambles. Start
                  with a simple campaign, measure the impact and scale up once
                  you see the results — or switch it off if it’s not a fit.
                </p>
                <ul className="mt-3 space-y-1.5 text-sm text-emerald-50/90">
                  <li>• Transparent performance insights.</li>
                  <li>• Keep full control over when and how you run offers.</li>
                  <li>• Designed so you always know the value you’re getting.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* WHO IT'S FOR */}
        <section className="mt-12 space-y-6">
          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
              Built for real local businesses
            </p>
            <h2 className="mt-2 text-xl font-semibold sm:text-2xl">
              Not just restaurants.
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-white/80">
              If your business serves customers in person, Today’s Stash can
              help. We’re building a platform that works across whole towns and
              regions, not just one category.
            </p>
          </header>

          <div className="grid gap-3 sm:grid-cols-3 text-xs sm:text-sm">
            {[
              "Cafés & restaurants",
              "Takeaway & fast food",
              "Bars & pubs",
              "Hair & beauty salons",
              "Gyms & fitness studios",
              "Massage & wellness",
              "Auto services & mechanics",
              "Retail & fashion",
              "Tourism & experiences",
            ].map((label) => (
              <div
                key={label}
                className="rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-white/85"
              >
                {label}
              </div>
            ))}
          </div>
        </section>

        {/* SOCIAL PROOF / SUCCESS STORIES */}
        <section className="mt-12 grid gap-8 rounded-3xl border border-white/12 bg-white/5 p-6 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] sm:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
              Proven track record
            </p>
            <h2 className="mt-2 text-xl font-semibold sm:text-2xl">
              We’ve helped thousands of businesses fill seats before.
            </h2>
            <p className="mt-3 text-sm text-white/80">
              Before Today’s Stash, our team spent two decades running Urban
              Promotions®, one of Australia’s most successful local coupon
              companies. We’ve already helped over{" "}
              <span className="font-semibold text-white">10,000+ venues</span>{" "}
              attract new customers and turn quiet periods into profitable
              sessions.
            </p>
            <p className="mt-3 text-sm text-white/80">
              Today’s Stash takes that proven model and rebuilds it for a
              digital world — secure QR codes, real-time redemptions and a wider
              range of business types.
            </p>

            <Link
              href="/success-stories"
              className="mt-5 inline-flex items-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-black shadow-[0_0_18px_rgba(16,185,129,0.6)] transition hover:bg-emerald-400"
            >
              Read success stories from real businesses
              <span className="ml-1 text-base">↗</span>
            </Link>
          </div>

          <div className="space-y-3 text-xs text-white/78">
            <div className="rounded-2xl bg-black/60 p-4 ring-1 ring-white/10">
              <p>
                “By the end of the first month, I had already made my money back
                by using the vouchers. From that point on, the savings were
                enormous!”
              </p>
              <p className="mt-2 text-white/50">— Rita, Mortlake VIC</p>
            </div>
            <div className="rounded-2xl bg-black/60 p-4 ring-1 ring-white/10">
              <p>
                “The best thing about the program is that it brings us new
                customers at times we’d otherwise be quiet — and many of them
                have become regulars.”
              </p>
              <p className="mt-2 text-white/50">— Local business owner</p>
            </div>
          </div>
        </section>

        {/* FAQ / QUESTIONS */}
        <section className="mt-12 space-y-6">
          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
              Questions?
            </p>
            <h2 className="mt-2 text-xl font-semibold sm:text-2xl">
              Let’s make sure it’s a fit.
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-white/80">
              Here are some of the most common questions we hear from business
              owners considering Today’s Stash.
            </p>
          </header>

          <div className="space-y-3 text-sm">
            {[
              {
                q: "How long does it take to get started?",
                a: "Most businesses can be listed with their first offer in under a week. We’ll help you structure your offers and settings during your free consult so you’re not guessing.",
              },
              {
                q: "Do I need any special hardware or software?",
                a: "No. Customers redeem their offers using a secure QR code from their phone. Your staff simply check the code and process the sale through your existing POS.",
              },
              {
                q: "Will I just attract bargain hunters?",
                a: "Our goal isn’t to race to the bottom on price. Offers are designed to introduce you to new locals and give existing customers a reason to visit more often — not to attract people who only come once and never return.",
              },
              {
                q: "Is there a lock-in contract?",
                a: "No lock-in contracts. You stay in control. If Today’s Stash isn’t delivering value for your business, you can change your offers or step away.",
              },
            ].map(({ q, a }) => (
              <details
                key={q}
                className="group rounded-2xl border border-white/12 bg_white/5 px-4 py-3"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between text-white/90">
                  <span>{q}</span>
                  <span className="ml-4 text-lg text-white/40 group-open:rotate-180 transition-transform">
                    ˅
                  </span>
                </summary>
                <p className="mt-2 text-sm text-white/75">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="mt-12 rounded-3xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-6 text-center sm:px-8 sm:py-8">
          <h2 className="text-lg font-semibold sm:text-xl">
            Ready to see what Today’s Stash could do for your business?
          </h2>
          <p className="mt-2 text-sm text-emerald-50/90">
            Share your email and we’ll walk you through potential offers,
            expected results, and how to get started — no pressure.
          </p>
          <div className="mx-auto mt-4 flex max-w-md flex-col gap-2 sm:flex-row">
            <input
              type="email"
              required
              placeholder="you@business.com"
              className="h-10 flex-1 rounded-full border border-emerald-400/40 bg-black/50 px-3 text-sm text-white placeholder:text-emerald-100/40 outline-none ring-emerald-400/40 focus:ring-2"
            />
            <button
              type="button"
              className="h-10 rounded-full bg-emerald-500 px-5 text-sm font-semibold text-black shadow-[0_0_18px_rgba(16,185,129,0.7)] transition hover:bg-emerald-400"
            >
              Book my free consult
            </button>
          </div>
          <p className="mt-2 text-[11px] text-emerald-50/80">
            We’ll only use your email to contact you about Today’s Stash.
          </p>
        </section>
      </main>
    </div>
  );
}
