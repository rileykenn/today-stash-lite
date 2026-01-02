'use client';

import { useState } from 'react';

type RequestType = 'support' | 'feedback' | 'bug' | 'other';

export default function SupportPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState<RequestType>('support');
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!name.trim() || !email.trim() || !message.trim()) {
      setErrorMessage('Name, email, and message are required.');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/support/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          type,
          topic: topic.trim() || null,
          message: message.trim(),
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error('Support request error:', json);
        setErrorMessage('Something went wrong sending your message. Please try again.');
      } else {
        setSuccessMessage(
          type === 'feedback'
            ? 'Thanks for the feedback – we really appreciate it!'
            : 'Your message has been sent. We’ll get back to you as soon as we can.'
        );
        // reset form
        setName('');
        setEmail('');
        setPhone('');
        setType('support');
        setTopic('');
        setMessage('');
      }
    } catch (err) {
      console.error('Unexpected support request error:', err);
      setErrorMessage('Unexpected error talking to the server. Please try again in a moment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05090D] text-white px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-semibold mb-2">Contact & Support</h1>
        <p className="text-sm text-white/60 mb-6">
          Having an issue, need help with your account, or want to share feedback? Use this form to
          reach the Today&apos;s Stash team.
        </p>

        <div className="rounded-2xl bg-[#0B1117] border border-white/10 p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name + Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">
                  Phone (optional)
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Mobile number"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none"
                />
              </div>

              {/* Type selector */}
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">
                  What is this about?
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'support', label: 'Support' },
                    { id: 'feedback', label: 'Feedback' },
                    { id: 'bug', label: 'Bug' },
                    { id: 'other', label: 'Other' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setType(opt.id as RequestType)}
                      className={
                        'px-3 py-1.5 rounded-full text-xs border transition ' +
                        (type === opt.id
                          ? 'bg-[#14F195] text-black border-[#14F195]'
                          : 'bg-white/5 border-white/15 text-white/70 hover:bg-white/10')
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Topic */}
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">
                Subject / topic (optional)
              </label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={
                  type === 'feedback'
                    ? 'e.g., Idea to improve the app'
                    : 'e.g., Issue with my account'
                }
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder={
                  type === 'feedback'
                    ? 'Tell us what you love, what sucks, or what you want next…'
                    : 'Describe the problem or question with as much detail as possible…'
                }
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none resize-none"
              />
            </div>

            {/* Alerts */}
            {errorMessage && (
              <div className="rounded-lg border border-red-500/60 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className="rounded-lg border border-emerald-500/60 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                {successMessage}
              </div>
            )}

            {/* Submit */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-[#14F195] text-black text-sm font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? 'Sending…' : 'Send message'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
