"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

type StoryRow = {
  id: string;
  business: string;
  contact: string | null;
  location: string | null;
  quote: string;
  result_summary: string | null;
  image_url: string | null;
  category_name: string | null;
  category_slug: string | null;
  category_sort: number | null;
};

export default function StoriesFilter({
  stories,
  categories,
}: {
  stories: StoryRow[];
  categories: string[];
}) {
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const filteredStories =
    activeCategory === "All"
      ? stories
      : stories.filter((s) => s.category_name === activeCategory);

  return (
    <>
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

      {/* Small stats bar */}
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
            Built into Today&apos;s Stash
          </p>
          <p className="mt-1 text-lg font-semibold">Proven playbook</p>
        </div>
      </section>

      {/* Stories grid */}
      {filteredStories.length === 0 && (
        <p className="text-sm text-white/60">
          No stories in this category yet. We&apos;re still importing archives
          from the original Urban Promotions site.
        </p>
      )}

      <section className="space-y-4 sm:space-y-6">
        {filteredStories.map((story) => {
          return (
            <article
              key={story.id}
              className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 via-white/3 to-white/5 shadow-[0_18px_60px_rgba(0,0,0,0.45)]"
            >
              <div className="flex flex-col sm:flex-row">
                {/* Image */}
                {story.image_url && (
                  <div className="relative sm:w-2/5">
                    <div className="relative h-44 sm:h-full w-full">
                      <Image
                        src={story.image_url}
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
                    &ldquo;{story.quote}&rdquo;
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
    </>
  );
}
