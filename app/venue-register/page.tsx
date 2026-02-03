"use client";

import { useRouter } from "next/navigation";
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

// Formatting utilities
function normalizePhoneToE164AU(input: string): string | null {
  const raw = (input || "").trim();
  if (!raw) return null;
  let p = raw.replace(/[^\d+]/g, "");
  if (p.startsWith("+")) {
    p = "+" + p.slice(1).replace(/\D/g, "");
    if (/^\+\d{8,15}$/.test(p)) return p;
    return null;
  }
  p = p.replace(/\D/g, "");
  if (p.startsWith("00")) {
    const e = "+" + p.slice(2);
    if (/^\+\d{8,15}$/.test(e)) return e;
    return null;
  }
  if (p.startsWith("04") && p.length === 10) return "+61" + p.slice(1);
  if (/^0[2378]\d{8}$/.test(p)) return "+61" + p.slice(1);
  if (p.startsWith("4") && p.length === 9) return "+61" + p;
  if (p.startsWith("61") && p.length >= 9) {
    const e = "+" + p;
    if (/^\+\d{8,15}$/.test(e)) return e;
  }
  return null;
}

const MERCHANT_CATEGORIES = [
  'Cafe & Bakery',
  'Financial',
  'Fitness',
  'Hair & Beauty',
  'Mechanical',
  'Miscellaneous',
  'Pet Care',
  'Photography',
  'Recreation',
] as const;

export default function VenueRegisterPage() {
  const router = useRouter();

  // Form State
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("");
  const [address, setAddress] = useState("");
  const [contactName, setContactName] = useState("");
  const [position, setPosition] = useState("");

  // Contact
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");

  // Address
  const [selectedAddress, setSelectedAddress] = useState<SelectedAddress | null>(null);
  const [addressRaw, setAddressRaw] = useState("");
  const [addressInputKey, setAddressInputKey] = useState(0);

  // Town
  const [selectedTown, setSelectedTown] = useState<SelectedTown | null>(null);
  const [townRaw, setTownRaw] = useState("");
  const [townInputKey, setTownInputKey] = useState(0);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // --- Handlers ---

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

      // Check phone format again just in case
      const phoneE164 = normalizePhoneToE164AU(trimmedPhone);
      if (!phoneE164) {
        setErrorMessage("Invalid phone number format.");
        return;
      }

      // town selection OPTIONAL
      const townName = selectedTown?.town?.trim() || "";
      const postcode = selectedTown?.postcode?.trim() || "";
      const townToStore =
        selectedTown?.fullText?.trim() ||
        (postcode ? `${townName}, ${postcode}` : townName) ||
        townRaw.trim() ||
        "";

      const payload = {
        user_id: null, // Public submission
        business_name: trimmedBusiness,
        category: trimmedCategory,
        address: trimmedAddress,
        contact_name: trimmedContact,
        position: trimmedPosition,
        email: trimmedEmail,
        phone: phoneE164,
        town_name: townToStore,
        is_read: false,
        status: 'unread'
      };

      const { error } = await sb.from("applications").insert(payload);

      if (error) {
        console.error("Application submit error", JSON.stringify(error, null, 2));
        setErrorMessage("Something went wrong submitting your application. Please try again.");
      } else {
        setSuccessMessage("Thanks! Your application has been submitted. We will review it and get back to you.");
        // clear form text inputs only
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

        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl bg-[#0B1117] border border-white/10 p-6">

          {/* Business Name */}
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
            <div className="relative">
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg bg-[#111821] border border-white/15 px-3 py-2 text-sm outline-none appearance-none focus:border-emerald-500/50 transition-colors cursor-pointer"
              >
                <option value="" disabled>Select a category...</option>
                {MERCHANT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {/* Chevron Icon */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/30">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </div>
          </div>

          {/* Address */}
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
              Start typing and <span className="text-emerald-400">tap an address</span> from the list.
            </p>
          </div>

          {/* Contact Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm mb-1">Position</label>
              <input
                required
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm outline-none"
                placeholder="e.g., Owner"
              />
            </div>
          </div>

          <div className="h-px bg-white/10 my-4" />

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

          {/* Phone */}
          <div>
            <label className="block text-sm mb-1">Telephone</label>
            <input
              required
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm outline-none"
              placeholder="0412 345 678"
            />
            <p className="mt-1 text-[11px] text-white/45">We'll use this to contact you about your application.</p>
          </div>

          {/* Submission Feedback */}
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
            className="w-full mt-4 flex items-center justify-center rounded-lg bg-[#14F195] text-[#0B1210] font-bold text-lg py-3 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {submitting ? "Submitting Application..." : "Submit Application"}
          </button>
        </form>
      </div>
    </main>
  );
}
