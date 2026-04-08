import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How to Increase Foot Traffic to Your Restaurant in Australia",
  description:
    "A practical guide for Australian restaurant owners on how to fill more tables, target quiet trading periods and build a loyal local customer base — without slashing your prices.",
  keywords: [
    "increase restaurant foot traffic",
    "restaurant marketing australia",
    "fill restaurant tables",
    "restaurant promotions australia",
    "mid-week restaurant deals",
    "restaurant foot traffic strategies",
    "local restaurant marketing",
  ],
  alternates: {
    canonical: "https://todaysstash.com.au/blog/how-to-increase-foot-traffic-restaurant-australia",
  },
  openGraph: {
    title: "How to Increase Foot Traffic to Your Restaurant in Australia",
    description: "Practical strategies for Australian restaurant owners to fill more tables and build a loyal customer base.",
    url: "https://todaysstash.com.au/blog/how-to-increase-foot-traffic-restaurant-australia",
    type: "article",
    publishedTime: "2026-04-08T00:00:00.000Z",
    authors: ["Today's Stash Team"],
  },
  twitter: {
    card: "summary_large_image",
    title: "How to Increase Restaurant Foot Traffic in Australia",
    description: "Proven strategies to fill more tables at your Australian restaurant.",
  },
};

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "How to Increase Foot Traffic to Your Restaurant in Australia: Strategies That Actually Work",
  description: "A practical guide for Australian restaurant owners on how to fill more tables, target quiet trading periods and build a loyal local customer base.",
  datePublished: "2026-04-08",
  dateModified: "2026-04-08",
  author: { "@type": "Organization", name: "Today's Stash", url: "https://todaysstash.com.au" },
  publisher: { "@type": "Organization", name: "Today's Stash", logo: { "@type": "ImageObject", url: "https://todaysstash.com.au/logo6.png" } },
  mainEntityOfPage: { "@type": "WebPage", "@id": "https://todaysstash.com.au/blog/how-to-increase-foot-traffic-restaurant-australia" },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://todaysstash.com.au" },
    { "@type": "ListItem", position: 2, name: "Blog", item: "https://todaysstash.com.au/blog" },
    { "@type": "ListItem", position: 3, name: "Increase Restaurant Foot Traffic", item: "https://todaysstash.com.au/blog/how-to-increase-foot-traffic-restaurant-australia" },
  ],
};

export default function RestaurantFootTrafficPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <article className="prose-custom">
        <header className="mb-8 border-b border-white/10 pb-8">
          <div className="flex items-center gap-3 text-[11px] text-white/50">
            <time dateTime="2026-04-08">8 April 2026</time>
            <span>·</span>
            <span>10 min read</span>
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
            How to Increase Foot Traffic to Your Restaurant in Australia: Strategies That Actually Work
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/70 sm:text-base">
            Empty tables cost you money. Not just in lost revenue — in fixed costs that keep running whether the dining room is full or half-empty. Every quiet Tuesday night, every slow mid-week lunch service — those are your margins evaporating.
          </p>
        </header>

        {/* ── The Capacity Problem ── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold sm:text-2xl">The Restaurant Capacity Problem in Australia</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/80">
            Most restaurants in Australia have a peaks-and-troughs problem. Friday and Saturday nights are often strong. But Monday through Thursday — particularly Monday and Tuesday nights — are where restaurants bleed.
          </p>
          <div className="mt-4 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <p className="text-sm text-white/80">
              If your restaurant seats 60 covers and you&apos;re doing 45 on Friday night but 12 on Tuesday night, Tuesday&apos;s contribution to your weekly fixed costs is minimal while your variable costs are almost identical. The gap between your potential and your actual Tuesday revenue is the opportunity.
            </p>
          </div>
        </section>

        {/* ── Proven Strategies ── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold sm:text-2xl">Proven Strategies to Increase Restaurant Foot Traffic</h2>
          <div className="mt-4 space-y-6">
            <div>
              <h3 className="text-base font-semibold text-emerald-300">1. Mid-week dining offers through a local platform</h3>
              <p className="mt-2 text-sm text-white/80">
                The most direct lever for filling mid-week tables is a time-specific in-store offer distributed through a local deal platform where customers are actively browsing for dining options. <Link href="/merchant" className="text-emerald-300 underline underline-offset-2 hover:text-emerald-200">Today&apos;s Stash</Link> is built exactly for this — redemption happens at your counter via a simple QR code scan.
              </p>
              <ul className="mt-2 space-y-1 text-sm text-white/70">
                <li>• Target specific days only — Tuesday and Wednesday, not the whole week</li>
                <li>• Cap daily redemptions — decide how many discounted covers you can absorb</li>
                <li>• Never discount your Friday or Saturday trade</li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-semibold text-emerald-300">2. Set menus and prix fixe — the margin-safe way</h3>
              <p className="mt-2 text-sm text-white/80">
                A fixed two or three course menu at a set price reduces kitchen complexity, gives you predictable food cost, and often increases average spend as customers add drinks and extras at full margin.
              </p>
              <p className="mt-1 text-sm text-white/70">
                Price your set menu around dishes with favourable food cost ratios. Promote it specifically as your mid-week offer — &quot;Available Monday to Wednesday only&quot; creates urgency and protects à la carte revenue on weekends.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold text-emerald-300">3. Google reviews and TripAdvisor</h3>
              <p className="mt-2 text-sm text-white/80">
                A restaurant with 200 positive Google reviews and a rating above 4.2 will consistently out-rank and out-convert one with 40 reviews and a 3.8, regardless of which is actually better.
              </p>
              <ul className="mt-2 space-y-1 text-sm text-white/70">
                <li>• Ask at the right moment — end of a genuinely great meal</li>
                <li>• Respond to every review — positive and negative</li>
                <li>• Never incentivise reviews — this violates Google&apos;s terms</li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-semibold text-emerald-300">4. Private dining and group bookings</h3>
              <p className="mt-2 text-sm text-white/80">
                Group bookings fill tables in bulk and typically spend significantly more per head. Create a simple, clearly priced group dining menu. Respond to enquiries within two hours. In regional towns, build relationships with local businesses and sporting clubs.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold text-emerald-300">5. Local business lunch trade</h3>
              <p className="mt-2 text-sm text-white/80">
                If your restaurant is near offices or industrial areas, the Monday–Friday corporate lunch trade is one of the most reliable sources of consistent mid-week covers. Speed matters — a lunch menu that can be served within 20 minutes is non-negotiable.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold text-emerald-300">6. Seasonal and community event promotions</h3>
              <p className="mt-2 text-sm text-white/80">
                Melbourne Cup week, the local agricultural show, school holidays, football finals — all represent moments when dining decisions are elevated. Build a twelve-month promotional calendar at the start of each year.
              </p>
            </div>
          </div>
        </section>

        {/* ── Delivery vs Dine-in ── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold sm:text-2xl">Delivery vs Dine-in: Getting the Balance Right</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/80">
            Delivery platforms typically charge 25–35% commission. On a $35 main, you net $23–26 before food cost, labour and packaging. More importantly — delivery doesn&apos;t build the relationships and loyalty that dine-in does.
          </p>
          <div className="mt-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <p className="text-sm text-white/80">
              <span className="font-semibold text-white">The most profitable approach:</span> Treat delivery as a supplementary revenue stream for idle kitchen capacity — not a replacement for dine-in strategy. Focus your promotional energy on filling your dining room.
            </p>
          </div>
        </section>

        {/* ── Checklist ── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold sm:text-2xl">Restaurant Foot Traffic Checklist</h2>
          <div className="mt-4 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
            <ul className="space-y-2 text-sm text-white/75">
              <li>☐ Map foot traffic by day and time — identify your three quietest sessions</li>
              <li>☐ Design one time-limited mid-week offer targeting your quietest night</li>
              <li>☐ Set redemption caps aligned to spare kitchen capacity</li>
              <li>☐ Build or update your Google Business Profile with current photos and hours</li>
              <li>☐ Implement a review request process for front-of-house team</li>
              <li>☐ Create a group dining menu and publish it on your website</li>
              <li>☐ Identify five local businesses within walking distance for corporate lunch outreach</li>
              <li>☐ Build a seasonal promotional calendar for the next quarter</li>
              <li>☐ Review all promotion performance after four weeks before adjusting</li>
            </ul>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-6 text-center">
          <h2 className="text-lg font-semibold">Ready to fill more tables?</h2>
          <p className="mt-2 text-sm text-emerald-50/80">
            Consistent foot traffic isn&apos;t a lucky accident — it&apos;s the result of deliberate, targeted strategies that match your promotions to your capacity gaps.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link href="/merchant" className="inline-flex items-center rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-black shadow-[0_0_14px_rgba(16,185,129,0.45)] transition hover:bg-emerald-400">
              Register your restaurant
            </Link>
            <Link href="/consumer" className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-semibold text-white/85 transition hover:border-white/30 hover:bg-white/10">
              See how it works for customers
            </Link>
          </div>
        </section>
      </article>
    </>
  );
}
