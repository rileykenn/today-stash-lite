import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog — Today's Stash",
  description:
    "Practical guides and insights for Australian local businesses and consumers. Learn how to drive foot traffic, find local deals, and grow your business with in-store promotions.",
};

const ARTICLES = [
  {
    slug: "local-business-promotions-australia",
    title:
      "Local Business Promotions Australia: The Complete Guide for Small Business Owners",
    description:
      "A practical guide to running local business promotions in Australia — what works, what doesn't, and how small businesses across regional towns are driving more foot traffic.",
    date: "2026-04-08",
    readTime: "12 min read",
    tags: ["Small Business", "Promotions", "Regional Australia"],
  },
  {
    slug: "local-deals-near-me-australia",
    title:
      "Local Deals Near Me Australia: How to Find Real In-Store Savings at Local Businesses",
    description:
      "Looking for local deals near you in Australia? Discover how to find genuine in-store discounts at cafés, restaurants, gyms and local businesses in your town.",
    date: "2026-04-07",
    readTime: "9 min read",
    tags: ["Consumer Guide", "Local Deals", "Savings"],
  },
  {
    slug: "how-to-increase-foot-traffic-restaurant-australia",
    title:
      "How to Increase Foot Traffic to Your Restaurant in Australia: Strategies That Actually Work",
    description:
      "A practical guide for Australian restaurant owners on how to fill more tables, target quiet trading periods and build a loyal local customer base.",
    date: "2026-04-08",
    readTime: "10 min read",
    tags: ["Restaurant Marketing", "Foot Traffic", "Australia"],
  },
  {
    slug: "increase-cafe-foot-traffic-australia",
    title:
      "How to Increase Foot Traffic to Your Café in Australia: Practical Strategies That Work",
    description:
      "Practical strategies for Australian café owners to increase foot traffic during quiet periods — without slashing prices or devaluing the brand.",
    date: "2026-04-08",
    readTime: "10 min read",
    tags: ["Café Marketing", "Foot Traffic", "Australia"],
  },
];

export default function BlogIndexPage() {
  return (
    <>
      <header className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300/80">
          Insights & Guides
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          The Today&apos;s Stash{" "}
          <span className="text-emerald-400">Blog</span>
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
          Practical guides for Australian businesses on driving foot traffic,
          running local promotions, and connecting with nearby customers.
        </p>
      </header>

      <div className="space-y-6">
        {ARTICLES.map((article) => (
          <Link
            key={article.slug}
            href={`/blog/${article.slug}`}
            className="group block rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-emerald-500/40 hover:bg-emerald-500/5 sm:p-6"
          >
            <div className="flex items-center gap-3 text-[11px] text-white/50">
              <time dateTime={article.date}>
                {new Date(article.date).toLocaleDateString("en-AU", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </time>
              <span>·</span>
              <span>{article.readTime}</span>
            </div>

            <h2 className="mt-2 text-lg font-semibold leading-snug text-white/90 group-hover:text-emerald-300 transition sm:text-xl">
              {article.title}
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-white/65">
              {article.description}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-white/8 px-2.5 py-0.5 text-[10px] font-medium text-white/60"
                >
                  {tag}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>

      {/* CTA */}
      <section className="mt-12 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-6 text-center">
        <h2 className="text-lg font-semibold">
          Ready to grow your local business?
        </h2>
        <p className="mt-2 text-sm text-emerald-50/80">
          Join thousands of Australian businesses using Today&apos;s Stash to
          fill quiet times and build loyal customers.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Link
            href="/merchant"
            className="inline-flex items-center rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-black shadow-[0_0_14px_rgba(16,185,129,0.45)] transition hover:bg-emerald-400"
          >
            Register your business
          </Link>
          <Link
            href="/consumer"
            className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-semibold text-white/85 transition hover:border-white/30 hover:bg-white/10"
          >
            Browse local deals
          </Link>
        </div>
      </section>
    </>
  );
}
