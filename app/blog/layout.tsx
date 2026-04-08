import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: {
    default: "Blog — Today's Stash",
    template: "%s | Today's Stash Blog",
  },
  description:
    "Practical guides and insights for Australian local businesses and consumers. Learn how to drive foot traffic, find local deals, and grow your business with in-store promotions.",
  keywords: [
    "local business blog australia",
    "local deals blog",
    "restaurant marketing australia",
    "cafe marketing tips",
    "local promotions guide",
    "small business marketing australia",
  ],
  alternates: {
    canonical: "https://todaysstash.com.au/blog",
  },
  openGraph: {
    title: "Blog — Today's Stash",
    description:
      "Practical guides for Australian local businesses and consumers on driving foot traffic and finding local deals.",
    url: "https://todaysstash.com.au/blog",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog — Today's Stash",
    description:
      "Practical guides for Australian local businesses and consumers on driving foot traffic and finding local deals.",
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative isolate overflow-hidden bg-[#0A0F13] text-white">
      {/* Background gradients */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_700px_at_0%_0%,rgba(34,197,94,0.18),transparent_60%),radial-gradient(1000px_600px_at_100%_100%,rgba(15,23,42,0.9),transparent_55%),linear-gradient(to_bottom,rgba(15,23,42,0.4),rgba(15,23,42,1))]"
      />
      <div className="relative z-10 mx-auto max-w-3xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-8 text-xs text-white/50" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-white/80 transition">
            Home
          </Link>
          <span className="mx-2">›</span>
          <Link href="/blog" className="hover:text-white/80 transition">
            Blog
          </Link>
        </nav>
        {children}
      </div>
    </div>
  );
}
