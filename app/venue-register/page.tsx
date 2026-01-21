"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
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

export default function VenueRegisterPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Form State
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("");
  const [address, setAddress] = useState("");
  const [contactName, setContactName] = useState("");
  const [position, setPosition] = useState("");

  // Verification State
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");

  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);

  // Verification Logic State
  const [verifyingEmail, setVerifyingEmail] = useState(false); // sending/verifying
  const [emailCode, setEmailCode] = useState("");
  const [showEmailCodeInput, setShowEmailCodeInput] = useState(false);
  const [emailError, setEmailError] = useState("");

  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const [phoneCode, setPhoneCode] = useState("");
  const [showPhoneCodeInput, setShowPhoneCodeInput] = useState(false);
  const [phoneError, setPhoneError] = useState("");

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

  // Load Session
  const refreshSession = async () => {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      setLoadingAuth(false);
      return;
    }
    setUser(session.user);

    // Auto-fill and check verification status
    if (session.user.email) {
      setEmail(session.user.email);
      if (session.user.email_confirmed_at) {
        setIsEmailVerified(true);
      }
    }

    if (session.user.phone) {
      setTelephone(session.user.phone);
      if (session.user.phone_confirmed_at) {
        setIsPhoneVerified(true);
      }
    }

    setLoadingAuth(false);
  };

  useEffect(() => {
    refreshSession();
  }, []);

  // --- Handlers ---

  const handleSendEmailCode = async () => {
    if (!email) { setEmailError("Enter an email first."); return; }
    setVerifyingEmail(true);
    setEmailError("");
    try {
      const { data: { session } } = await sb.auth.getSession();
      const res = await fetch('/api/notifications/send-email-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ email })
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to send code");
      setShowEmailCodeInput(true);
    } catch (e: any) {
      setEmailError(e.message);
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleVerifyEmailCode = async () => {
    if (!emailCode) return;
    setVerifyingEmail(true);
    setEmailError("");
    try {
      const { data: { session } } = await sb.auth.getSession();
      const res = await fetch('/api/notifications/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ code: emailCode })
      });
      if (!res.ok) throw new Error((await res.json()).error || "Invalid code");

      // Success => reload session to confirm and lock it
      // Note: Supabase session might not update instantly, manual refresh helps
      await sb.auth.refreshSession();
      await refreshSession();
      setIsEmailVerified(true);
      setShowEmailCodeInput(false);
    } catch (e: any) {
      setEmailError(e.message);
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleSendPhoneCode = async () => {
    if (!telephone) { setPhoneError("Enter a phone number first."); return; }
    setVerifyingPhone(true);
    setPhoneError("");
    try {
      const { data: { session } } = await sb.auth.getSession();
      const res = await fetch('/api/notifications/send-phone-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ phone: telephone })
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to send code");
      setShowPhoneCodeInput(true);
    } catch (e: any) {
      setPhoneError(e.message);
    } finally {
      setVerifyingPhone(false);
    }
  };

  const handleVerifyPhoneCode = async () => {
    if (!phoneCode) return;
    setVerifyingPhone(true);
    setPhoneError("");
    try {
      const { data: { session } } = await sb.auth.getSession();
      const res = await fetch('/api/notifications/verify-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ code: phoneCode })
      });
      if (!res.ok) throw new Error((await res.json()).error || "Invalid code");

      await sb.auth.refreshSession();
      await refreshSession(); // This should now see the new phone
      setIsPhoneVerified(true);
      setShowPhoneCodeInput(false);
    } catch (e: any) {
      setPhoneError(e.message);
    } finally {
      setVerifyingPhone(false);
    }
  };


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      if (!user) {
        setErrorMessage("You must be logged in to submit an application.");
        return;
      }

      if (!isEmailVerified || !isPhoneVerified) {
        setErrorMessage("Please verify both your email and phone number before submitting.");
        return;
      }

      const trimmedBusiness = businessName.trim();
      const trimmedCategory = category.trim();

      const trimmedAddress =
        selectedAddress?.fullText?.trim() ||
        address.trim() ||
        addressRaw.trim() ||
        "";

      const trimmedContact = contactName.trim();
      const trimmedPosition = position.trim();

      // Email and phone are locked state variables at this point
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
        user_id: user.id,
        business_name: trimmedBusiness,
        category: trimmedCategory,
        address: trimmedAddress,
        contact_name: trimmedContact,
        position: trimmedPosition,
        email: trimmedEmail,
        phone: phoneE164,
        town_name: townToStore,
        is_read: false,
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

  if (loadingAuth) {
    return (
      <main className="min-h-screen bg-[#05090D] text-white flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#05090D] text-white px-6 py-20 flex flex-col items-center text-center">
        <h1 className="text-3xl font-bold mb-4">Register your venue</h1>
        <p className="text-white/70 max-w-md mb-8">
          You must sign in or create an account to submit a merchant application.
          This allows us to link your future merchant profile securely.
        </p>
        <button
          onClick={() => router.push(`/signin?next=/venue-register`)}
          className="rounded-full bg-emerald-500 px-6 py-3 font-semibold text-black hover:bg-emerald-400"
        >
          Sign in to continue
        </button>
      </main>
    );
  }

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

          {/* Auto-filled / Verifiable Sections */}

          {/* Email */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm">Email</label>
              {isEmailVerified && <span className="text-xs text-emerald-400 font-medium">✓ Verified</span>}
            </div>

            <div className="flex gap-2">
              <input
                required
                type="email"
                value={email}
                onChange={(e) => !isEmailVerified && setEmail(e.target.value)}
                readOnly={isEmailVerified}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm outline-none ${isEmailVerified
                  ? "bg-white/5 border-emerald-500/30 text-emerald-100 cursor-not-allowed"
                  : "bg-white/5 border-white/15"
                  }`}
                placeholder="you@example.com"
              />
              {!isEmailVerified && (
                <button
                  type="button"
                  onClick={handleSendEmailCode}
                  disabled={verifyingEmail || showEmailCodeInput}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {verifyingEmail ? "Sending..." : "Verify"}
                </button>
              )}
            </div>

            {/* Email Verification Component */}
            {showEmailCodeInput && !isEmailVerified && (
              <div className="mt-2 p-4 rounded-xl bg-white/5 border border-white/10 animate-in fade-in slide-in-from-top-2">
                <p className="text-sm text-white/80 mb-2">We sent a code to {email}</p>
                <div className="flex gap-2">
                  <input
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value)}
                    placeholder="Code"
                    className="w-32 rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-center tracking-widest outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyEmailCode}
                    disabled={verifyingEmail}
                    className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm"
                  >
                    {verifyingEmail ? "Checking..." : "Confirm"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEmailCodeInput(false)}
                    className="px-3 py-2 text-white/50 hover:text-white text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {emailError && <p className="text-red-400 text-xs mt-2">{emailError}</p>}
          </div>

          {/* Phone */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm">Telephone</label>
              {isPhoneVerified && <span className="text-xs text-emerald-400 font-medium">✓ Verified</span>}
            </div>

            <div className="flex gap-2">
              <input
                required
                value={telephone}
                onChange={(e) => !isPhoneVerified && setTelephone(e.target.value)}
                readOnly={isPhoneVerified}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm outline-none ${isPhoneVerified
                  ? "bg-white/5 border-emerald-500/30 text-emerald-100 cursor-not-allowed"
                  : "bg-white/5 border-white/15"
                  }`}
                placeholder="0412 345 678"
              />
              {!isPhoneVerified && (
                <button
                  type="button"
                  onClick={handleSendPhoneCode}
                  disabled={verifyingPhone || showPhoneCodeInput}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {verifyingPhone ? "Sending..." : "Verify"}
                </button>
              )}
            </div>

            {/* Phone Verification Component */}
            {showPhoneCodeInput && !isPhoneVerified && (
              <div className="mt-2 p-4 rounded-xl bg-white/5 border border-white/10 animate-in fade-in slide-in-from-top-2">
                <p className="text-sm text-white/80 mb-2">We sent a SMS code to {telephone}</p>
                <div className="flex gap-2">
                  <input
                    value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value)}
                    placeholder="Code"
                    className="w-32 rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-center tracking-widest outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyPhoneCode}
                    disabled={verifyingPhone}
                    className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm"
                  >
                    {verifyingPhone ? "Checking..." : "Confirm"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPhoneCodeInput(false)}
                    className="px-3 py-2 text-white/50 hover:text-white text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {phoneError && <p className="text-red-400 text-xs mt-2">{phoneError}</p>}
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
            disabled={submitting || !isEmailVerified || !isPhoneVerified}
            className="w-full mt-4 flex items-center justify-center rounded-lg bg-[#14F195] text-[#0B1210] font-bold text-lg py-3 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {submitting ? "Submitting Application..." : "Submit Application"}
          </button>
        </form>
      </div>
    </main>
  );
}
