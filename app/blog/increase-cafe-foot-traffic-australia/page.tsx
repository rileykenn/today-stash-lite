import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How to Increase Foot Traffic to Your Café in Australia",
  description:
    "Practical strategies for Australian café owners to increase foot traffic during quiet periods — without slashing prices or devaluing the brand. From weekday offers to corporate accounts.",
  keywords: [
    "increase cafe foot traffic",
    "cafe marketing australia",
    "cafe promotions australia",
    "increase cafe customers",
    "cafe foot traffic strategies",
    "weekday cafe deals",
    "local cafe marketing",
    "cafe loyalty program australia",
  ],
  alternates: {
    canonical: "https://todaysstash.com.au/blog/increase-cafe-foot-traffic-australia",
  },
  openGraph: {
    title: "How to Increase Foot Traffic to Your Café in Australia",
    description: "Practical strategies for Australian café owners to increase foot traffic during quiet periods.",
    url: "https://todaysstash.com.au/blog/increase-cafe-foot-traffic-australia",
    type: "article",
    publishedTime: "2026-04-08T00:00:00.000Z",
    authors: ["Today's Stash Team"],
  },
  twitter: {
    card: "summary_large_image",
    title: "How to Increase Café Foot Traffic in Australia",
    description: "Practical strategies for Australian café owners to fill quiet periods.",
  },
};

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "How to Increase Foot Traffic to Your Café in Australia: Practical Strategies That Work",
  description: "Practical strategies for Australian café owners to increase foot traffic during quiet periods — without slashing prices or devaluing the brand.",
  datePublished: "2026-04-08",
  dateModified: "2026-04-08",
  author: { "@type": "Organization", name: "Today's Stash", url: "https://todaysstash.com.au" },
  publisher: { "@type": "Organization", name: "Today's Stash", logo: { "@type": "ImageObject", url: "https://todaysstash.com.au/logo6.png" } },
  mainEntityOfPage: { "@type": "WebPage", "@id": "https://todaysstash.com.au/blog/increase-cafe-foot-traffic-australia" },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://todaysstash.com.au" },
    { "@type": "ListItem", position: 2, name: "Blog", item: "https://todaysstash.com.au/blog" },
    { "@type": "ListItem", position: 3, name: "Increase Café Foot Traffic", item: "https://todaysstash.com.au/blog/increase-cafe-foot-traffic-australia" },
  ],
};

export default function CafeFootTrafficPage() {
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
            How to Increase Foot Traffic to Your Café in Australia: Practical Strategies That Work
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/70 sm:text-base">
            The weekend rush is great — but it&apos;s the quiet Tuesday afternoons and slow Monday mornings that determine whether your café is actually profitable. Here are six practical, margin-safe strategies to bring more customers through the door on the days that matter most.
          </p>
        </header>

        {/* ── Strategy 1 ── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold sm:text-2xl">1. Time-limited weekday offers via a local deal platform</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/80">
            The most direct way to fill quiet weekday periods is to give locals a compelling reason to visit on those specific days. A well-structured in-store offer — &quot;Monday and Tuesday: free cake slice with any coffee&quot; or &quot;Weekday lunch: any sandwich + coffee for $16&quot; — provides exactly that trigger.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/80">
            The key is making the offer available through a platform where locals are actively browsing. <Link href="/merchant" className="text-emerald-300 underline underline-offset-2 hover:text-emerald-200">Today&apos;s Stash</Link> connects café customers with exactly these kinds of local, in-store offers — browsable by area, redeemable with a simple counter QR code.
          </p>
          <div className="mt-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300/70">The mechanics that matter:</p>
            <ul className="mt-2 space-y-1 text-sm text-white/75">
              <li>• <span className="font-semibold text-white">Time-specific</span> — only available on your quiet days, not seven days a week</li>
              <li>• <span className="font-semibold text-white">Capped</span> — you decide how many redemptions per day</li>
              <li>• <span className="font-semibold text-white">Margin-safe</span> — the discount only applies to capacity that would otherwise sit idle</li>
            </ul>
          </div>
        </section>

        {/* ── Strategy 2 ── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold sm:text-2xl">2. Google Business Profile — the most underused tool</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/80">
            If you haven&apos;t claimed and fully optimised your Google Business Profile, do it today. It&apos;s free and it&apos;s the single highest-leverage thing a café can do for local discoverability.
          </p>
          <div className="mt-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <ul className="space-y-2 text-sm text-white/75">
              <li>• <span className="font-semibold text-white">Accurate trading hours</span> (including holiday variations)</li>
              <li>• <span className="font-semibold text-white">High-quality photos</span> of your space, food and coffee — updated regularly</li>
              <li>• <span className="font-semibold text-white">Description</span> that includes your suburb/town name and what you&apos;re known for</li>
              <li>• <span className="font-semibold text-white">Active responses</span> to every review, positive and negative</li>
              <li>• <span className="font-semibold text-white">Posts updated monthly</span> with specials, new menu items or events</li>
            </ul>
          </div>
          <p className="mt-3 text-sm text-white/65">
            Many regional Australian cafés rank in the top three for &quot;café near me&quot; searches simply by maintaining an active, complete profile while competitors neglect theirs.
          </p>
        </section>

        {/* ── Strategy 3 ── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold sm:text-2xl">3. The loyalty mechanic that actually changes behaviour</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/80">
            Most café loyalty programs reward total spend, meaning your most loyal customers already come in daily and get rewarded for behaviour they&apos;d do anyway. That&apos;s great for retention, but it doesn&apos;t fill your quiet Tuesday afternoons.
          </p>
          <div className="mt-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <p className="text-sm text-white/80">
              <span className="font-semibold text-emerald-300">A more targeted approach:</span> offer a weekday-only multiplier. Visits Monday to Wednesday earn double stamps or double points. Weekend visits earn standard. This directly incentivises customers to spread their visits across the week.
            </p>
          </div>
        </section>

        {/* ── Strategy 4 ── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold sm:text-2xl">4. Corporate and workplace accounts</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/80">
            If your café is within walking distance of offices, businesses, schools or any workplace with 10+ staff, a corporate account can be a significant source of weekday foot traffic. A single office of 20 people ordering daily coffees is worth $50,000–$70,000 in annual revenue.
          </p>
          <p className="mt-3 text-sm text-white/70">
            Approach businesses directly — walk in, introduce yourself, leave a one-page summary. Many cafés offer a modest 10–15% group discount in exchange for guaranteed volume.
          </p>
        </section>

        {/* ── Strategy 5 ── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold sm:text-2xl">5. Local community presence — not just social media</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/80">
            Organic social media reach for local businesses has declined significantly. What works better is genuine community presence:
          </p>
          <div className="mt-3 space-y-3">
            <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
              <p className="text-sm text-white/80"><span className="font-semibold text-white">Sponsor a local sporting club or school event.</span> A $500–$1,000 annual sponsorship often delivers more foot traffic than $500 of Instagram ads.</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
              <p className="text-sm text-white/80"><span className="font-semibold text-white">Partner with a complementary local business.</span> Cross-promotions (&quot;show your receipt from X, get a free coffee upgrade at Y&quot;) cost nothing and tap into each other&apos;s customer bases.</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
              <p className="text-sm text-white/80"><span className="font-semibold text-white">Host a recurring local event.</span> A monthly book club, weekly trivia morning, or Saturday drawing group fills specific time slots reliably.</p>
            </div>
          </div>
        </section>

        {/* ── Strategy 6 ── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold sm:text-2xl">6. Seasonal and event-tied promotions</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/80">
            Australia&apos;s regional calendar is full of hooks — the local show, football season, school holidays, Anzac Day, Mother&apos;s Day, Melbourne Cup. Map out your promotional calendar for the year at the start of each year, identify five or six key moments, and build campaigns around them.
          </p>
        </section>

        {/* ── What to Avoid ── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold sm:text-2xl">What to Avoid</h2>
          <div className="mt-4 space-y-3 text-sm text-white/80">
            <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
              <p className="font-semibold text-white">Blanket discounting</p>
              <p className="mt-1 text-white/70">&quot;10% off all week, every week&quot; devalues your product and trains customers to wait for discounts.</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
              <p className="font-semibold text-white">Platforms that take a large cut</p>
              <p className="mt-1 text-white/70">50/50 split models often make each redemption a loss at café margins. Always understand the full fee structure.</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
              <p className="font-semibold text-white">Promotions that create staffing nightmares</p>
              <p className="mt-1 text-white/70">An offer that brings in 80 people to a café staffed for 30 creates a terrible experience. Cap your redemptions.</p>
            </div>
          </div>
        </section>

        {/* ── Checklist ── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold sm:text-2xl">Quick-Start Foot Traffic Checklist for Cafés</h2>
          <div className="mt-4 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
            <ul className="space-y-2 text-sm text-white/75">
              <li>☐ Pull your sales data and identify your three quietest time slots per week</li>
              <li>☐ Claim and fully optimise your Google Business Profile</li>
              <li>☐ Launch one time-limited weekday offer targeting your quietest day</li>
              <li>☐ Set a daily redemption cap that matches your spare capacity</li>
              <li>☐ Approach two or three nearby workplaces about a corporate account</li>
              <li>☐ Identify one complementary local business for a cross-promotion</li>
              <li>☐ Map out your seasonal promotional calendar for the next three months</li>
              <li>☐ Review promotion performance after four weeks and adjust</li>
            </ul>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-6 text-center">
          <h2 className="text-lg font-semibold">Ready to fill your quiet periods?</h2>
          <p className="mt-2 text-sm text-emerald-50/80">
            Increasing café foot traffic isn&apos;t about running more promotions — it&apos;s about running smarter ones, targeted at the right times, with the right economics.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link href="/merchant" className="inline-flex items-center rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-black shadow-[0_0_14px_rgba(16,185,129,0.45)] transition hover:bg-emerald-400">
              Register your café
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
