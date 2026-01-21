import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Coupon } from "./types";
import { fmtMoney } from "./helpers";
import { BellIcon, ClockIcon } from "@heroicons/react/24/outline";
import { BellIcon as BellIconSolid, FireIcon } from "@heroicons/react/24/solid";
import { sb } from "@/lib/supabaseBrowser";

interface CouponTicketProps {
  coupon: Coupon;
  onRedeem: (coupon: Coupon) => void;
  areaUnlocked: boolean;
  isNotificationEnabled: boolean;
  onBellClick: () => void;
}

export default function CouponTicket({
  coupon,
  onRedeem,
  isNotificationEnabled,
  onBellClick
}: CouponTicketProps) {
  const router = useRouter();

  // Image state for error handling
  const [bannerSrc, setBannerSrc] = useState(coupon.imageUrl || coupon.merchant?.bannerUrl || "/placeholder-deal.svg");

  // Time state for countdowns
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setBannerSrc(coupon.imageUrl || coupon.merchant?.bannerUrl || "/placeholder-deal.svg");
  }, [coupon.imageUrl, coupon.merchant?.bannerUrl]);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const handleToggleNotification = (e: React.MouseEvent) => {
    e.stopPropagation();
    onBellClick();
  };

  if (!coupon || !coupon.merchant) return null; // Safety guard

  // Parse time windows
  let isUpcoming = false;
  let isActiveTime = false;
  let isDailyExpired = false;
  let isDealExpired = false; // NEW: Deal expired (from daysLeft or validUntil)
  let expiredLabel = ""; // NEW: "Expired X minutes ago"
  let countdownLabel = "";
  let availabilityLabel = "";

  // Check if deal is expired (from daysLeft or validUntil)
  if (coupon.daysLeft != null && coupon.daysLeft < 0) {
    isDealExpired = true;
    // Calculate time since expiration
    const daysSinceExpired = Math.abs(coupon.daysLeft);
    if (daysSinceExpired === 0) {
      expiredLabel = "Expired today";
    } else if (daysSinceExpired === 1) {
      expiredLabel = "Expired 1 day ago";
    } else {
      expiredLabel = `Expired ${daysSinceExpired} days ago`;
    }
  } else if (coupon.validUntil && now) {
    const expireDate = new Date(coupon.validUntil);
    if (now > expireDate) {
      isDealExpired = true;
      const diff = now.getTime() - expireDate.getTime();
      const minutes = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (days > 0) {
        expiredLabel = days === 1 ? "Expired 1 day ago" : `Expired ${days} days ago`;
      } else if (hours > 0) {
        expiredLabel = hours === 1 ? "Expired 1 hour ago" : `Expired ${hours} hours ago`;
      } else {
        expiredLabel = minutes <= 1 ? "Expired 1 minute ago" : `Expired ${minutes} minutes ago`;
      }
    }
  }

  if (now && coupon.todayStart && coupon.todayEnd) {
    const start = new Date(coupon.todayStart);
    const end = new Date(coupon.todayEnd);

    if (now < start) {
      isUpcoming = true;
      // Calc time until active
      const diff = start.getTime() - now.getTime();
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      countdownLabel = `Active in ${h}h ${m}m`;

      // Availability text
      const fmtTime = (d: Date) => {
        const h = d.getHours();
        const m = d.getMinutes();
        const ampm = h >= 12 ? 'pm' : 'am';
        const h12 = h % 12 || 12;
        return `${h12}:${m.toString().padStart(2, '0')}${ampm}`;
      };
      availabilityLabel = `${(coupon as any).totalLimit ? (coupon as any).totalLimit - ((coupon as any).usedCount || 0) : "Unlimited"} available at ${fmtTime(start)}`;
    } else if (now >= start && now < end) {
      isActiveTime = true;
      // Calc time left
      const diff = end.getTime() - now.getTime();
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      countdownLabel = `Expires in ${h}h ${m}m`;

      availabilityLabel = `${(coupon as any).totalLimit ? (coupon as any).totalLimit - ((coupon as any).usedCount || 0) : "Many"} left`;
    } else {
      // Deal time window has expired
      isDailyExpired = true;
      isDealExpired = true;

      // Calculate time since expiration
      const diff = now.getTime() - end.getTime();
      const minutes = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (days > 0) {
        expiredLabel = days === 1 ? "Expired 1 day ago" : `Expired ${days} days ago`;
      } else if (hours > 0) {
        expiredLabel = hours === 1 ? "Expired 1 hour ago" : `Expired ${hours} hours ago`;
      } else {
        expiredLabel = minutes <= 1 ? "Expired 1 minute ago" : `Expired ${minutes} minutes ago`;
      }
    }
  }

  const rawTotalLimit = (coupon as any).totalLimit ?? (coupon as any).total_limit ?? null;
  const rawUsedCount = (coupon as any).usedCount ?? (coupon as any).redeemed_count ?? 0;

  const total = rawTotalLimit ? Number(rawTotalLimit) : 0;
  const used = Number(rawUsedCount);
  const remaining = total - used;

  // Logic from screen: "Sold out", "Only X left"
  const isSoldOut = total > 0 && remaining <= 0;
  const isLowStock = total > 0 && remaining <= 5 && !isSoldOut;

  // UPDATED: Apply grayscale to expired deals AND sold out
  const isGray = isSoldOut || isDealExpired;


  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/consumer/deal/${coupon.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className="group relative flex flex-col w-full rounded-t-xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer select-none"
    >
      {/* --- Image Section --- */}
      <div className="relative w-full h-48 overflow-hidden bg-gray-100">
        {/* Main Image */}
        <img
          src={bannerSrc}
          alt={coupon.title}
          onError={() => {
            if (bannerSrc !== (coupon.merchant?.bannerUrl || "/placeholder-deal.svg") && coupon.merchant?.bannerUrl) {
              setBannerSrc(coupon.merchant.bannerUrl);
            } else {
              setBannerSrc("/placeholder-deal.svg");
            }
          }}
          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${isGray || isSoldOut ? "grayscale filter opacity-90" : ""}`}
        />

        {/* X Overlay for Expired Deals (Corner to Corner) */}
        {isDealExpired && (
          <div className="absolute inset-0 z-20 pointer-events-none">
            <svg className="w-full h-full text-red-500/60" viewBox="0 0 100 100" preserveAspectRatio="none">
              <line x1="0" y1="0" x2="100" y2="100" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              <line x1="100" y1="0" x2="0" y2="100" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>
        )}

        {/* Overlay: Badges (Top) */}
        <div className="absolute top-3 left-3 right-3 z-10 flex items-start justify-between gap-2">
          {/* Town Badge (Always on Left) */}
          <span className="px-3 py-1 bg-emerald-500/90 backdrop-blur text-white text-xs font-bold rounded-full shadow-sm">
            {coupon.areaLabel}
          </span>

          {/* Status Badge (On Right) */}
          <div className="font-medium">
            {isSoldOut ? (
              <span className="px-3 py-1 bg-white/90 backdrop-blur text-gray-800 text-xs font-bold rounded-full shadow-sm">
                Sold out
              </span>
            ) : isDealExpired ? (
              null
            ) : isUpcoming ? (
              <span className="px-3 py-1 bg-blue-500/90 backdrop-blur text-white text-xs font-bold rounded-full shadow-sm">
                {countdownLabel}
              </span>
            ) : isActiveTime ? (
              <span className="px-3 py-1 bg-orange-500/90 backdrop-blur text-white text-xs font-bold rounded-full shadow-sm">
                {countdownLabel}
              </span>
            ) : coupon.merchant?.isClosed ? (
              <span className="px-3 py-1 bg-white/90 backdrop-blur text-gray-800 text-xs font-bold rounded-full shadow-sm">
                Closed
              </span>
            ) : isLowStock ? (
              <span className="px-3 py-1 bg-rose-500 text-white text-xs font-bold rounded-full shadow-sm">
                Only {remaining} left
              </span>
            ) : coupon.daysLeft != null && coupon.daysLeft <= 3 ? (
              <span className="px-3 py-1 bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold rounded-full shadow-sm">
                {coupon.daysLeft === 0 ? "Expires Today" : `${coupon.daysLeft} days left`}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* --- Content Section --- */}
      <div className="relative flex flex-col pt-4 pb-1 px-4 text-left bg-[#1a1a1a] overflow-hidden">
        {/* Background Texture Element */}
        <div
          className="absolute inset-0 z-0 bg-center bg-no-repeat pointer-events-none"
          style={{
            backgroundImage: "url('/textures/cardtexture.jpeg')",
            opacity: "var(--coupon-texture-opacity)",
            backgroundSize: "var(--coupon-texture-size)"
          }}
        />

        {/* Content Wrapper */}
        <div className="relative z-10 flex flex-col">
          {/* Row 1: Title & Bell */}
          <div className="flex justify-between items-start mb-0.5 pt-2">
            <h3 className="text-coupon-title font-bold text-xl truncate pr-2 leading-snug">
              {coupon.title}
            </h3>
            <button
              onClick={handleToggleNotification}
              className="text-white hover:text-emerald-400 transition-colors"
              title={isNotificationEnabled ? "Disable notifications" : "Enable notifications"}
            >
              {isNotificationEnabled ? (
                <BellIconSolid className="w-5 h-5 fill-emerald-500" />
              ) : (
                <BellIcon className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Row 2: Merchant Name */}
          <p className="text-white text-sm font-normal truncate mb-1">
            {coupon.merchant.name}
          </p>

          {/* Expired Label (Clock Icon) */}
          {isDealExpired && (
            <div className="flex items-center gap-1.5 mb-3 text-xs font-medium text-red-500">
              <ClockIcon className="w-3.5 h-3.5" />
              <span>{expiredLabel}</span>
            </div>
          )}

          {!isDealExpired && <div className="mb-3" />}

          <div className="flex justify-between items-end">
            <div className="flex flex-col gap-1 pb-1 flex-1 pr-2">
              {/* Stock Info (Fire) */}
              {(isUpcoming || isActiveTime) && availabilityLabel && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-coupon-stock">
                  <FireIcon className="w-3.5 h-3.5" />
                  <span>{availabilityLabel}</span>
                </div>
              )}

              {/* Timer Info (Clock) */}
              {(isUpcoming || isActiveTime) && countdownLabel && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-coupon-expiry">
                  <ClockIcon className="w-3.5 h-3.5" />
                  <span>{countdownLabel}</span>
                </div>
              )}

              {/* Business Status */}
              <div className="text-xs text-white leading-tight">
                <span>
                  {coupon.merchant?.isClosed
                    ? (coupon.merchant?.nextOpen ? `Business ${coupon.merchant.nextOpen.toLowerCase()}` : "Business closed")
                    : (coupon.merchant?.closesAt ? `Business is open till ${coupon.merchant.closesAt} today` : "Business open")
                  }
                </span>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-2 shrink-0 pb-0.5">
              {coupon.originalPrice && (
                <span className="text-gray-500 line-through text-lg font-medium decoration-gray-500/50">
                  {fmtMoney(coupon.originalPrice)}
                </span>
              )}
              <span className={`font-black text-5xl tracking-tight leading-none ${isDealExpired || isSoldOut ? 'text-gray-400' : 'text-coupon-price'}`}>
                {fmtMoney(coupon.price ?? 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* --- Dashed Footer: Click to Redeem (Serrated Edge) --- */}
      <div
        className="relative w-full pb-4 pt-2 bg-[#1a1a1a]"
        style={{
          maskImage: "radial-gradient(circle at bottom, transparent 6px, black 6.5px), linear-gradient(black, black)",
          maskSize: "20px 20px, 100% calc(100% - 10px)",
          maskPosition: "bottom, top",
          maskRepeat: "repeat-x, no-repeat",
          maskComposite: "intersect", // Standard
          WebkitMaskImage: "radial-gradient(circle at bottom, transparent 6px, black 6.5px), linear-gradient(black, black)",
          WebkitMaskSize: "20px 20px, 100% calc(100% - 10px)",
          WebkitMaskPosition: "bottom, top",
          WebkitMaskRepeat: "repeat-x, no-repeat",
          WebkitMaskComposite: "source-over, source-over", // Webkit logic is often reversed or specific
        }}
      >
        {/* Background Texture Element for Footer */}
        <div
          className="absolute inset-0 z-0 bg-center bg-no-repeat pointer-events-none"
          style={{
            backgroundImage: "url('/textures/cardtexture.jpeg')",
            opacity: "var(--coupon-texture-opacity)",
            backgroundSize: "var(--coupon-texture-size)"
          }}
        />

        <div className="relative z-10">
          <div className="absolute top-0 inset-x-4 border-t border-dashed border-coupon-dashed" />
          <div className="text-center mt-1.5 mb-0.5">
            {isDealExpired ? (
              <span className="font-mono text-xs text-red-500 tracking-widest uppercase opacity-90 font-bold">expired</span>
            ) : (
              <span className="font-mono text-xs text-coupon-redeem tracking-widest uppercase opacity-90">click to redeem</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
