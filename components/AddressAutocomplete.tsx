/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";

export type SelectedAddress = {
  fullText: string; // formatted_address
  streetLine: string; // "123 Beach Rd"
  suburb: string; // locality/sublocality
  state: string | null; // NSW
  postcode: string | null; // 2540
  lat: number | null;
  lng: number | null;
};

interface AddressAutocompleteProps {
  label?: string;
  required?: boolean;
  initialValue?: string;
  onSelect: (value: SelectedAddress | null) => void;
  onTextChange?: (text: string) => void;
  placeholder?: string;
}

// Let TypeScript know google exists at runtime
declare const google: any;

export default function AddressAutocomplete({
  label = "Address",
  required = true,
  initialValue = "",
  onSelect,
  onTextChange,
  placeholder = "Start typing your address…",
}: AddressAutocompleteProps) {
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

    function handlePlaceChanged() {
      const place = autocomplete?.getPlace();
      if (!place) {
        onSelect(null);
        return;
      }

      const components: any[] = place.address_components || [];

      let streetNumber = "";
      let route = "";
      let suburb = "";
      let state: string | null = null;
      let postcode: string | null = null;

      components.forEach((comp: any) => {
        const types: string[] = comp.types || [];

        if (types.includes("street_number")) streetNumber = comp.long_name;
        if (types.includes("route")) route = comp.long_name;

        // suburb/locality (AU can return locality OR sublocality)
        if (
          types.includes("locality") ||
          types.includes("sublocality") ||
          types.includes("sublocality_level_1") ||
          types.includes("postal_town")
        ) {
          if (!suburb) suburb = comp.long_name;
        }

        if (types.includes("administrative_area_level_1")) {
          state = comp.short_name; // NSW / QLD / etc.
        }

        if (types.includes("postal_code")) {
          postcode = comp.long_name;
        }
      });

      const streetLine = [streetNumber, route].filter(Boolean).join(" ").trim();

      const formatted = place.formatted_address || value;

      const lat =
        place.geometry?.location?.lat ? place.geometry.location.lat() : null;
      const lng =
        place.geometry?.location?.lng ? place.geometry.location.lng() : null;

      // Put formatted address into input for clean UX
      setValue(formatted);
      onTextChange?.(formatted);

      onSelect({
        fullText: formatted,
        streetLine,
        suburb,
        state,
        postcode,
        lat,
        lng,
      });
    }

    function initAutocomplete() {
      if (cancelled) return;
      const win = window as any;
      if (!win.google || !win.google.maps || !win.google.maps.places) return;
      if (!inputRef.current) return;

      autocomplete = new win.google.maps.places.Autocomplete(inputRef.current, {
        // This is the key change vs towns:
        // "address" gives full street addresses (not just cities)
        types: ["address"],
        componentRestrictions: { country: "au" },
        // Keep payload small
        fields: ["address_components", "formatted_address", "geometry"],
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

      // Only add script once (same pattern you already use)
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
        placeholder={placeholder}
        autoComplete="off"
        className="
          w-full rounded-xl border border-slate-700
          bg-[#05080C] px-3 py-2 text-sm text-white outline-none
          ring-emerald-500/40 focus:border-emerald-400 focus:ring
        "
      />

      {!ready && (
        <p className="mt-1 text-[11px] text-white/45">
          Loading address search…
        </p>
      )}
    </div>
  );
}
