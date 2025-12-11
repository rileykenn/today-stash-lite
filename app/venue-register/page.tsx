"use client";

import { FormEvent, useState } from "react";
import { sb } from "@/lib/supabaseBrowser";
import TownAutocomplete from "@/components/TownAutocomplete";

type SelectedTown = {
  town: string;
  postcode: string | null;
  fullText: string;
};

export default function VenueRegisterPage() {
  // form state
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("");
  const [address, setAddress] = useState("");
  const [contactName, setContactName] = useState("");
  const [position, setPosition] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");

  // town autocomplete (same pattern as Waitlist page)
  const [selectedTown, setSelectedTown] = useState<SelectedTown | null>(null);
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
      const trimmedAddress = address.trim();
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

      // require town selection from autocomplete
      const townName = selectedTown?.town?.trim() || "";
      const postcode = selectedTown?.postcode?.trim() || "";

      if (!townName) {
        setErrorMessage(
          "Please start typing and select your town from the suggestions so we can capture it correctly."
        );
        return;
      }

      // What we store in applications.town_name
      const townToStore =
        selectedTown?.fullText?.trim() ||
        (postcode ? `${townName}, ${postcode}` : townName);

      const payload = {
        business_name: trimmedBusiness,
        category: trimmedCategory,
        address: trimmedAddress,
        contact_name: trimmedContact,
        position: trimmedPosition,
        email: trimmedEmail,
        phone: trimmedPhone,
        town_name: townToStore, // <-- new text field, same style as waitlist
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
        setSelectedTown(null);
        setTownInputKey((k) => k + 1); // reset TownAutocomplete
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
          Fill out this form to apply for Today&apos;s Stash. We&apos;ll review your
          application and contact you.
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

          {/* Address */}
          <div>
            <label className="block text-sm mb-1">Address</label>
            <input
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm outline-none"
              placeholder="e.g., 123 Beach Rd, Sussex Inlet"
            />
          </div>

          {/* Town – Google Places autocomplete (same as waitlist) */}
          <div>
            <TownAutocomplete
              key={townInputKey}
              label="Town"
              onSelect={(value) => setSelectedTown(value)}
            />
            <p className="mt-1 text-[11px] text-white/45">
              Start typing and{" "}
              <span className="text-emerald-400">tap a town</span> from the
              list so we can capture the exact town and postcode.
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
