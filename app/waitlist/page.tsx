"use client";

import { useState } from "react";
import { sb } from "@/lib/supabaseBrowser";

export default function WaitlistPage() {
  const [email, setEmail] = useState("");
  const [town, setTown] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !town.trim()) {
      setErrorMessage("Please enter your email and town.");
      return;
    }

    setSubmitting(true);

    const { error } = await sb.from("waitlist").insert({
      email: email.trim(),
      // expects a `town_name` column in the waitlist table
      town_name: town.trim(),
    });

    if (error) {
      console.error(error);
      setErrorMessage("Something went wrong. Try again.");
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setSuccessMessage("You're on the waitlist! We'll notify you when we launch.");
    setEmail("");
    setTown("");
  };

  return (
    <div className="min-h-screen bg-[#05090D] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-[#0B1117] border border-white/10 rounded-2xl p-6 shadow-xl">
        <h1 className="text-2xl font-semibold mb-1 text-center">Join the Waitlist</h1>
        <p className="text-sm text-white/60 mb-6 text-center">
          Enter your email and the town you want Today&apos;s Stash in. We&apos;ll let you know when we launch there.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs text-white/70 mb-1">Email</label>
            <input
              type="email"
              value={email}
              placeholder="you@example.com"
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 outline-none text-sm"
            />
          </div>

          {/* Town (free text) */}
          <div>
            <label className="block text-xs text-white/70 mb-1">
              Town / Area you want us in
            </label>
            <input
              value={town}
              onChange={(e) => setTown(e.target.value)}
              placeholder="e.g. Sussex Inlet, Jervis Bay, Sydney CBD…"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 outline-none text-sm"
            />
          </div>

          {/* Error */}
          {errorMessage && (
            <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {errorMessage}
            </div>
          )}

          {/* Success */}
          {successMessage && (
            <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
              {successMessage}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full px-4 py-2 mt-2 rounded-lg bg-[#14F195] text-black text-sm font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Joining…" : "Join Waitlist"}
          </button>
        </form>
      </div>
    </div>
  );
}
