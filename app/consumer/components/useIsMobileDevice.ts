"use client";

import { useEffect, useState } from "react";

export function useIsMobileDevice() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      const hasTouch =
        "ontouchstart" in window || (navigator.maxTouchPoints ?? 0) > 0;

      const smallScreen = window.matchMedia("(max-width: 768px)").matches;

      setIsMobile(hasTouch && smallScreen);
    };

    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return isMobile;
}
