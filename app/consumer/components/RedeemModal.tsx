"use client";

/* eslint-disable @next/next/no-img-element */

import React from "react";
import type { Coupon, Step } from "./types";
import ConfettiBurst from "./ConfettiBurst";
import MobileOnlyRedeemBlock from "./MobileOnlyRedeemBlock";

export default function RedeemModal({
  open,
  onClose,
  activeDeal,
  step,
  lastScanned,
  flyerCode,
  setFlyerCode,
  submitting,
  submitError,
  onConfirm,
  onQrDetected,
}: {
  open: boolean;
  onClose: () => void;
  activeDeal: Coupon | null;
  step: Step;
  lastScanned: string | null;
  flyerCode: string;
  setFlyerCode: (v: string) => void;
  submitting: boolean;
  submitError: string | null;
  onConfirm: (codeOverride?: string) => void;
  onQrDetected: (value: string) => void;
}) {
  const [isMobile, setIsMobile] = React.useState(true);

  if (!open) return null;

  return (
    <div
      className="
        fixed inset-0 z-[100]
        flex items-end sm:items-center justify-center
        min-h-[100dvh]
      "
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <button
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Close"
      />

      {/* Panel */}
      <div
        className="
          relative w-full max-w-full sm:max-w-md
          rounded-t-3xl sm:rounded-2xl
          bg-[#070F18] text-white shadow-2xl ring-1 ring-white/10
          pt-3 sm:pt-5
          pb-[calc(env(safe-area-inset-bottom)+16px)]
          px-5 sm:px-6
          max-h-[88dvh] overflow-y-auto overflow-x-hidden
          pointer-events-auto box-border
        "
      >
        {/* Drag handle */}
        <div className="mx-auto mb-2 sm:hidden h-1.5 w-10 rounded-full bg-white/20" />

        {/* Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-white/10">
          {activeDeal?.merchant?.logoUrl && (
            <img
              src={activeDeal.merchant.logoUrl}
              alt={activeDeal.merchant.name || "Merchant"}
              className="h-10 w-10 rounded-md object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-white/60 truncate">
              {activeDeal?.merchant?.name ?? "Merchant"}
            </p>
            <h3 className="text-base font-semibold leading-tight truncate">
              {activeDeal?.title ?? "Deal"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="ml-auto -m-2 p-2 rounded-md hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/20"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        {step === "instructions" ? (
          <div className="pt-4 space-y-5">
            <h4 className="text-lg font-semibold">Redeem this deal at the counter</h4>

            <p className="text-sm text-white/80">
              When you&apos;re ready to pay,{" "}
              <span className="font-semibold text-emerald-300">
                scan the Today&apos;s Stash QR flyer
              </span>{" "}
              at the checkout. This confirms you&apos;re in the right store and
              marks this deal as used on your account.
            </p>

            {/* Mobile gate + QR scanner */}
            <MobileOnlyRedeemBlock
              onDetected={onQrDetected}
              onDeviceCheck={(v) => setIsMobile(v)}
            />

            {lastScanned && (
              <p className="text-[11px] text-emerald-300 text-center pt-1">
                QR detected · code filled automatically ({lastScanned})
              </p>
            )}

            {/* Mobile-only manual entry + confirm */}
            {isMobile && (
              <>
                {/* Divider */}
                <div className="flex items-center gap-3 pt-2">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                    or
                  </span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                {/* Manual code entry */}
                <div className="space-y-2">
                  <p className="text-xs text-white/75">
                    Having trouble scanning?{" "}
                    <span className="font-semibold">
                      Enter the 6-digit code printed under the QR instead.
                    </span>
                  </p>

                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-white/70 mb-1.5">
                        6-digit flyer code
                      </label>
                      <input
                        inputMode="numeric"
                        maxLength={6}
                        value={flyerCode}
                        onChange={(e) =>
                          setFlyerCode(
                            e.target.value.replace(/[^\d]/g, "").slice(0, 6)
                          )
                        }
                        className="
                          w-full h-11 rounded-xl bg-white/5 px-3
                          text-white caret-white
                          text-base tracking-[0.25em] text-center font-semibold
                          outline-none ring-1 ring-white/15
                          placeholder:text-white/30
                          focus:ring-2 focus:ring-emerald-400/70
                        "
                        placeholder="000000"
                      />
                    </div>
                  </div>

                  {submitError && (
                    <p className="text-xs text-red-400 pt-1">{submitError}</p>
                  )}

                  <div className="pt-2">
                    <button
                      onClick={() => onConfirm()}
                      disabled={submitting}
                      className="
                        w-full h-12 rounded-xl
                        bg-emerald-500 hover:bg-emerald-400
                        disabled:opacity-60 disabled:cursor-not-allowed
                        px-4
                        font-semibold text-white text-sm
                        whitespace-nowrap
                        shadow-[0_0_18px_rgba(16,185,129,0.55)]
                      "
                    >
                      {submitting ? "Confirming…" : "Confirm redemption"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="pt-6 pb-2 space-y-4 text-center relative overflow-hidden">
            {/* Confetti */}
            <ConfettiBurst />

            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-400/40">
              <span className="text-2xl">✅</span>
            </div>

            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
              Show this screen to the staff
            </p>

            <div className="mx-auto mt-2 max-w-sm rounded-xl border border-emerald-400/60 bg-emerald-500/5 px-4 py-3 text-left">
              <p className="text-[11px] font-semibold text-emerald-300 mb-1">
                Offer validated
              </p>
              <p className="text-sm font-semibold text-white">
                {activeDeal?.title ?? "Deal"}
              </p>
              <p className="text-xs text-white/70 mt-0.5">
                at{" "}
                <span className="font-medium">
                  {activeDeal?.merchant?.name ?? "the business"}
                </span>
              </p>
            </div>

            <p className="text-sm text-white/75 px-1">
              This deal has been marked as redeemed on your account. Staff can
              use this screen to confirm which offer you&apos;re using.
            </p>

            <button
              onClick={onClose}
              className="mt-3 h-11 w-full rounded-xl bg-white/10 hover:bg-white/15 text-sm font-medium"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
