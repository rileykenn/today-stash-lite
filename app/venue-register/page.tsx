"use client";

import { FormEvent, useState } from "react";
import { sb } from "@/lib/supabaseBrowser";
import AddressAutocomplete, {
  type SelectedAddress,
} from "@/components/AddressAutocomplete";

type SelectedTown = {
  town: string;
  postcode: string | null;
  fullText: string;
};

function normalizePhoneToE164AU(input: string): string | null {
  const raw = (input || "").trim();
  if (!raw) return null;

  // remove spaces, dashes, brackets
  let p = raw.replace(/[^\d+]/g, "");

  // already E.164-ish
  if (p.startsWith("+")) {
    // keep only + and digits
    p = "+" + p.slice(1).replace(/\D/g, "");
    // basic E.164 check (+ and 8-15 digits)
    if (/^\+\d{8,15}$/.test(p)) return p;
    return null;
  }

  // remove any non-digits now
  p = p.replace(/\D/g, "");

  // handle 00 international prefix -> +
  if (p.startsWith("00")) {
    const e = "+" + p.slice(2);
    if (/^\+\d{8,15}$/.test(e)) return e;
    return null;
  }

  // AU rules:
  // - mobile: 04xxxxxxxx -> +614xxxxxxxx
  // - landline: 0[2|3|7|8]xxxxxxxx -> +61[2|3|7|8]xxxxxxxx
  // - sometimes people type 4xxxxxxxx (missing leading 0) -> assume mobile +614...
  if (p.startsWith("04") && p.length === 10) {
    return "+61" + p.slice(1); // drop leading 0
  }

  if (/^0[2378]\d{8}$/.test(p)) {
    return "+61" + p.slice(1); // drop leading 0
  }

  if (p.startsWith("4") && p.length === 9) {
    return "+61" + p; // assume missing 0 for mobile
  }

  // last resort: if they typed 61xxxxxxxxx without + (rare)
  if (p.startsWith("61") && p.length >= 9) {
    const e = "+" + p;
    if (/^\+\d{8,15}$/.test(e)) return e;
  }

  return null;
}

export default function VenueRegisterPage() {
  // form state
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("");
  const [address, setAddress] = useState("");
  const [contactName, setContactName] = useState("");
  const [position, setPosition] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");

  // address autocomplete
  const [selectedAddress, setSelectedAddress] =
    useState<SelectedAddress | null>(null);
  const [addressRaw, setAddressRaw] = useState("");
  const [addressInputKey, setAddressInputKey] = useState(0);

  // town autocomplete
  const [selectedTown, setSelectedTown] = useState<SelectedTown | null>(null);
  const [townRaw, setTownRaw] = useState("");
  const [townInputKey, setTownInputKey] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const trimmedBusiness = businessName.trim();
      const trimmedCategory = category.trim();

      const trimmedAddress =
        selectedAddress?.fullText?.trim() ||
        address.trim() ||
        addressRaw.trim() ||
        "";

      const trimmedContact = contactName.trim();
      const trimmedPosition = position.trim();
      const trimmedEmail = email.trim();
      const trimmedPhone = telephone.trim();

      // basic required checks
      if (
        !trimmedBusiness ||
        !trimmedCategory ||
        !trimmedAddress ||
        !trimmedContact ||
        !trimmedPosition ||
        !trimmedEmail ||
        !trimmedPhone
      ) {
        setErrorMessage("Please fill in all required fields.");
        return;
      }

      // ✅ normalize phone to E.164 (AU)
      const phoneE164 = normalizePhoneToE164AU(trimmedPhone);
      if (!phoneE164) {
        setErrorMessage(
          "Please enter a valid Australian phone number (e.g. 0412 345 678)."
        );
        return;
      }

      // town selection is OPTIONAL
      const townName = selectedTown?.town?.trim() || "";
      const postcode = selectedTown?.postcode?.trim() || "";

      const townToStore =
        selectedTown?.fullText?.trim() ||
        (postcode ? `${townName}, ${postcode}` : townName) ||
        townRaw.trim() ||
        "";

      const payload = {
        business_name: trimmedBusiness,
        category: trimmedCategory,
        address: trimmedAddress,
        contact_name: trimmedContact,
        position: trimmedPosition,
        email: trimmedEmail,
        phone: phoneE164, // ✅ store normalized E.164
        town_name: townToStore,
        is_read: false,
      };

      console.log("Submitting application payload:", payload);

      const { error } = await sb.from("applications").insert(payload);

      if (error) {
        console.error(
          "Application submit error",
          JSON.stringify(error, null, 2)
        );
        setErrorMessage(
          "Something went wrong submitting your application. Please try again."
        );
      } else {
        setSuccessMessage(
          "Thanks! Your application has been submitted. We will review it and get back to you."
        );

        // clear form
        setBusinessName("");
        setCategory("");
        setAddress("");
        setContactName("");
        setPosition("");
        setEmail("");
        setTelephone("");

        setSelectedAddress(null);
        setAddressRaw("");
        setAddressInputKey((k) => k + 1);

        setSelectedTown(null);
        setTownRaw("");
        setTownInputKey((k) => k + 1);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#05090D] text-white px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-semibold mb-2">Register your venue</h1>
        <p className="text-sm text-white/70 mb-8">
          Fill out this form to apply for Today&apos;s Stash. We&apos;ll review
          your application and contact you.
        </p>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl bg-[#0B1117] border border-white/10 p-6"
        >
          {/* Name of business */}
          <div>
            <label className="block text-sm mb-1">Name of business</label>
            <input
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm outline-none"
              placeholder="e.g., 5 Little Pigs Café"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm mb-1">Category</label>
            <input
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm outline-none"
              placeholder="e.g., Cafe, Restaurant, Hair & Beauty"
            />
          </div>

          {/* Address – Google Places full address autocomplete */}
          <div>
            <AddressAutocomplete
              key={addressInputKey}
              label="Address"
              onSelect={(value) => {
                setSelectedAddress(value);
                setAddress(value?.fullText || "");
              }}
              onTextChange={(text) => {
                setAddressRaw(text);
                setAddress(text);
              }}
              placeholder="e.g., 123 Beach Rd, Sussex Inlet NSW 2540"
            />
            <p className="mt-1 text-[11px] text-white/45">
              Start typing and{" "}
              <span className="text-emerald-400">tap an address</span> from the
              list so we capture it exactly.
            </p>
          </div>

          {/* Contact name */}
          <div>
            <label className="block text-sm mb-1">Name</label>
            <input
              required
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm outline-none"
              placeholder="Your name"
            />
          </div>

          {/* Position */}
          <div>
            <label className="block text-sm mb-1">Position</label>
            <input
              required
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm outline-none"
              placeholder="e.g., Owner, Manager"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm outline-none"
              placeholder="you@example.com"
            />
          </div>

          {/* Telephone */}
          <div>
            <label className="block text-sm mb-1">Telephone</label>
            <input
              required
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm outline-none"
              placeholder="e.g., 0412 345 678"
            />
          </div>

          {/* Messages */}
          {errorMessage && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/40 rounded-lg px-3 py-2">
              {errorMessage}
            </p>
          )}
          {successMessage && (
            <p className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-400/60 rounded-lg px-3 py-2">
              {successMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 inline-flex items-center justify-center rounded-lg bg-[#14F195] text-[#0B1210] font-semibold px-4 py-2 text-sm hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit application"}
          </button>
        </form>
      </div>
    </main>
  );
}
