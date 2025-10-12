'use client';
import React from 'react';

export default function Gold3DBanner({
  headline = 'SPEND $99 TO',
  text = 'SAVE $3.2K',
  className = '',
  // 🔽 Responsive defaults; tweak if you like
  size = 'clamp(44px, 12vw, 120px)',
  track = 'clamp(0.5px, 0.3vw, 1.5px)',
}: {
  headline?: string;
  text?: string;
  className?: string;
  /** CSS size value e.g. "clamp(44px,12vw,120px)" */
  size?: string;
  /** CSS letter-spacing value e.g. "clamp(0.5px,0.3vw,1.5px)" */
  track?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-2 ${className}`}
      style={
        {
          // expose to children spans
          ['--gold-size' as any]: size,
          ['--gold-track' as any]: track,
        } as React.CSSProperties
      }
    >
      <span
        className="block font-bada text-white text-xl sm:text-2xl tracking-wide"
        style={{
          textShadow:
            '0 3px 6px rgba(0,0,0,0.55), 0 0 18px rgba(255,255,255,0.10)',
        }}
      >
        {headline}
      </span>
      <Gold3D text={text} />
    </div>
  );
}

function Gold3D({ text }: { text: string }) {
  return (
    <div className="relative inline-block breathe">
      {/* Deep shadow */}
      <span
        className="absolute inset-0 font-bada font-black"
        style={{
          color: '#7A2E00',
          fontSize: 'var(--gold-size)',
          lineHeight: 1,
          letterSpacing: 'var(--gold-track)',
          transform: 'translate(clamp(4px,1vw,10px), clamp(5px,1.2vw,14px))',
          filter: 'drop-shadow(0 clamp(3px,0.8vw,10px) clamp(5px,1vw,16px) rgba(0,0,0,0.45))',
        }}
      >
        {text}
      </span>

      {/* Warm shadow */}
      <span
        className="absolute inset-0 font-bada font-black"
        style={{
          color: '#C55A00',
          fontSize: 'var(--gold-size)',
          lineHeight: 1,
          letterSpacing: 'var(--gold-track)',
          transform: 'translate(clamp(2px,0.6vw,6px), clamp(3px,0.8vw,8px))',
          filter: 'drop-shadow(0 clamp(2px,0.6vw,6px) clamp(4px,0.9vw,10px) rgba(197,90,0,0.45))',
        }}
      >
        {text}
      </span>

      {/* Dark outer edge */}
      <span
        className="relative font-bada font-black"
        style={{
          WebkitTextStroke: 'clamp(6px,1.2vw,16px) #7A2E00',
          color: 'transparent',
          fontSize: 'var(--gold-size)',
          lineHeight: 1,
          letterSpacing: 'var(--gold-track)',
        }}
      >
        {text}
      </span>

      {/* Orange mid edge */}
      <span
        className="absolute inset-0 font-bada font-black"
        style={{
          WebkitTextStroke: 'clamp(4px,1vw,12px) #FF9A00',
          color: 'transparent',
          fontSize: 'var(--gold-size)',
          lineHeight: 1,
          letterSpacing: 'var(--gold-track)',
        }}
      >
        {text}
      </span>

      {/* White inner edge */}
      <span
        className="absolute inset-0 font-bada font-black"
        style={{
          WebkitTextStroke: 'clamp(2px,0.5vw,6px) #FFFFFF',
          color: 'transparent',
          fontSize: 'var(--gold-size)',
          lineHeight: 1,
          letterSpacing: 'var(--gold-track)',
          textShadow:
            '0 0 clamp(0.5px,0.1vw,1px) rgba(255,255,255,0.95), 0 clamp(0.5px,0.1vw,1px) 0 rgba(255,255,255,0.9)',
        }}
      >
        {text}
      </span>

      {/* Gold fill */}
      <span
        className="absolute inset-0 font-bada font-black bg-clip-text text-transparent"
        style={{
          backgroundImage:
            'linear-gradient(180deg, #FFE259 0%, #FFC233 55%, #FF7B00 100%)',
          fontSize: 'var(--gold-size)',
          lineHeight: 1,
          letterSpacing: 'var(--gold-track)',
          filter:
            'drop-shadow(0 0 clamp(2px,0.4vw,10px) rgba(255,255,255,0.30)) drop-shadow(0 clamp(2px,0.6vw,8px) clamp(3px,0.8vw,14px) rgba(255,180,60,0.45))',
        }}
      >
        {text}
      </span>

      {/* Shine */}
      <span
        className="absolute inset-0 font-bada font-black shine-clip"
        style={{
          fontSize: 'var(--gold-size)',
          lineHeight: 1,
          letterSpacing: 'var(--gold-track)',
        }}
        aria-hidden
      >
        {text}
      </span>
    </div>
  );
}
