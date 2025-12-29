// app/consumer/components/DealsGrid.tsx
"use client";

import React from "react";
import type { Coupon } from "./types";
import CouponTicket from "./CouponTicket";

export default function DealsGrid({
  areaUnlocked,
  visibleDeals,
  onRedeem,
}: {
  areaUnlocked: boolean;
  visibleDeals: Coupon[];
  onRedeem: (deal: Coupon) => void;
}) {
  if (!areaUnlocked) {
    return (
      <p className="text-gray-300/80 text-sm">
        Enter your access code above to view the available deals in this town.
      </p>
    );
  }

  if (visibleDeals.length === 0) {
    return (
      <p className="text-gray-300/80 text-sm">
        No active deals for this town yet. Check back soon.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
      {visibleDeals.map((d) => (
        <li key={d.id}>
          <CouponTicket deal={d} onShow={() => onRedeem(d)} />
        </li>
      ))}
    </ul>
  );
}
