'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';

export default function Page() {
  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-6">
      <ExportableSpendSave />
    </main>
  );
}

function ExportableSpendSave() {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  // Ensure the BebasNeueExpandedProBoldItalic font is fully loaded before preview/export
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // @ts-ignore
        if (document?.fonts?.load) await (document.fonts as any).load('1rem "BebasNeueExpandedProBoldItalic"');
        // @ts-ignore
        if (document?.fonts?.ready) await (document.fonts as any).ready;
      } catch {}
      if (mounted) setReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleDownload = useCallback(async () => {
    if (!nodeRef.current) return;
    try {
      // @ts-ignore
      if (document?.fonts?.ready) await (document.fonts as any).ready;
    } catch {}
    const canvas = await html2canvas(nodeRef.current, {
      backgroundColor: null,
      scale: 4,
      useCORS: true,
      allowTaint: true,
      removeContainer: true,
    });
    const link = document.createElement('a');
    link.download = 'spend-99-save-3.2k.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, []);

  return (
    <div className="flex flex-col items-center gap-6">
      <div ref={nodeRef} className="select-none text-center leading-[0.95] px-6 py-4">
        <span
          className="block font-bada text-white text-[64px] tracking-wide mb-2"
          style={{
            textShadow:
              '0 3px 6px rgba(0,0,0,0.55), 0 0 18px rgba(255,255,255,0.10)',
          }}
        >
          SPEND $99 TO
        </span>

        <Gold3D text="SAVE $3.2K" />
      </div>

      <button
        onClick={handleDownload}
        disabled={!ready}
        className="rounded-xl bg-white px-5 py-3 font-semibold text-black hover:bg-zinc-100 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {ready ? 'Download transparent PNG' : 'Loading font…'}
      </button>
    </div>
  );
}

function Gold3D({ text }: { text: string }) {
  const size = 120;
  const track = 1.5;

  return (
    // Apply breathe to the wrapper so ALL layers scale together
    <div className="relative inline-block breathe">
      {/* EXTRUSION 1 — deep shadow */}
      <span
        className="absolute inset-0 font-bada font-black"
        style={{
          color: '#7A2E00',
          fontSize: `${size}px`,
          lineHeight: 1,
          letterSpacing: `${track}px`,
          transform: 'translate(10px, 14px)',
          filter: 'drop-shadow(0 10px 16px rgba(0,0,0,0.45))',
        }}
      >
        {text}
      </span>

      {/* EXTRUSION 2 — warm bounce shadow */}
      <span
        className="absolute inset-0 font-bada font-black"
        style={{
          color: '#C55A00',
          fontSize: `${size}px`,
          lineHeight: 1,
          letterSpacing: `${track}px`,
          transform: 'translate(6px, 8px)',
          filter: 'drop-shadow(0 6px 10px rgba(197,90,0,0.45))',
        }}
      >
        {text}
      </span>

      {/* BACKPLATE STROKE — dark outer edge */}
      <span
        className="relative font-bada font-black"
        style={{
          WebkitTextStroke: '16px #7A2E00',
          color: 'transparent',
          fontSize: `${size}px`,
          lineHeight: 1,
          letterSpacing: `${track}px`,
        }}
      >
        {text}
      </span>

      {/* MID STROKE — orange */}
      <span
        className="absolute inset-0 font-bada font-black"
        style={{
          WebkitTextStroke: '12px #FF9A00',
          color: 'transparent',
          fontSize: `${size}px`,
          lineHeight: 1,
          letterSpacing: `${track}px`,
        }}
      >
        {text}
      </span>

      {/* INNER STROKE — white */}
      <span
        className="absolute inset-0 font-bada font-black"
        style={{
          WebkitTextStroke: '6px #FFFFFF',
          color: 'transparent',
          fontSize: `${size}px`,
          lineHeight: 1,
          letterSpacing: `${track}px`,
          textShadow:
            '0 0 1px rgba(255,255,255,0.95), 0 1px 0 rgba(255,255,255,0.9)',
        }}
      >
        {text}
      </span>

      {/* GOLD FILL — keep ONLY the gold gradient here */}
      <span
        className="absolute inset-0 font-bada font-black bg-clip-text text-transparent"
        style={{
          backgroundImage:
            'linear-gradient(180deg, #FFE259 0%, #FFC233 55%, #FF7B00 100%)',
          fontSize: `${size}px`,
          lineHeight: 1,
          letterSpacing: `${track}px`,
          filter:
            'drop-shadow(0 0 10px rgba(255,255,255,0.30)) drop-shadow(0 8px 14px rgba(255,180,60,0.45))',
        }}
      >
        {text}
      </span>

      {/* SHINE OVERLAY — separate animated layer, clipped to text */}
      <span
        className="absolute inset-0 font-bada font-black shine-clip"
        style={{
          fontSize: `${size}px`,
          lineHeight: 1,
          letterSpacing: `${track}px`,
        }}
        aria-hidden
      >
        {text}
      </span>

      {/* (Optional) specular dot highlight — keep if you still want it
      <span
        className="pointer-events-none absolute -top-1 left-1 rounded-full"
        aria-hidden
        style={{
          width: '30%',
          height: '40%',
          background:
            'radial-gradient(closest-side, rgba(255,255,255,0.24), rgba(255,255,255,0) 70%)',
          transform: 'translate(8%, 8%)',
        }}
      />
      */}
    </div>
  );
}
