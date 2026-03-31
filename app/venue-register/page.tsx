/* eslint-disable @next/next/no-img-element */
"use client";

import { FormEvent, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { sb } from "@/lib/supabaseBrowser";
import AddressAutocomplete, {
  type SelectedAddress,
} from "@/components/AddressAutocomplete";
import { motion, AnimatePresence } from "framer-motion";

/* ================================================================
   CONSTANTS
   ================================================================ */

const MERCHANT_CATEGORIES = [
  "Cafe & Bakery",
  "Fast Food & Takeaway",
  "Financial",
  "Fitness & Gyms",
  "Hair & Beauty",
  "Hotels & Accommodation",
  "Massage & Wellness",
  "Mechanical",
  "Pet Care",
  "Photography",
  "Recreation",
  "Restaurant & Dining",
  "Retail",
  "Miscellaneous",
] as const;

/* ================================================================
   HELPERS
   ================================================================ */

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

/* ================================================================
   ANIMATION VARIANTS
   ================================================================ */

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({
    x: dir > 0 ? -80 : 80,
    opacity: 0,
  }),
};

/* ================================================================
   STAGE 1 — SUMMARY
   ================================================================ */

function BetaSummary({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-10">
      {/* Title */}
      <div className="text-center mb-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Business Beta Summary
        </h1>
        <p className="text-emerald-600 font-medium text-sm mt-1">
          www.todaysstash.com.au
        </p>
      </div>

      {/* Content Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-8">
        {/* Intro */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-2">
            Turn Quiet Times Into Customers
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Today&apos;s Stash helps local businesses attract new customers by
            posting real-time deals that nearby consumers can discover and
            redeem instantly.
          </p>
        </section>

        {/* Beta Offer */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">
            Beta Offer{" "}
            <span className="text-emerald-600 text-sm font-semibold">
              (Limited Time)
            </span>
          </h2>
          <ul className="space-y-2 text-sm text-slate-700">
            {[
              "Post up to 2 offers per day",
              "Reach local customers instantly",
              "Fill cancellations and quiet periods",
              "Promote products and services",
              "100% FREE for 7 months",
              "No lock-in — cancel anytime",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* How It Works */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">
            How It Works
          </h2>
          <ol className="space-y-2.5 text-sm text-slate-700">
            {[
              "Create a simple offer (e.g. discount, special, promotion)",
              "Customers discover your offer on Today's Stash",
              "Customers visit your business to redeem",
              "You gain new and repeat customers",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold shrink-0 border border-emerald-200">
                  {i + 1}
                </span>
                <span className="pt-0.5">{item}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Perfect For */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">
            Perfect For
          </h2>
          <div className="flex flex-wrap gap-2">
            {[
              "Restaurants & cafes",
              "Hairdressers & beauty salons",
              "Retail stores",
              "Fast food & pizza",
              "Massage & physio",
              "Hotels & accommodation",
              "Wineries & experiences",
              "Gyms & services",
            ].map((tag) => (
              <span
                key={tag}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-medium rounded-full border border-slate-200"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>

        {/* No Risk */}
        <section className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <h2 className="text-base font-bold text-emerald-800 mb-1">
            No Risk
          </h2>
          <p className="text-sm text-emerald-700 leading-relaxed">
            This is a beta launch. There are no fees and no obligation. Simply
            test the platform and see the results for your business.
          </p>
        </section>

        {/* Get Started */}
        <section className="text-center pt-2">
          <p className="text-xs text-slate-500 mb-4">
            Sign up takes less than 2 minutes.
          </p>
          <button
            onClick={onContinue}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-8 py-3.5 text-sm transition-all shadow-sm hover:shadow-md"
          >
            Get Started — It&apos;s Free
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </button>
        </section>
      </div>

      {/* Illustration */}
      <div className="mt-10 flex justify-center opacity-60">
        <img
          src="/illustration-mobile-qr.svg"
          alt=""
          className="h-48 object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
    </div>
  );
}

/* ================================================================
   STAGE 2 — MULTI-STEP FORM
   ================================================================ */

// Step IDs
type FormStep =
  | "who"
  | "on-behalf"
  | "business"
  | "address"
  | "contact"
  | "review";

const STEP_LABELS: Record<FormStep, string> = {
  who: "About You",
  "on-behalf": "Your Details",
  business: "Business",
  address: "Address",
  contact: "Contact",
  review: "Review",
};

function getSteps(isOnBehalf: boolean): FormStep[] {
  if (isOnBehalf) {
    return ["who", "on-behalf", "business", "address", "contact", "review"];
  }
  return ["who", "business", "address", "contact", "review"];
}

/* ---- Shared input styles ---- */
const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-emerald-500/40 focus:border-emerald-500 focus:ring transition placeholder:text-slate-400";
const labelCls = "block text-sm font-medium text-slate-700 mb-1";
const selectCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-emerald-500/40 focus:border-emerald-500 focus:ring transition appearance-none cursor-pointer";

/* ---- Progress Bar ---- */
function ProgressBar({
  steps,
  current,
}: {
  steps: FormStep[];
  current: FormStep;
}) {
  const idx = steps.indexOf(current);
  const pct = ((idx + 1) / steps.length) * 100;

  return (
    <div className="mb-8">
      {/* Step labels */}
      <div className="flex items-center justify-between mb-3">
        {steps.map((s, i) => {
          const isActive = i === idx;
          const isDone = i < idx;
          return (
            <div
              key={s}
              className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "text-emerald-700"
                  : isDone
                    ? "text-emerald-500"
                    : "text-slate-400"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                  isActive
                    ? "bg-emerald-600 text-white"
                    : isDone
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-slate-200 text-slate-400"
                }`}
              >
                {isDone ? "✓" : i + 1}
              </span>
              <span className="hidden sm:inline">{STEP_LABELS[s]}</span>
            </div>
          );
        })}
      </div>

      {/* Bar */}
      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-emerald-500 rounded-full"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}

/* ================================================================
   MAIN COMPONENT
   ================================================================ */

export default function VenueRegisterPage() {
  /* ---- Top-level stage ---- */
  const [stage, setStage] = useState<1 | 2>(1);

  /* ---- Form step state ---- */
  const [currentStep, setCurrentStep] = useState<FormStep>("who");
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back

  /* ---- Form data ---- */
  const [isOnBehalf, setIsOnBehalf] = useState(false);

  // On-behalf fields
  const [submitterName, setSubmitterName] = useState("");
  const [submitterTitle, setSubmitterTitle] = useState("");
  const [submitterPhone, setSubmitterPhone] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");

  // Business
  const [businessName, setBusinessName] = useState("");
  const [abn, setAbn] = useState("");
  const [category, setCategory] = useState("");

  // Address
  const [selectedAddress, setSelectedAddress] = useState<SelectedAddress | null>(null);
  const [streetAddress, setStreetAddress] = useState("");
  const [townCity, setTownCity] = useState("");
  const [stateField, setStateField] = useState("");
  const [postcode, setPostcode] = useState("");
  const [country, setCountry] = useState("AU");
  const [addressInputKey, setAddressInputKey] = useState(0);

  // Contact
  const [contactName, setContactName] = useState("");
  const [position, setPosition] = useState("");
  const [email, setEmail] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");

  // Terms
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Step validation errors
  const [stepError, setStepError] = useState("");

  /* ---- Auto-populate address fields from Google Places ---- */
  const handleAddressSelect = useCallback(
    (val: SelectedAddress | null) => {
      setSelectedAddress(val);
      if (val) {
        setStreetAddress(val.streetLine || "");
        setTownCity(val.suburb || "");
        setStateField(val.state || "");
        setPostcode(val.postcode || "");
        setCountry("AU");
      }
    },
    []
  );

  /* ---- Navigation ---- */
  const steps = getSteps(isOnBehalf);

  function goNext() {
    setStepError("");
    const idx = steps.indexOf(currentStep);
    if (idx < steps.length - 1) {
      setDirection(1);
      setCurrentStep(steps[idx + 1]);
    }
  }

  function goBack() {
    setStepError("");
    const idx = steps.indexOf(currentStep);
    if (idx > 0) {
      setDirection(-1);
      setCurrentStep(steps[idx - 1]);
    } else {
      // Go back to stage 1
      setStage(1);
    }
  }

  /* ---- Validate current step before advancing ---- */
  function validateAndNext() {
    setStepError("");

    switch (currentStep) {
      case "who":
        // Just a selection, always valid
        goNext();
        break;

      case "on-behalf":
        if (!submitterName.trim()) {
          setStepError("Please enter your full name.");
          return;
        }
        if (!submitterTitle.trim()) {
          setStepError("Please enter your title or position.");
          return;
        }
        if (!submitterPhone.trim()) {
          setStepError("Please enter your personal phone number.");
          return;
        }
        if (!normalizePhoneToE164AU(submitterPhone)) {
          setStepError("Please enter a valid Australian phone number.");
          return;
        }
        if (!ownerName.trim()) {
          setStepError("Please enter the business owner's full name.");
          return;
        }
        if (!ownerPhone.trim()) {
          setStepError("Please enter the business owner's phone number.");
          return;
        }
        if (!normalizePhoneToE164AU(ownerPhone)) {
          setStepError("Owner phone number doesn't look valid.");
          return;
        }
        goNext();
        break;

      case "business":
        if (!businessName.trim()) {
          setStepError("Please enter the business name.");
          return;
        }
        if (!category) {
          setStepError("Please select a category.");
          return;
        }
        goNext();
        break;

      case "address":
        if (!streetAddress.trim()) {
          setStepError("Please enter a street address.");
          return;
        }
        if (!townCity.trim()) {
          setStepError("Please enter the town or city.");
          return;
        }
        if (!stateField.trim()) {
          setStepError("Please enter the state.");
          return;
        }
        if (!postcode.trim()) {
          setStepError("Please enter the postcode.");
          return;
        }
        goNext();
        break;

      case "contact":
        if (!isOnBehalf && !contactName.trim()) {
          setStepError("Please enter your name.");
          return;
        }
        if (!isOnBehalf && !position.trim()) {
          setStepError("Please enter your position.");
          return;
        }
        if (!email.trim()) {
          setStepError("Please enter a business email.");
          return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
          setStepError("Please enter a valid email address.");
          return;
        }
        if (!businessPhone.trim()) {
          setStepError("Please enter a business phone number.");
          return;
        }
        if (!normalizePhoneToE164AU(businessPhone)) {
          setStepError("Please enter a valid Australian phone number.");
          return;
        }
        goNext();
        break;

      default:
        goNext();
    }
  }

  /* ---- Submit ---- */
  async function handleSubmit() {
    if (!agreedToTerms) {
      setStepError("Please agree to the Terms & Conditions.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    setStepError("");

    try {
      const fullAddress = [
        streetAddress,
        townCity,
        stateField,
        postcode,
        country,
      ]
        .filter(Boolean)
        .join(", ");

      const payload: Record<string, any> = {
        user_id: null,
        business_name: businessName.trim(),
        category: category,
        address: fullAddress,
        email: email.trim(),
        phone: normalizePhoneToE164AU(businessPhone) || businessPhone.trim(),
        abn: abn.trim() || null,
        is_on_behalf: isOnBehalf,
        street_address: streetAddress.trim(),
        town_city: townCity.trim(),
        state: stateField.trim(),
        postcode: postcode.trim(),
        country: country.trim(),
        is_read: false,
        status: "unread",
      };

      if (isOnBehalf) {
        payload.submitter_name = submitterName.trim();
        payload.submitter_title = submitterTitle.trim();
        payload.submitter_phone =
          normalizePhoneToE164AU(submitterPhone) || submitterPhone.trim();
        payload.owner_name = ownerName.trim();
        payload.owner_phone =
          normalizePhoneToE164AU(ownerPhone) || ownerPhone.trim();
        payload.contact_name = ownerName.trim();
        payload.position = "Owner";
      } else {
        payload.contact_name = contactName.trim();
        payload.position = position.trim();
      }

      const { error } = await sb.from("applications").insert(payload);

      if (error) {
        console.error("Application submit error", JSON.stringify(error, null, 2));
        setSubmitError(
          "Something went wrong submitting your application. Please try again."
        );
      } else {
        setSubmitSuccess(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  /* ---- Scroll to top on step change ---- */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [stage, currentStep]);

  /* ================================================================
     RENDER
     ================================================================ */

  return (
    <main className="min-h-screen bg-[#F5F6F8]">
      <AnimatePresence mode="wait" custom={direction}>
        {stage === 1 && (
          <motion.div
            key="stage-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
          >
            <BetaSummary
              onContinue={() => {
                setStage(2);
                setCurrentStep("who");
              }}
            />
          </motion.div>
        )}

        {stage === 2 && !submitSuccess && (
          <motion.div
            key="stage-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-xl mx-auto px-4 py-10"
          >
            {/* Header */}
            <div className="text-center mb-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                Register Your Business
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                No fees. No lock-in. Cancel anytime during beta.
              </p>
            </div>

            {/* Progress */}
            <div className="mt-6">
              <ProgressBar steps={steps} current={currentStep} />
            </div>

            {/* Step Content */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 min-h-[280px]">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={currentStep}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                >
                  {/* ======== STEP: WHO ======== */}
                  {currentStep === "who" && (
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900 mb-1">
                          Who is filling out this form?
                        </h2>
                        <p className="text-sm text-slate-500">
                          Let us know so we can tailor the rest of the sign-up.
                        </p>
                      </div>

                      <div className="grid gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setIsOnBehalf(false);
                            setDirection(1);
                            setCurrentStep("business");
                          }}
                          className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                            !isOnBehalf
                              ? "border-emerald-500 bg-emerald-50"
                              : "border-slate-200 hover:border-slate-300 bg-white"
                          }`}
                        >
                          <p className="font-semibold text-slate-900 text-sm">
                            I&apos;m the business owner / operator
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            I&apos;m registering my own business.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsOnBehalf(true);
                            setDirection(1);
                            setCurrentStep("on-behalf");
                          }}
                          className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                            isOnBehalf
                              ? "border-emerald-500 bg-emerald-50"
                              : "border-slate-200 hover:border-slate-300 bg-white"
                          }`}
                        >
                          <p className="font-semibold text-slate-900 text-sm">
                            I&apos;m filling this out on behalf of someone else
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            e.g. a store manager registering for the franchise owner.
                          </p>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ======== STEP: ON-BEHALF ======== */}
                  {currentStep === "on-behalf" && (
                    <div className="space-y-5">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900 mb-1">
                          Your Details
                        </h2>
                        <p className="text-sm text-slate-500">
                          Since you&apos;re filling this out on behalf of someone
                          else, we need your details first.
                        </p>
                      </div>

                      <div className="space-y-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Your Information
                        </p>

                        <div>
                          <label className={labelCls}>Your Full Name *</label>
                          <input
                            value={submitterName}
                            onChange={(e) => setSubmitterName(e.target.value)}
                            className={inputCls}
                            placeholder="e.g., Sarah Johnson"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className={labelCls}>Your Title *</label>
                            <input
                              value={submitterTitle}
                              onChange={(e) => setSubmitterTitle(e.target.value)}
                              className={inputCls}
                              placeholder="e.g., Store Manager"
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Your Phone *</label>
                            <input
                              value={submitterPhone}
                              onChange={(e) => setSubmitterPhone(e.target.value)}
                              className={inputCls}
                              placeholder="0412 345 678"
                            />
                          </div>
                        </div>

                        <div className="h-px bg-slate-200 my-2" />

                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Business Owner / Employer
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className={labelCls}>Owner Full Name *</label>
                            <input
                              value={ownerName}
                              onChange={(e) => setOwnerName(e.target.value)}
                              className={inputCls}
                              placeholder="e.g., John Smith"
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Owner Phone *</label>
                            <input
                              value={ownerPhone}
                              onChange={(e) => setOwnerPhone(e.target.value)}
                              className={inputCls}
                              placeholder="0412 345 678"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ======== STEP: BUSINESS ======== */}
                  {currentStep === "business" && (
                    <div className="space-y-5">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900 mb-1">
                          Business Details
                        </h2>
                        <p className="text-sm text-slate-500">
                          Tell us about the business you&apos;re registering.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}>Business Name *</label>
                          <input
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                            className={inputCls}
                            placeholder="e.g., 5 Little Pigs Café"
                          />
                        </div>
                        <div>
                          <label className={labelCls}>
                            ABN{" "}
                            <span className="text-slate-400 font-normal">
                              (if applicable)
                            </span>
                          </label>
                          <input
                            value={abn}
                            onChange={(e) => setAbn(e.target.value)}
                            className={inputCls}
                            placeholder="ABN"
                          />
                        </div>
                      </div>

                      <div>
                        <label className={labelCls}>Category *</label>
                        <div className="relative">
                          <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className={selectCls}
                          >
                            <option value="" disabled>
                              Select a category...
                            </option>
                            {MERCHANT_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              stroke="currentColor"
                              className="w-4 h-4"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ======== STEP: ADDRESS ======== */}
                  {currentStep === "address" && (
                    <div className="space-y-5">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900 mb-1">
                          Business Address
                        </h2>
                        <p className="text-sm text-slate-500">
                          Start typing below and select from the suggestions, or
                          enter manually.
                        </p>
                      </div>

                      <div>
                        <AddressAutocomplete
                          key={addressInputKey}
                          label="Search Address"
                          variant="light"
                          onSelect={handleAddressSelect}
                          onTextChange={(text) => {
                            if (!selectedAddress) {
                              setStreetAddress(text);
                            }
                          }}
                          placeholder="Start typing your address..."
                        />
                        <p className="mt-1 text-[11px] text-slate-400">
                          Start typing and{" "}
                          <span className="text-emerald-600">
                            tap an address
                          </span>{" "}
                          from the list.
                        </p>
                      </div>

                      <div className="h-px bg-slate-200" />

                      <div>
                        <label className={labelCls}>Street Address *</label>
                        <input
                          value={streetAddress}
                          onChange={(e) => setStreetAddress(e.target.value)}
                          className={inputCls}
                          placeholder="Street Address"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}>Town / City *</label>
                          <input
                            value={townCity}
                            onChange={(e) => setTownCity(e.target.value)}
                            className={inputCls}
                            placeholder="Town/City"
                          />
                        </div>
                        <div>
                          <label className={labelCls}>State *</label>
                          <input
                            value={stateField}
                            onChange={(e) => setStateField(e.target.value)}
                            className={inputCls}
                            placeholder="e.g., VIC"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}>Post Code *</label>
                          <input
                            value={postcode}
                            onChange={(e) => setPostcode(e.target.value)}
                            className={inputCls}
                            placeholder="Post Code"
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Country</label>
                          <input
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            className={inputCls}
                            placeholder="AU"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ======== STEP: CONTACT ======== */}
                  {currentStep === "contact" && (
                    <div className="space-y-5">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900 mb-1">
                          Contact Details
                        </h2>
                        <p className="text-sm text-slate-500">
                          {isOnBehalf
                            ? "How can we reach the business?"
                            : "How can we reach you?"}
                        </p>
                      </div>

                      {!isOnBehalf && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className={labelCls}>Your Name *</label>
                            <input
                              value={contactName}
                              onChange={(e) => setContactName(e.target.value)}
                              className={inputCls}
                              placeholder="Your name"
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Position *</label>
                            <input
                              value={position}
                              onChange={(e) => setPosition(e.target.value)}
                              className={inputCls}
                              placeholder="e.g., Owner"
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <label className={labelCls}>Business Email *</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className={inputCls}
                          placeholder="you@example.com"
                        />
                      </div>

                      <div>
                        <label className={labelCls}>Business Phone *</label>
                        <input
                          value={businessPhone}
                          onChange={(e) => setBusinessPhone(e.target.value)}
                          className={inputCls}
                          placeholder="0412 345 678"
                        />
                        <p className="mt-1 text-[11px] text-slate-400">
                          We&apos;ll use this to contact you about your
                          application.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ======== STEP: REVIEW ======== */}
                  {currentStep === "review" && (
                    <div className="space-y-5">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900 mb-1">
                          Review & Submit
                        </h2>
                        <p className="text-sm text-slate-500">
                          Check everything looks good before submitting.
                        </p>
                      </div>

                      {/* Review Summary */}
                      <div className="space-y-3 text-sm">
                        {isOnBehalf && (
                          <ReviewSection
                            title="Submitted By"
                            items={[
                              ["Name", submitterName],
                              ["Title", submitterTitle],
                              ["Phone", submitterPhone],
                              ["Owner Name", ownerName],
                              ["Owner Phone", ownerPhone],
                            ]}
                          />
                        )}

                        <ReviewSection
                          title="Business"
                          items={[
                            ["Name", businessName],
                            ...(abn ? [["ABN", abn] as [string, string]] : []),
                            ["Category", category],
                          ]}
                        />

                        <ReviewSection
                          title="Address"
                          items={[
                            ["Street", streetAddress],
                            ["Town/City", townCity],
                            ["State", stateField],
                            ["Postcode", postcode],
                            ["Country", country],
                          ]}
                        />

                        <ReviewSection
                          title="Contact"
                          items={[
                            ...(!isOnBehalf
                              ? [
                                  ["Name", contactName] as [string, string],
                                  ["Position", position] as [string, string],
                                ]
                              : []),
                            ["Email", email],
                            ["Phone", businessPhone],
                          ]}
                        />
                      </div>

                      {/* Terms */}
                      <div className="h-px bg-slate-200" />

                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span className="text-sm text-slate-600 leading-relaxed">
                          I agree to the{" "}
                          <Link
                            href="/terms-and-conditions"
                            target="_blank"
                            className="text-emerald-600 font-medium underline underline-offset-2 hover:text-emerald-700"
                          >
                            Full Terms &amp; Conditions
                          </Link>
                        </span>
                      </label>

                      <p className="text-xs text-slate-400 text-center">
                        No fees. No lock-in. Cancel anytime during beta.
                      </p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Error display */}
              {(stepError || submitError) && (
                <div className="mt-4 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
                  {stepError || submitError}
                </div>
              )}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between mt-5 gap-3">
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                  />
                </svg>
                Back
              </button>

              {currentStep === "review" ? (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {submitting ? (
                    <>
                      <svg
                        className="animate-spin w-4 h-4"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    "Submit Application"
                  )}
                </button>
              ) : currentStep !== "who" ? (
                <button
                  type="button"
                  onClick={validateAndNext}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition shadow-sm"
                >
                  Continue
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                    />
                  </svg>
                </button>
              ) : (
                <div /> // Spacer — "who" step has its own buttons
              )}
            </div>
          </motion.div>
        )}

        {/* SUCCESS STATE */}
        {stage === 2 && submitSuccess && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md mx-auto px-4 py-20 text-center"
          >
            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Application Submitted!
            </h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Thanks! We&apos;ve received your application and our team will
              review it shortly. We&apos;ll be in touch via email or phone.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition"
            >
              Return Home
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

/* ================================================================
   REVIEW SECTION COMPONENT
   ================================================================ */

function ReviewSection({
  title,
  items,
}: {
  title: string;
  items: [string, string][];
}) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
        {title}
      </p>
      <div className="space-y-1">
        {items.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-2">
            <span className="text-slate-500 shrink-0">{label}</span>
            <span className="text-slate-900 font-medium text-right truncate">
              {value || "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
