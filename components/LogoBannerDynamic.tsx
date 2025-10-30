/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { sb } from "@/lib/supabaseBrowser";

/* ---------- Controls via props ---------- */
type Props = {
  bucket: string;          // e.g. "Logo banner"
  prefix?: string;         // optional subfolder
  logoHeight?: number;     // px (one knob for size)
  gap?: number;            // px between logos
  speed?: number;          // seconds per full loop (lower = faster)
  leftToRight?: boolean;   // direction
  grayscale?: boolean;     // grayscale with color on hover
  refreshInterval?: number;// ms; 0 = no auto refresh
  className?: string;
  debug?: boolean;         // logs to console
};

/* ---------- Helpers ---------- */
const PUB_BASE =
  (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "") + "/storage/v1/object/public";

/** join path segments, encoding each segment safely (spaces, etc) */
function joinPublicPath(bucket: string, ...segs: string[]) {
  const parts = segs
    .filter(Boolean)
    .flatMap((s) => s.split("/"))
    .map((s) => encodeURIComponent(s));
  return `${PUB_BASE}/${encodeURIComponent(bucket)}/${parts.join("/")}`;
}

export default function LogoBannerDynamic({
  bucket,
  prefix = "",
  logoHeight = 28,
  gap = 28,
  speed = 90,
  leftToRight = true,
  grayscale = true,
  refreshInterval = 120000,
  className = "",
  debug = false,
}: Props) {
  const [urls, setUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchLogos() {
    console.log("BUCKET ARG:", bucket);
console.log("PREFIX ARG:", prefix);

    setLoading(true);
    try {
      const results: string[] = [];
      let page = 0;
      const pageSize = 100;

      while (true) {
        const { data, error } = await sb.storage.from(bucket).list(prefix, {
          limit: pageSize,
          offset: page * pageSize,
          sortBy: { column: "name", order: "asc" },
        });

        if (error) throw error;
        if (!data?.length) break;

        for (const f of data) {
          const name = (f.name || "").toLowerCase();
          if (/\.(png|jpe?g|gif|webp|svg)$/i.test(name)) {
            // Build the public URL ourselves to sidestep any getPublicUrl quirks with spaces
            const url = joinPublicPath(bucket, prefix, f.name);
            results.push(url);
          }
        }

        if (data.length < pageSize) break;
        page += 1;
      }

      if (debug) {
        // useful sanity check
        // eslint-disable-next-line no-console
        console.debug("[LogoBanner] listed", results.length, "files", { bucket, prefix, results });
      }

      setUrls(results);
    } catch (e) {
      console.error("[LogoBanner] fetch error:", e);
      setUrls([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogos();
    if (refreshInterval > 0) {
      const id = setInterval(fetchLogos, refreshInterval);
      return () => clearInterval(id);
    }
  }, [bucket, prefix, refreshInterval]);

  // Keep your proven seamless-loop approach: duplicate list and render two tracks offset by -50%
  const base = useMemo(() => (urls.length ? urls : new Array(10).fill("")), [urls]);
  const strip = useMemo(() => (base.length ? [...base, ...base] : base), [base]);
  const direction = leftToRight ? "normal" : "reverse";

  return (
    <div
      className={`relative w-full overflow-hidden select-none ${className}`}
      aria-label="Logo marquee"
      style={{
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0, black 10%, black 90%, transparent 100%)",
        maskImage:
          "linear-gradient(to right, transparent 0, black 10%, black 90%, transparent 100%)",
      }}
    >
      <div className="relative">
        {[0, 1].map((row) => {
          const startOffset = row === 1 ? "-50%" : "0%";
          return (
            <div
              key={row}
              className="absolute left-0 top-0 flex items-center will-change-transform"
              style={{
                gap: `${gap}px`,
                width: "max-content",
                animation: `ts-scroll ${Math.max(1, speed)}s linear infinite`,
                animationDirection: direction,
                transform: `translateX(${startOffset})`,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {(strip.length ? strip : new Array(10).fill("")).map((src, i) =>
                src ? (
                  <img
                    key={`${row}-${i}`}
                    src={src}
                    alt=""
                    height={logoHeight}
                    style={{ height: logoHeight, width: "auto" }}
                    className={`max-h-[64px] opacity-90 ${
                      grayscale ? "grayscale hover:grayscale-0 transition" : ""
                    }`}
                    loading="lazy"
                    decoding="async"
                    crossOrigin="anonymous"
                    onError={(e) => {
                      if (debug) console.warn("[LogoBanner] img 404:", (e.target as HTMLImageElement).src);
                      // hide broken image if any
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div
                    key={`s-${row}-${i}`}
                    style={{ height: logoHeight, width: logoHeight * 2 }}
                    className="rounded-md bg-white/5"
                  />
                )
              )}
            </div>
          );
        })}

        {/* reserve height so container doesn't collapse */}
        <div style={{ height: logoHeight }} />
      </div>

      <style jsx>{`
        @keyframes ts-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}
