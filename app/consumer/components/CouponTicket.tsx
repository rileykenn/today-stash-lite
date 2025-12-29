// app/consumer/components/CouponTicket.tsx
"use client";

/* eslint-disable @next/next/no-img-element */

import React, { useState } from "react";
import type { Coupon } from "./types";
import { fmtMoney } from "./helpers";

export default function CouponTicket({
  deal,
  onShow,
}: {
  deal: Coupon;
  onShow: () => void;
}) {
  const { title, totalValue, imageUrl, merchant } = deal as any;
  const [expanded, setExpanded] = useState(false);

  // Live numbers
  const rawTotalLimit =
    (deal as any).totalLimit ?? (deal as any).total_limit ?? null;
  const rawUsedCount =
    (deal as any).usedCount ?? (deal as any).redeemed_count ?? 0;

  const used = Math.max(0, Number(rawUsedCount) || 0);
  const total =
    rawTotalLimit === null || rawTotalLimit === undefined
      ? Math.max(used, 1)
      : Math.max(1, Number(rawTotalLimit) || 1);
  const left = Math.max(0, total - used);
  const usedPct = Math.min(100, (used / total) * 100);

  const daysLeft = (deal as any).daysLeft as number | null | undefined;

  let daysLabel: string | null = null;
  if (typeof daysLeft === "number") {
    if (daysLeft > 0) daysLabel = `${daysLeft} days left`;
    else if (daysLeft === 0) daysLabel = "Expires today";
    else daysLabel = "Expired";
  }

  return (
    <article className="relative overflow-hidden rounded-2xl bg-[#13202B] ring-1 ring-white/10 shadow-md">
      {/* Ribbon */}
      {Number.isFinite(totalValue) && totalValue > 0 && (
        <div className="absolute left-0 top-0 z-20 pointer-events-none select-none">
          <div className="absolute -left-7 top-4 w-[120px] -rotate-45 rounded-sm bg-gradient-to-b from-[#e79727] to-[#e5cc4f] py-0.5 text-center text-[10px] font-extrabold text-white shadow-[0_2px_6px_rgba(0,0,0,0.5)]">
            SAVE {fmtMoney(totalValue)}
          </div>
        </div>
      )}

      {/* CTA */}
      <button
        onClick={onShow}
        className="absolute bottom-3 right-3 rounded-full px-3 py-1 text-[12px] font-semibold text-white bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)] active:scale-95 whitespace-nowrap"
      >
        Redeem in store
      </button>

      {/* Grid */}
      <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-3 p-3 min-w-0">
        {/* Image */}
        <div className="w-20 h-20 overflow-hidden rounded-xl bg-white/5">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-xs text-white/60">
              No image
            </div>
          )}
        </div>

        {/* Text */}
        <div className="min-w-0">
          {/* Expandable Title */}
          <div className="flex items-center gap-1">
            <h3
              className={`block w-full min-w-0 text-[17px] font-extrabold leading-tight text-white transition-all duration-300 ${
                expanded ? "whitespace-normal" : "truncate"
              }`}
            >
              {title}
            </h3>

            {title?.length > 30 && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="flex-shrink-0 text-white/70 hover:text-white transition-transform duration-300"
                aria-label={expanded ? "Collapse title" : "Expand title"}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`w-3 h-3 ${
                    expanded ? "rotate-180" : "rotate-0"
                  } transition-transform duration-300`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            )}
          </div>

          {merchant?.name && (
            <p className="block w-full min-w-0 truncate text-[13px] text-white/70">
              {merchant.name}
            </p>
          )}

          {/* Usage + progress bar + days left */}
          <div className="mt-1 mr-[140px]">
            <p className="text-[12px] text-white/60">
              Used: {used} • Left: {left}
              {daysLabel && <> • {daysLabel}</>}
            </p>

            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${usedPct}%`,
                  backgroundImage:
                    "linear-gradient(to right, #10B981 0%, #84CC16 35%, #F59E0B 60%, #FB923C 80%, #EF4444 100%)",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
