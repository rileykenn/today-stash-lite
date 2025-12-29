"use client";

import React, { useEffect, useState } from "react";
import { useIsMobileDevice } from "./useIsMobileDevice";
import { QRScanner } from "./QRScanner";

export default function MobileOnlyRedeemBlock({
  onDetected,
  onDeviceCheck,
}: {
  onDetected: (value: string) => void;
  onDeviceCheck?: (isMobile: boolean) => void;
}) {
  const isMobile = useIsMobileDevice();
  const [reportedOnce, setReportedOnce] = useState(false);

  useEffect(() => {
    // Report at least once, and also keep parent in sync if it changes (resize/orientation)
    onDeviceCheck?.(isMobile);

    if (!reportedOnce) setReportedOnce(true);
  }, [isMobile, onDeviceCheck, reportedOnce]);

  if (!isMobile) {
    return (
      <div className="w-full rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 text-center">
        <p className="text-sm font-semibold text-white">
          Please redeem on your mobile phone
        </p>
        <p className="mt-1 text-[12px] text-white/70">
          Redemption is only available on mobile. Open Today&apos;s Stash on your
          phone to scan the flyer at the counter.
        </p>
      </div>
    );
  }

  return <QRScanner onDetected={onDetected} />;
}
