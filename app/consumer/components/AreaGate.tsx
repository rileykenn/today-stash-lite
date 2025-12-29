// app/consumer/components/AreaGate.tsx
"use client";

import React from "react";
import type { Town } from "./types";

export default function AreaGate({
  areaOptions,
  selectedArea,
  onSelectArea,
  accessCode,
  onChangeAccessCode,
  currentTown,
  unlockError,
  unlockLoading,
  onSubmit,
}: {
  areaOptions: { key: string; label: string }[];
  selectedArea: string | null;
  onSelectArea: (next: string | null) => void;

  accessCode: string;
  onChangeAccessCode: (next: string) => void;

  currentTown?: Town;
  unlockError: string | null;
  unlockLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl bg-[#111923] ring-1 ring-white/10 p-4 sm:p-5 space-y-4"
    >
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-white/70 mb-1.5">
            Choose your town / area
          </label>

          <select
            className="w-full h-11 rounded-xl bg-white/5 px-3 text-sm text-white outline-none ring-1 ring-white/15 focus:ring-2 focus:ring-emerald-400/70"
            value={selectedArea ?? ""}
            onChange={(e) => onSelectArea(e.target.value || null)}
          >
            {areaOptions.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label className="block text-xs font-medium text-white/70 mb-1.5">
            Enter your 4-digit access code
          </label>

          <input
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={accessCode}
            onChange={(e) =>
              onChangeAccessCode(
                e.target.value.replace(/[^\d]/g, "").slice(0, 4)
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
            placeholder="0000"
          />
        </div>
      </div>

      {currentTown && (
        <p className="text-[11px] text-white/55">
          {currentTown.is_free
            ? "This town is part of our free beta program – you won’t be charged to redeem deals."
            : "This town requires an active membership to redeem deals."}
        </p>
      )}

      {unlockError && <p className="text-xs text-red-400">{unlockError}</p>}

      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        <button
          type="submit"
          disabled={unlockLoading}
          className="
            h-11 rounded-xl
            bg-emerald-500 hover:bg-emerald-400
            disabled:opacity-60 disabled:cursor-not-allowed
            px-4
            text-sm font-semibold text-white
            whitespace-nowrap
          "
        >
          {unlockLoading ? "Checking code…" : "Unlock deals for this town"}
        </button>
      </div>
    </form>
  );
}
