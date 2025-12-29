// app/consumer/components/ConfettiBurst.tsx
"use client";

import React, { useMemo } from "react";

export default function ConfettiBurst() {
  const pieces = useMemo(() => Array.from({ length: 70 }, (_, i) => i), []);

  return (
    <>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {pieces.map((i) => {
          const left = Math.random() * 100;
          const delay = Math.random() * 0.4;
          const duration = 0.9 + Math.random() * 0.6;
          const size = 6 + Math.random() * 6;
          const rotate = Math.random() * 360;

          return (
            <span
              key={i}
              className="confetti-piece"
              style={{
                left: `${left}%`,
                animationDelay: `${delay}s`,
                animationDuration: `${duration}s`,
                width: `${size}px`,
                height: `${size}px`,
                transform: `rotate(${rotate}deg)`,
              }}
            />
          );
        })}
      </div>

      <style jsx>{`
        .confetti-piece {
          position: absolute;
          top: -10px;
          border-radius: 999px;
          background: linear-gradient(135deg, #22c55e, #4ade80, #bbf7d0);
          opacity: 0.9;
          animation-name: confetti-fall;
          animation-timing-function: cubic-bezier(0.25, 0.7, 0.25, 1);
          animation-fill-mode: forwards;
        }

        @keyframes confetti-fall {
          0% {
            transform: translate3d(0, -20px, 0) scale(1) rotate(0deg);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          100% {
            transform: translate3d(0, 260px, 0) scale(0.9) rotate(260deg);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
}
