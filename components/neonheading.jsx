'use client';

export default function NeonHeading({ text = 'SAVE up to $3,000' }) {
  return (
    <div className="relative select-none">
      <div className="absolute inset-0 animate-[neonPulse_3s_ease-in-out_infinite] pointer-events-none" />

      <svg
        viewBox="0 0 1200 260"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-[120px] sm:h-[160px] md:h-[200px]"
      >
        <defs>
          {/* Fill gradient (deep purple -> pink) */}
          <linearGradient id="fillGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#5B0BE0" />
            <stop offset="55%" stopColor="#A44CEE" />
            <stop offset="100%" stopColor="#FF85E0" />
          </linearGradient>

          {/* Stroke gradient (cooler + lighter) */}
          <linearGradient id="strokeGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#3D2CF6" />
            <stop offset="60%" stopColor="#9D8CFF" />
            <stop offset="100%" stopColor="#FFC0EE" />
          </linearGradient>

          {/* Electric blue drop shadow + neon glow */}
          <filter id="neon" x="-30%" y="-50%" width="160%" height="200%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#3BE3FF" floodOpacity="0.9" />
            <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor="#7C3AED" floodOpacity="0.65" />
            <feDropShadow dx="0" dy="0" stdDeviation="18" floodColor="#A855F7" floodOpacity="0.55" />
            <feDropShadow dx="0" dy="0" stdDeviation="28" floodColor="#60A5FA" floodOpacity="0.45" />
          </filter>
        </defs>

        {/* Outline */}
        <text
          x="50%"
          y="60%"
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="var(--font-geist-sans), ui-sans-serif, system-ui"
          fontWeight="900"
          fontSize="140"
          fill="none"
          stroke="url(#strokeGrad)"
          strokeWidth="12"
          filter="url(#neon)"
          letterSpacing="2"
        >
          {text}
        </text>

        {/* Fill */}
        <text
          x="50%"
          y="60%"
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="var(--font-geist-sans), ui-sans-serif, system-ui"
          fontWeight="900"
          fontSize="140"
          fill="url(#fillGrad)"
          stroke="white"
          strokeWidth="1.5"
          letterSpacing="2"
        >
          {text}
        </text>
      </svg>

      <style jsx global>{`
        @keyframes neonPulse {
          0%, 100% {
            opacity: 0.35;
            filter: drop-shadow(0 0 12px #7c3aed) drop-shadow(0 0 22px #60a5fa);
          }
          50% {
            opacity: 0.6;
            filter: drop-shadow(0 0 18px #a855f7) drop-shadow(0 0 32px #38bdf8);
          }
        }
      `}</style>
    </div>
  );
}
