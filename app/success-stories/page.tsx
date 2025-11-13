"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";

type StoryRow = {
  id: string;
  business: string;
  contact: string | null;
  location: string | null;
  quote: string;
  result_summary: string | null;
  image_path: string | null;
  category_name: string | null;
  category_slug: string | null;
  category_sort: number | null;
};

const CATEGORY_ORDER = [
  "Cafe & Bakery",
  "Financial",
  "Fitness",
  "Hair & Beauty",
  "Mechanical",
  "Miscellaneous",
  "Pet Care",
  "Photography",
  "Recreation",
  "Restaurant",
];

const IMAGE_BUCKET = "success-stories"; // name of your Supabase Storage bucket

export default function SuccessStoriesPage() {
  const [stories, setStories] = useState<StoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("All");

  useEffect(() => {
    const fetchStories = async () => {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from("success_stories_view")
        .select("*")
        .order("category_sort", { ascending: true, nullsFirst: true })
        .order("sort_order", { ascending: true });

      if (error) {
        console.error("Error loading success stories:", error);
      } else if (data) {
        setStories(data as StoryRow[]);
      }
      setLoading(false);
    };

    fetchStories();
  }, []);

  // Build category list from data + fixed ordering
  const categories = useMemo(() => {
    const namesFromData = Array.from(
      new Set(stories.map((s) => s.category_name).filter(Boolean)) as Set<
        string
      >
    );

    const ordered = CATEGORY_ORDER.filter((name) =>
      namesFromData.includes(name)
    );

    const extras = namesFromData.filter((n) => !CATEGORY_ORDER.includes(n));

    return ["All", ...ordered, ...extras];
  }, [stories]);

  const filteredStories =
    activeCategory === "All"
      ? stories
      : stories.filter((s) => s.category_name === activeCategory);

  const getImageUrl = (story: StoryRow) => {
    if (!story.image_path) return null;
    const supabase = getSupabaseClient();
    return supabase.storage
      .from(IMAGE_BUCKET)
      .getPublicUrl(story.image_path).data.publicUrl;
  };

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-8 text-[#E8FFF3]">
      {/* Hero */}
      <section className="mb-8">
        <p className="text-xs uppercase tracking-[0.25em] text-emerald-400/80">
          Proof it works
        </p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-semibold leading-tight">
          Success stories from{" "}
          <span className="text-emerald-400">local businesses</span>
        </h1>
        <p className="mt-3 text-sm sm:text-base text-white/70 max-w-2xl">
          Today’s Stash is built on years of results from the original
          <span className="font-semibold"> Urban Promotions</span> coupon
          booklets. These are real stories from real stores who filled their
          chairs, tables and appointment books using local deals.
        </p>
      </section>

      {/* Category chips */}
      <section className="mb-6">
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((cat) => {
            const isActive = cat === activeCategory;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`
                  whitespace-nowrap rounded-full px-3 sm:px-4 py-1.5 text-xs sm:text-[13px] 
                  border transition shadow-sm
                  ${
                    isActive
                      ? "bg-emerald-400 text-black border-emerald-300"
                      : "bg-white/5 text-white/75 border-white/10 hover:bg-white/10"
                  }
                `}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </section>

      {/* Small stats bar (optional, static for now) */}
      <section className="mb-8 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs sm:text-[13px]">
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">
            Businesses featured
          </p>
          <p className="mt-1 text-lg font-semibold">
            {stories.length || "100+"} locally
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">
            Average campaign
          </p>
          <p className="mt-1 text-lg font-semibold">60+ redemptions</p>
        </div>
        <div className="hidden sm:block rounded-xl border border-white/10 bg-white/5 px-3 py-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">
            Built into Today’s Stash
          </p>
          <p className="mt-1 text-lg font-semibold">Proven playbook</p>
        </div>
      </section>

      {/* Stories grid */}
      {loading && (
        <p className="text-sm text-white/60">
          Loading success stories from the archive…
        </p>
      )}

      {!loading && filteredStories.length === 0 && (
        <p className="text-sm text-white/60">
          No stories in this category yet. We&apos;re still importing archives
          from the original Urban Promotions site.
        </p>
      )}

      <section className="space-y-4 sm:space-y-6">
        {filteredStories.map((story) => {
          const imageUrl = getImageUrl(story);
          return (
            <article
              key={story.id}
              className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 via-white/3 to-white/5 shadow-[0_18px_60px_rgba(0,0,0,0.45)]"
            >
              <div className="flex flex-col sm:flex-row">
                {/* Image */}
                {imageUrl && (
                  <div className="relative sm:w-2/5">
                    <div className="relative h-44 sm:h-full w-full">
                      <Image
                        src={imageUrl}
                        alt={story.business}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent sm:bg-gradient-to-r sm:from-black/50" />
                    {story.category_name && (
                      <div className="absolute bottom-3 left-3 rounded-full bg-black/65 px-3 py-1 text-[11px] font-medium text-white/85 backdrop-blur-sm">
                        {story.category_name}
                      </div>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="sm:w-3/5 p-4 sm:p-5 flex flex-col gap-2">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/50">
                    {story.business}
                  </div>
                  <div className="text-sm text-white/70">
                    {story.contact && (
                      <>
                        <span className="font-medium">{story.contact}</span>
                        <span className="mx-1 text-white/30">•</span>
                      </>
                    )}
                    {story.location}
                  </div>

                  <p className="mt-2 text-[15px] sm:text-base italic leading-relaxed text-emerald-50">
                    “{story.quote}”
                  </p>

                  {story.result_summary && (
                    <p className="mt-1 text-xs sm:text-[13px] text-emerald-300/90">
                      {story.result_summary}
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-white/45">
                    <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5">
                      Local deal campaign
                    </span>
                    <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5">
                      Urban Promotions archive
                    </span>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {/* Bottom CTA */}
      <section className="mt-10 rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/20 via-emerald-500/5 to-transparent px-5 py-6 sm:px-6 sm:py-7">
        <h2 className="text-lg sm:text-xl font-semibold">
          Ready to write the next success story?
        </h2>
        <p className="mt-2 text-sm text-emerald-50/80 max-w-xl">
          Today’s Stash takes everything that worked in the coupon booklets and
          turns it into a digital, trackable membership for your town.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="/waitlist"
            className="inline-flex items-center justify-center rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-300 transition"
          >
            Join the waitlist for your town
          </a>
          <a
            href="/about"
            className="text-sm text-emerald-200/80 hover:text-emerald-100 underline underline-offset-4"
          >
            Learn how Today’s Stash works
          </a>
        </div>
      </section>
    </main>
  );
}
