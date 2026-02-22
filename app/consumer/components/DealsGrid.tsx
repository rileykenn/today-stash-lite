// app/consumer/components/DealsGrid.tsx
"use client";

import React from "react";
import type { Coupon } from "./types";
import CouponTicket from "./CouponTicket";

export default function DealsGrid({
  areaUnlocked,
  visibleDeals,
  onRedeem,
  onBellClick,
  enabledMerchantIds,
  isDealUnlocked,
  todayRedeemedOfferIds,
}: {
  areaUnlocked: boolean;
  visibleDeals: Coupon[];
  onRedeem: (deal: Coupon) => void;
  onBellClick: (deal: Coupon) => void;
  enabledMerchantIds: Set<string>;
  isDealUnlocked?: (deal: Coupon) => boolean;
  todayRedeemedOfferIds?: Set<string>;
}) {
  if (!areaUnlocked) {
    return (
      <p className="text-gray-300/80 text-sm">
        Enter your access code above to view the available deals in this town.
      </p>
    );
  }

  if (visibleDeals.length === 0) {
    return null;
  }

  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
      {visibleDeals.map((d) => (
        <li key={d.id}>
          <CouponTicket
            coupon={d}
            onRedeem={onRedeem}
            areaUnlocked={isDealUnlocked ? isDealUnlocked(d) : areaUnlocked}
            isNotificationEnabled={enabledMerchantIds.has(d.merchant?.id as string)}
            onBellClick={() => onBellClick(d)}
            isRedeemedToday={todayRedeemedOfferIds?.has(d.id) ?? false}
          />
        </li>
      ))}
    </ul>
  );
}
