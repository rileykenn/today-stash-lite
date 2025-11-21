'use client';

import { useState } from 'react';
import { sb } from '@/lib/supabaseBrowser';

const CATEGORIES = [
  'Cafe / Bakery',
  'Restaurant / Takeaway',
  'Retail',
  'Fitness / Gym',
  'Hair & Beauty',
  'Services',
  'Other',
];

export default function MerchantApplicationPage() {
  const [businessName, setBusinessName] = useState('');
  const [contactName, setContactName] = useState('');
  const [position, setPosition] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canSubmit =
    businessName.trim() &&
    contactName.trim() &&
    email.trim() &&
    !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: insertErr } = await sb.from('applications').insert({
        business_name: businessName.trim(),
        contact_name: contactName.trim(),
        position: position.trim() || null,
        email: email.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        category,
      });

      if (insertErr) throw insertErr;

      setSuccess(
        "Thanks! We've received your application. We'll review it and get in touch."
      );

      // reset fields (keep category)
      setBusinessName('');
      setContactName('');
      setPosition('');
      setEmail('');
      setPhone('');
      setAddress('');
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to submit application';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#05090D] text-white px-6 py-10">
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-semibold mb-2">
          Apply to join Today’s Stash
        </h1>
        <p className="text-sm text-white/70 mb-6">
          Fill out the form below and our team will review your application.
        </p>

        {error && (
          <div className="mb-3 text-sm text-red-400 bg-red-500/10 border border-red-500/40 rounded-lg px-3 py-2">
            Error: {error}
          </div>
        )}
        {success && (
          <div className="mb-3 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/40 rounded-lg px-3 py-2">
            {success}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl bg-[#0B1117] border border-white/10 p-5"
        >
          {/* Business name */}
          <label className="block">
            <span className="block text-sm mb-1">Business name</span>
            <input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#14F195]"
              placeholder="e.g. Island Sushi"
              required
            />
          </label>

          {/* Category */}
          <label className="block">
            <span className="block text-sm mb-1">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#14F195]"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          {/* Address */}
          <label className="block">
            <span className="block text-sm mb-1">Street address</span>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#14F195]"
              placeholder="e.g. 123 Beach Rd, Sussex Inlet"
            />
          </label>

          {/* Contact name */}
          <label className="block">
            <span className="block text-sm mb-1">Your name</span>
            <input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#14F195]"
              placeholder="e.g. Sarah Lee"
              required
            />
          </label>

          {/* Position */}
          <label className="block">
            <span className="block text-sm mb-1">Position</span>
            <input
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#14F195]"
              placeholder="e.g. Owner / Manager"
            />
          </label>

          {/* Email + phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-sm mb-1">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#14F195]"
                placeholder="name@business.com"
                required
              />
            </label>

            <label className="block">
              <span className="block text-sm mb-1">Phone number</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#14F195]"
                placeholder="e.g. 04..."
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#14F195] text-black font-semibold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {submitting ? 'Sending…' : 'Submit application'}
          </button>
        </form>
      </div>
    </div>
  );
}
