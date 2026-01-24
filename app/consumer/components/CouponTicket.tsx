import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Coupon } from "./types";
import { fmtMoney } from "./helpers";
import { BellIcon, ClockIcon } from "@heroicons/react/24/outline";
import { BellIcon as BellIconSolid, FireIcon } from "@heroicons/react/24/solid";

interface CouponTicketProps {
  coupon: Coupon;
  onRedeem: (coupon: Coupon) => void;
  areaUnlocked: boolean;
  isNotificationEnabled: boolean;
  onBellClick: () => void;
  isRedeemedToday?: boolean;
}

export default function CouponTicket({
  coupon,
  onRedeem,
  areaUnlocked,
  isNotificationEnabled,
  onBellClick,
  isRedeemedToday = false
}: CouponTicketProps) {
  const router = useRouter();

  // Modal state for already redeemed
  const [showRedeemedModal, setShowRedeemedModal] = useState(false);

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

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isRedeemedToday) {
      setShowRedeemedModal(true);
      return;
    }

    if (areaUnlocked) {
      router.push(`/consumer/deal/${coupon.id}`);
    } else {
      router.push(`/areas/${coupon.townSlug}`);
    }
  };

  if (!coupon || !coupon.merchant) return null;

  // --- LOGIC: Status Text ---
  let statusText = "";
  let statusColor = "text-gray-400"; // default
  let isDealActive = false; // Used for "Active" vs "Expired" visual cues

  if (now) {
    if (coupon.todayStart && coupon.todayEnd) {
      const start = new Date(coupon.todayStart);
      const end = new Date(coupon.todayEnd);

      if (now > end) {
        // 2. Expired (earlier today)
        // "Expired [X]h [Y]m ago"
        const diff = now.getTime() - end.getTime();
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        statusText = `Expired ${h}h ${m}m ago`;
        statusColor = "text-red-500";
        isDealActive = false;
      } else if (now < start) {
        // 3. Scheduled for later today
        // "Active in [X]h [Y]min"
        const diff = start.getTime() - now.getTime();
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        statusText = `Active in ${h}h ${m}m`;
        statusColor = "text-amber-500";
        isDealActive = true;
      } else {
        // Inside Window
        if (!coupon.merchant.isClosed) {
          // 1. Active & Open
          // "Expires in [X]h [Y]min"
          const diff = end.getTime() - now.getTime();
          const h = Math.floor(diff / (1000 * 60 * 60));
          const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          statusText = `Expires in ${h}h ${m}m`;
          statusColor = "text-emerald-500";
          isDealActive = true;
        } else {
          // Active but Closed
          // Fallback
          statusText = "Business Closed";
          statusColor = "text-gray-400";
          isDealActive = false; // Effectively inactive for user
        }
      }
    } else if (coupon.nextAvailableStart) {
      // 4. Recurring/Scheduled for tomorrow
      // "Available tomorrow"
      statusText = "Available tomorrow";
      statusColor = "text-emerald-500";
      isDealActive = true; // Future active
    } else if (coupon.daysLeft != null && coupon.daysLeft < 0) {
      // Long expired
      let timeText = `${Math.abs(coupon.daysLeft)} days`;

      // Attempt to calculate hours if validUntil is available and expired
      if (coupon.validUntil) {
        const end = new Date(coupon.validUntil);
        if (now > end) {
          const diff = now.getTime() - end.getTime();
          const h = Math.floor(diff / (1000 * 60 * 60));
          timeText = `${h}h`;
        }
      } else {
        // Fallback to hours from days (approximate)
        timeText = `${Math.abs(coupon.daysLeft) * 24}h`;
      }

      statusText = `Expired ${timeText} ago`;
      statusColor = "text-red-500";
      isDealActive = false;
    }
  }

  // --- Logic: Stock ---
  const rawTotalLimit = (coupon as any).totalLimit ?? (coupon as any).total_limit ?? null;
  const rawUsedCount = (coupon as any).usedCount ?? (coupon as any).redeemed_count ?? 0;
  const total = rawTotalLimit ? Number(rawTotalLimit) : 0;
  const used = Number(rawUsedCount);
  const remaining = total - used;
  const isSoldOut = total > 0 && remaining <= 0;
  const isLowStock = total > 0 && remaining <= 5 && !isSoldOut;

  const stockText = total > 0 ? (isSoldOut ? "Sold out" : `${remaining} left`) : "Unlimited";
  const stockColor = isSoldOut ? "text-red-500" : "text-rose-500";

  // Grayscale if sold out, expired, redeemed, OR business closed
  const isGray = isRedeemedToday || isSoldOut || coupon.merchant?.isClosed || (!isDealActive && !statusText.includes("Active in") && !statusText.includes("Available tomorrow"));


  return (
    <div
      onClick={handleClick}
      className="group relative flex flex-col w-full rounded-t-xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer select-none"
    >
      {/* --- Image Section (Unchanged mostly) --- */}
      <div className="relative w-full h-48 overflow-hidden bg-gray-100">
        <img
          src={bannerSrc}
          alt={coupon.title}
          onError={() => setBannerSrc("/placeholder-deal.svg")}
          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${isGray ? "grayscale filter opacity-90" : ""}`}
        />

        {/* Redeemed Overlay */}
        {isRedeemedToday && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20">
            <div className="rounded-full bg-emerald-500 px-6 py-2 font-bold text-white shadow-lg">
              Redeemed
            </div>
          </div>
        )}

        {/* Overlays (Badges) - Kept 'Local' badge, Status badge removed as per 'Row 3 logic' replacing it? 
            Request said "Structure of Deal Card... Row 1...". Did not mention overlay. 
            I'll keep the overlay badges as they are standard UI, unless they conflict.
            Actually, user didn't mention badges. I'll keep the Town Badge.
            I will REMOVE the status badge on the right because it duplicate the Row 3 info.
        */}
        {/* Overlays (Badges) */}
        <div className="absolute top-3 left-3 right-3 z-10 flex items-start justify-start gap-2">
          <span className="px-3 py-1 bg-emerald-500/90 backdrop-blur text-white text-xs font-bold rounded-full shadow-sm">
            {coupon.areaLabel}
          </span>
          {coupon.merchant?.isClosed && (
            <span className="px-3 py-1 bg-white/90 backdrop-blur text-gray-800 text-xs font-bold rounded-full shadow-sm">
              Closed
            </span>
          )}
        </div>
      </div>

      {/* --- Content Section (Vertical Layout) --- */}
      <div className="relative flex flex-col pt-4 pb-4 px-4 text-left bg-[#1a1a1a] overflow-hidden">
        {/* Background Texture */}
        <div
          className="absolute inset-0 z-0 bg-center bg-no-repeat pointer-events-none"
          style={{
            backgroundImage: "url('/textures/cardtexture.jpeg')",
            opacity: "var(--coupon-texture-opacity)",
            backgroundSize: "var(--coupon-texture-size)"
          }}
        />

        <div className="relative z-10 flex flex-col gap-0 leading-tight">
          {/* Row 1: Deal Title & Bell */}
          <div className="flex justify-between items-start">
            <h3 className="text-coupon-title font-bold text-xl truncate pr-2 leading-snug">
              {coupon.title}
            </h3>
            <button
              onClick={handleToggleNotification}
              className="text-white hover:text-emerald-400 transition-colors shrink-0 pt-0.5"
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
          <p className="text-white text-sm font-normal truncate mb-3">
            {coupon.merchant.name}
          </p>

          <div className="flex justify-between items-end">
            <div className="flex flex-col gap-1 pb-1 flex-1 pr-2">
              {/* Row 3: Clock Icon + Status Text */}
              <div key={statusText} className={`flex items-center gap-1.5 text-xs font-medium ${statusColor} animate-[pulse_1s_ease-in-out_1]`}>
                <ClockIcon className="w-3.5 h-3.5" />
                <span>{statusText}</span>
              </div>

              {/* Row 4: Fire Icon + Stock */}
              <div className={`flex items-center gap-1.5 text-xs font-medium ${stockColor}`}>
                <FireIcon className="w-3.5 h-3.5" />
                <span>{stockText}</span>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-1.5 shrink-0 pb-0.5">
              {coupon.originalPrice && (
                <span className="text-gray-500 line-through text-sm font-medium decoration-gray-500/50">
                  {fmtMoney(coupon.originalPrice)}
                </span>
              )}
              <span className={`font-black text-4xl tracking-tight leading-none ${isGray ? 'text-gray-400' : 'text-coupon-price'}`}>
                {fmtMoney(coupon.price ?? 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* --- Footer (Click to redeem) --- */}
      <div
        className="relative w-full pb-3 pt-2 bg-[#1a1a1a]"
        style={{
          maskImage: "radial-gradient(circle at bottom, transparent 6px, black 6.5px), linear-gradient(black, black)",
          maskSize: "20px 20px, 100% calc(100% - 10px)",
          maskPosition: "bottom, top",
          maskRepeat: "repeat-x, no-repeat",
          maskComposite: "intersect",
          WebkitMaskImage: "radial-gradient(circle at bottom, transparent 6px, black 6.5px), linear-gradient(black, black)",
          WebkitMaskSize: "20px 20px, 100% calc(100% - 10px)",
          WebkitMaskPosition: "bottom, top",
          WebkitMaskRepeat: "repeat-x, no-repeat",
          WebkitMaskComposite: "source-over, source-over",
        }}
      >
        <div className="absolute top-0 inset-x-4 border-t border-dashed border-coupon-dashed" />
        <div className="text-center mt-1">
          <span className={`font-mono text-[10px] tracking-widest uppercase opacity-80 ${isRedeemedToday
            ? "text-emerald-500 font-bold"
            : statusText.includes("Expired")
              ? "text-red-500 font-bold"
              : "text-coupon-redeem"
            }`}>
            {isRedeemedToday
              ? "REDEEMED"
              : statusText.includes("Expired")
                ? "Missed out"
                : (isGray ? "VIEW DEAL" : "click to redeem")}
          </span>
        </div>
      </div>

      {/* Already Redeemed Modal */}
      {showRedeemedModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowRedeemedModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[#111821] border border-white/10 p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 mx-auto w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-emerald-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5-3.9 19.5m-2.1-19.5-3.9 19.5" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Already Redeemed</h3>
            <p className="text-white/60 text-sm mb-6">
              Sorry, you have already redeemed this offer for today. Come back tomorrow!
            </p>
            <button
              onClick={() => setShowRedeemedModal(false)}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3 rounded-xl transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
