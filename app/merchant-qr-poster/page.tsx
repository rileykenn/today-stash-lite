/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import QRCode from "react-qr-code";
import { sb } from "@/lib/supabaseBrowser";

type MerchantPosterData = {
  id: string;
  name: string;
  merchant_pin: string | null;
};

type PosterVariant = "a4" | "half";

interface PosterCommonProps {
  merchant: MerchantPosterData;
  logoUrl: string;
  qrValue: string;
  fallbackCode: string;
}

/* =======================
   Full A4 layout
   ======================= */

function FullPosterLayout({
  merchant,
  logoUrl,
  qrValue,
  fallbackCode,
}: PosterCommonProps) {
  return (
    <section
      className="
        bg-white text-black rounded-2xl shadow-2xl
        flex flex-col gap-8 md:gap-10 p-8 md:p-10
        w-full max-w-[850px]
        print:max-w-none print:h-full print:justify-between
      "
    >
      {/* Top: logo + titles */}
      <header className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-white border border-neutral-200 flex items-center justify-center overflow-hidden">
            <img
              src={logoUrl}
              alt="Today’s Stash logo"
              className="w-8 h-8 md:w-10 md:h-10 object-contain"
            />
          </div>
          <div>
            <p className="text-[10px] md:text-[11px] uppercase tracking-[0.22em] text-neutral-500 font-semibold">
              Today&apos;s Stash
            </p>
            <p className="text-lg md:text-xl font-bold">
              In-store redemption code
            </p>
          </div>
        </div>

        <div className="text-right max-w-xs">
          <p className="text-[10px] md:text-[11px] uppercase tracking-[0.22em] text-neutral-500 font-semibold">
            Venue
          </p>
          <p className="text-lg md:text-xl font-bold">{merchant.name}</p>
          <p className="text-[10px] md:text-[11px] text-neutral-500 mt-1">
            This single code works for all Today&apos;s Stash deals at your
            venue — now and in the future.
          </p>
        </div>
      </header>

      {/* QR centre */}
      <div className="flex flex-col items-center gap-3 md:gap-4 mt-2">
        <div className="bg-white p-4 md:p-6 rounded-3xl border border-neutral-200 shadow-lg">
          <QRCode value={qrValue} size={260} />
        </div>
        <p className="text-[11px] md:text-xs text-neutral-600 text-center max-w-sm">
          Members scan this code from inside the{" "}
          <span className="font-semibold">Today&apos;s Stash</span> app to
          redeem any active deal at{" "}
          <span className="font-semibold">{merchant.name}</span>.
        </p>
      </div>

      {/* How customers redeem */}
      <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 md:p-6">
        <p className="text-[10px] md:text-[11px] uppercase tracking-[0.22em] text-neutral-500 font-semibold mb-2">
          How customers redeem
        </p>
        <ol className="text-[11px] md:text-sm text-neutral-700 space-y-1">
          <li>1. Open the Today&apos;s Stash app.</li>
          <li>2. Choose a deal for {merchant.name}.</li>
          <li>3. Tap &quot;Redeem in store&quot;.</li>
          <li>4. Scan the QR code on this poster at the counter.</li>
        </ol>
      </div>

      {/* Fallback 6-digit code block */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 md:p-6 text-center">
        <p className="text-[10px] md:text-[11px] uppercase tracking-[0.22em] text-emerald-900 font-semibold mb-1">
          If the QR won&apos;t scan
        </p>
        <p className="text-[11px] md:text-sm text-emerald-900">
          Customers can tap{" "}
          <span className="font-semibold">&quot;Enter code manually&quot;</span>{" "}
          in the app and type this 6-digit code:
        </p>

        <p className="mt-2 md:mt-3 text-3xl md:text-4xl tracking-[0.3em] font-mono font-bold text-emerald-900">
          {fallbackCode}
        </p>

        <p className="text-[10px] md:text-[11px] text-emerald-900 mt-2">
          This code is the same one encoded in the QR above.
        </p>
      </div>

      <footer className="text-[9px] md:text-[10px] text-neutral-500 text-center mt-1">
        Place this sheet on your front counter. Redemptions are logged
        automatically inside Today&apos;s Stash — no staff interaction or
        manual tracking required.
      </footer>
    </section>
  );
}

/* =======================
   Half-A4 landscape layout
   ======================= */

function HalfPosterLayout({
  merchant,
  logoUrl,
  qrValue,
  fallbackCode,
}: PosterCommonProps) {
  return (
    <section
      className="
        bg-white text-black rounded-2xl shadow-2xl
        w-full max-w-[850px]
        p-5 md:p-6
        flex flex-col gap-4
      "
    >
      {/* compact header across the top */}
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white border border-neutral-200 flex items-center justify-center overflow-hidden">
            <img
              src={logoUrl}
              alt="Today’s Stash logo"
              className="w-8 h-8 object-contain"
            />
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.22em] text-neutral-500 font-semibold">
              Today&apos;s Stash
            </p>
            <p className="text-sm md:text-base font-bold leading-snug">
              In-store redemption code
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-[9px] uppercase tracking-[0.22em] text-neutral-500 font-semibold">
            Venue
          </p>
          <p className="text-sm md:text-base font-bold">{merchant.name}</p>
          <p className="hidden md:block text-[9px] text-neutral-500 mt-0.5">
            Works for every Today&apos;s Stash deal at this venue.
          </p>
        </div>
      </header>

      {/* Main horizontal band: QR on left, instructions + code on right */}
      <div
        className="
          flex-1 flex flex-col md:flex-row print:flex-row
          items-stretch gap-4 md:gap-6 print:gap-6
        "
      >
        {/* QR side */}
        <div className="flex flex-col items-center justify-center md:w-[40%] print:w-[40%]">
          <div className="bg-white p-3 md:p-4 rounded-3xl border border-neutral-200 shadow-lg">
            <QRCode value={qrValue} size={200} />
          </div>
          <p className="mt-2 text-[10px] text-neutral-600 text-center max-w-[220px]">
            Scan from inside the{" "}
            <span className="font-semibold">Today&apos;s Stash</span> app to
            redeem any deal at{" "}
            <span className="font-semibold">{merchant.name}</span>.
          </p>
        </div>

        {/* Right content */}
        <div className="flex-1 flex flex-col gap-3">
          {/* How customers redeem */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 md:p-4">
            <p className="text-[9px] uppercase tracking-[0.22em] text-neutral-500 font-semibold mb-1">
              How customers redeem
            </p>
            <ol className="text-[10px] md:text-[11px] text-neutral-700 space-y-0.5 leading-snug">
              <li>1. Open the Today&apos;s Stash app.</li>
              <li>2. Choose a deal for {merchant.name}.</li>
              <li>3. Tap &quot;Redeem in store&quot;.</li>
              <li>4. Scan this QR code at the counter.</li>
            </ol>
          </div>

          {/* Fallback code, still very visible */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 md:p-4 text-center">
            <p className="text-[9px] uppercase tracking-[0.22em] text-emerald-900 font-semibold mb-1">
              If the QR won&apos;t scan
            </p>
            <p className="text-[10px] text-emerald-900">
              Tap <span className="font-semibold">“Enter code manually”</span>{" "}
              in the app and type:
            </p>
            <p className="mt-1 text-2xl md:text-3xl tracking-[0.35em] font-mono font-bold text-emerald-900">
              {fallbackCode}
            </p>
            <p className="mt-1 text-[9px] text-emerald-900">
              This 6-digit code matches the QR on this poster.
            </p>
          </div>
        </div>
      </div>

      {/* Dotted cut line */}
      <footer className="text-[9px] text-neutral-400 text-center mt-3 pt-2 border-t border-dashed border-neutral-400">
        Cut along this line
      </footer>
    </section>
  );
}

/* =======================
   Inner Page with hooks
   ======================= */

function MerchantQRPosterInner() {
  const searchParams = useSearchParams();
  const merchantId = searchParams.get("merchantId");

  const [merchant, setMerchant] = useState<MerchantPosterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [printMode, setPrintMode] = useState<PosterVariant | null>(null);

  useEffect(() => {
    if (!merchantId) {
      setLoading(false);
      return;
    }

    (async () => {
      const { data, error } = await sb
        .from("merchants")
        .select("id, name, merchant_pin")
        .eq("id", merchantId)
        .maybeSingle();

      if (error) {
        console.error("Error loading merchant for poster:", error);
        setMerchant(null);
      } else {
        setMerchant(data as MerchantPosterData);
      }
      setLoading(false);
    })();
  }, [merchantId]);

  // Sync printMode to body attribute for @media print
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (printMode) {
      document.body.dataset.printMode = printMode;
    } else {
      delete document.body.dataset.printMode;
    }
    return () => {
      delete document.body.dataset.printMode;
    };
  }, [printMode]);

  // Reset after print
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleAfterPrint = () => setPrintMode(null);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#05070A] text-white flex items-center justify-center">
        <p className="text-sm text-white/70">Loading QR poster…</p>
      </main>
    );
  }

  if (!merchant) {
    return (
      <main className="min-h-screen bg-[#05070A] text-white flex items-center justify-center">
        <p className="text-sm text-white/70">
          Merchant not found. Make sure the link includes a valid merchantId.
        </p>
      </main>
    );
  }

  const qrValue = merchant.merchant_pin ?? merchant.id;
  const fallbackCode = merchant.merchant_pin ?? "000000";

  const logoPath = "LOGO/todays%20stash%20logo%20chest%20only.png";
  const logoUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${logoPath}`;

  const triggerPrint = (variant: PosterVariant) => {
    setPrintMode(variant);
    setTimeout(() => window.print(), 50);
  };

  return (
    <>
      {/* PRINT STYLES */}
      <style jsx global>{`
        @page {
          size: A4;
          margin: 0;
        }

        @media print {
          html,
          body {
            margin: 0;
            padding: 0;
            width: 210mm;
            height: 297mm;
            background: #ffffff !important;
          }

          body * {
            visibility: hidden;
          }

          #poster-a4,
          #poster-half {
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            box-shadow: none !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          #poster-a4 {
            top: 0;
            width: 210mm;
            height: 297mm;
          }

          #poster-half {
            top: 0;
            width: 210mm;
            height: 148.5mm; /* top half of an A4 */
          }

          /* Only show the selected variant */
          body[data-print-mode="a4"] #poster-a4,
          body[data-print-mode="a4"] #poster-a4 * {
            visibility: visible;
          }

          body[data-print-mode="half"] #poster-half,
          body[data-print-mode="half"] #poster-half * {
            visibility: visible;
          }
        }
      `}</style>

      {/* SCREEN PREVIEW */}
      <main className="min-h-screen bg-[#05070A] text-white px-4 py-8 flex flex-col items-center">
        {/* Header bar */}
        <div className="w-full max-w-6xl flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6 print:hidden">
          <div className="space-y-1">
            <p className="text-xs text-white/50">
              Today&apos;s Stash · Merchant QR poster
            </p>
            <p className="text-sm text-white/70">
              Choose which size you want to print for{" "}
              <span className="font-semibold text-white">{merchant.name}</span>.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => triggerPrint("a4")}
              className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-[0_0_20px_rgba(16,185,129,0.45)] hover:bg-emerald-400"
            >
              Print full A4
            </button>
            <button
              type="button"
              onClick={() => triggerPrint("half")}
              className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-[0_0_20px_rgba(16,185,129,0.35)] hover:bg-emerald-600"
            >
              Print half page (landscape)
            </button>
          </div>
        </div>

        {/* Posters preview */}
        <div className="w-full max-w-6xl flex flex-col gap-10 items-center pb-10">
          {/* Full A4 preview */}
          <div className="w-full flex flex-col items-center gap-3">
            <div className="w-full flex items-center justify-between max-w-3xl print:hidden">
              <p className="text-xs text-white/60 font-medium">
                Full A4 poster
              </p>
              <button
                type="button"
                onClick={() => triggerPrint("a4")}
                className="text-[11px] rounded-full border border-emerald-500/70 px-3 py-1 hover:bg-emerald-500 hover:text-white transition"
              >
                Print this size
              </button>
            </div>

            <div id="poster-a4">
              <FullPosterLayout
                merchant={merchant}
                logoUrl={logoUrl}
                qrValue={qrValue}
                fallbackCode={fallbackCode}
              />
            </div>
          </div>

          {/* Half-page landscape preview */}
          <div className="w-full flex flex-col items-center gap-3">
            <div className="w-full flex items-center justify-between max-w-3xl print:hidden">
              <p className="text-xs text-white/60 font-medium">
                Half-page landscape poster (prints on top half of A4)
              </p>
              <button
                type="button"
                onClick={() => triggerPrint("half")}
                className="text-[11px] rounded-full border border-emerald-500/70 px-3 py-1 hover:bg-emerald-500 hover:text-white transition"
              >
                Print this size
              </button>
            </div>

            <div id="poster-half">
              <HalfPosterLayout
                merchant={merchant}
                logoUrl={logoUrl}
                qrValue={qrValue}
                fallbackCode={fallbackCode}
              />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

/* =======================
   Suspense-wrapped page
   ======================= */

export default function MerchantQRPosterPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#05070A] text-white flex items-center justify-center">
          <p className="text-sm text-white/70">Loading QR poster…</p>
        </main>
      }
    >
      <MerchantQRPosterInner />
    </Suspense>
  );
}
