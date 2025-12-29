/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";

export type SelectedTown = {
  town: string;
  postcode: string | null;
  fullText: string;
};

interface TownAutocompleteProps {
  label?: string;
  required?: boolean;
  initialValue?: string;
  onSelect: (value: SelectedTown | null) => void;
  onTextChange?: (text: string) => void;
}

// Let TypeScript know google exists at runtime
declare const google: any;

export default function TownAutocomplete({
  label = "Your town",
  required = true,
  initialValue = "",
  onSelect,
  onTextChange,
}: TownAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [value, setValue] = useState(initialValue);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY;
    if (!apiKey) {
      console.warn("NEXT_PUBLIC_GOOGLE_PLACES_KEY is not set");
      setReady(true);
      return;
    }

    let autocomplete: any = null;
    let cancelled = false;
    let pollId: ReturnType<typeof setInterval> | null = null;

    // ---------- Main handler when user picks a place ----------
    function handlePlaceChanged() {
      const place = autocomplete?.getPlace();
      if (!place) {
        onSelect(null);
        return;
      }

      let townName = "";
      let postcode: string | null = null;
      let state: string | null = null;

      const components: any[] = place.address_components || [];

      components.forEach((comp: any) => {
        const types: string[] = comp.types || [];

        // Town/locality-level names
        if (
          types.includes("locality") ||
          types.includes("postal_town") ||
          types.includes("sublocality") ||
          types.includes("sublocality_level_1")
        ) {
          if (!townName) {
            townName = comp.long_name;
          }
        }

        if (types.includes("postal_code")) {
          postcode = comp.long_name;
        }

        if (types.includes("administrative_area_level_1")) {
          state = comp.short_name; // NSW / QLD / etc.
        }
      });

      // Fallback town name
      if (!townName && place.name) {
        townName = place.name;
      }

      // Simple formatted value for the input
      const formattedParts = [townName];
      if (state) formattedParts.push(state);
      if (postcode) formattedParts.push(postcode);
      const formatted = formattedParts.filter(Boolean).join(", ");

      setValue(formatted);

      onTextChange?.(formatted);

      onSelect({
        town: townName,
        postcode,
        fullText: place.formatted_address || formatted,
      });
    }

    // ---------- Script + Autocomplete bootstrapping ----------
    function initAutocomplete() {
      if (cancelled) return;
      const win = window as any;
      if (!win.google || !win.google.maps || !win.google.maps.places) return;
      if (!inputRef.current) return;

      autocomplete = new win.google.maps.places.Autocomplete(inputRef.current, {
        types: ["(cities)"],
        componentRestrictions: { country: "au" },
      });

      autocomplete.addListener("place_changed", () => {
        handlePlaceChanged();
      });

      setReady(true);
    }

    function ensureScriptAndInit() {
      const win = window as any;

      // Already loaded
      if (win.google && win.google.maps && win.google.maps.places) {
        initAutocomplete();
        return;
      }

      // Only add script once
      const existing = document.querySelector(
        'script[data-todays-stash-places="1"]'
      ) as HTMLScriptElement | null;

      if (!existing) {
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.setAttribute("data-todays-stash-places", "1");

        script.onload = () => {
          if (cancelled) return;
          initAutocomplete();
        };

        script.onerror = (e) => {
          console.error("Failed to load Google Maps script", e);
          setReady(true);
        };

        document.head.appendChild(script);
      }

      // Poll for library ready
      pollId = setInterval(() => {
        if (win.google && win.google.maps && win.google.maps.places) {
          if (pollId) clearInterval(pollId);
          initAutocomplete();
        }
      }, 300);
    }

    ensureScriptAndInit();

    return () => {
      cancelled = true;
      if (pollId) clearInterval(pollId);
    };
  }, [onSelect, onTextChange]);

  return (
    <div className="w-full">
      {label && (
        <label className="mb-1 block text-sm font-medium text-slate-200">
          {label}{" "}
          {required && <span className="text-red-400 align-middle">*</span>}
        </label>
      )}

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          setValue(v);
          onTextChange?.(v);
          // As soon as they type, previous Google selection is invalid
          onSelect(null);
        }}
        placeholder="Start typing your town…"
        autoComplete="off"
        className="
          w-full rounded-xl border border-slate-700
          bg-[#05080C] px-3 py-2 text-sm text-white outline-none
          ring-emerald-500/40 focus:border-emerald-400 focus:ring
        "
      />

      {!ready && (
        <p className="mt-1 text-[11px] text-white/45">Loading town search…</p>
      )}
    </div>
  );
}
