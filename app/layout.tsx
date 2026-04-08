import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import Header from "@/components/Header";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://todaysstash.com.au"),
  title: {
    default: "Today's Stash — Local Deals, Unlocked",
    template: "%s | Today's Stash",
  },
  description:
    "Save at the places you already love. Today's Stash connects locals with exclusive in-store deals across Australia — from the creators of Urban Promotions®.",
  keywords: [
    "today's stash",
    "todays stash",
    "todaysstash",
    "local deals australia",
    "in-store deals",
    "local savings",
    "coupon app australia",
    "restaurant deals",
    "cafe deals",
    "urban promotions",
    "local business deals",
    "deals near me",
    "local deals app",
    "local coupons australia",
    "QR code deals",
  ],
  alternates: {
    canonical: "https://todaysstash.com.au",
  },
  openGraph: {
    title: "Today's Stash — Local Deals, Unlocked",
    description:
      "Save at the places you already love. Exclusive in-store deals from cafés, restaurants, gyms and more in your town.",
    url: "https://todaysstash.com.au",
    siteName: "Today's Stash",
    locale: "en_AU",
    type: "website",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Today's Stash — Local Deals, Unlocked",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Today's Stash — Local Deals, Unlocked",
    description:
      "Save at the places you already love. Exclusive in-store deals across Australia.",
    images: ["/opengraph-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

// JSON-LD Structured Data for rich Google results
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://todaysstash.com.au/#organization",
      name: "Today's Stash",
      alternateName: "TodaysStash",
      url: "https://todaysstash.com.au",
      logo: "https://todaysstash.com.au/logo6.png",
      description:
        "Today's Stash connects locals with real, in-store deals from local businesses across Australia — redeemed via QR code, no app download needed.",
      foundingDate: "2024",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Level 19, 263 William Street",
        addressLocality: "Melbourne",
        addressRegion: "VIC",
        addressCountry: "AU",
      },
      contactPoint: {
        "@type": "ContactPoint",
        email: "adrian@todaysstash.com.au",
        contactType: "customer support",
      },
      sameAs: [],
    },
    {
      "@type": "LocalBusiness",
      "@id": "https://todaysstash.com.au/#localbusiness",
      name: "Today's Stash",
      image: "https://todaysstash.com.au/logo6.png",
      url: "https://todaysstash.com.au",
      description:
        "Local in-store deals and discounts from verified Australian businesses. Redeem with a simple QR code scan — no app required.",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Level 19, 263 William Street",
        addressLocality: "Melbourne",
        addressRegion: "VIC",
        postalCode: "3000",
        addressCountry: "AU",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: -37.8136,
        longitude: 144.9631,
      },
      areaServed: {
        "@type": "Country",
        name: "Australia",
      },
      priceRange: "Free for consumers",
      email: "adrian@todaysstash.com.au",
      openingHoursSpecification: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
        opens: "00:00",
        closes: "23:59",
      },
    },
    {
      "@type": "WebSite",
      "@id": "https://todaysstash.com.au/#website",
      url: "https://todaysstash.com.au",
      name: "Today's Stash",
      description:
        "Local deals, unlocked. Exclusive in-store deals from cafés, restaurants, gyms and more in your town.",
      publisher: { "@id": "https://todaysstash.com.au/#organization" },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate:
            "https://todaysstash.com.au/consumer?q={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

function Footer() {
  return (
    <footer
      className="
        border-t border-white/10
        bg-[#0B1210]
        text-white
      "
      aria-label="Site footer"
    >
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Brand blurb */}
          <div className="min-w-0">
            <p className="text-base font-semibold">
              Today’s Stash <span className="opacity-60">Lite</span>
            </p>
            <p className="text-xs text-white/60">
              Local deals, verified in-store with secure time-limited QR codes.
            </p>
            <p className="text-xs text-white/40 mt-1">
              Level 19, 263 William St, Melbourne, Australia
            </p>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-3 sm:gap-4 text-sm">
            <Link
              href="/about"
              className="rounded-md px-3 py-2 text-white/85 hover:text-white hover:bg-white/5 ring-1 ring-transparent hover:ring-white/10 transition"
            >
              About
            </Link>

            <Link
              href="/waitlist"
              className="
                inline-flex items-center justify-center
                rounded-md px-4 py-2
                font-semibold
                bg-emerald-500 hover:bg-emerald-400
                text-white shadow-[0_0_8px_rgba(16,185,129,0.3)]
                transition
              "
            >
              Join the waiting list for your town
            </Link>
          </nav>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] text-white/45">
          <div>
            © {new Date().getFullYear()} Today&apos;s Stash. All rights reserved.
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/privacy-policy"
              className="hover:text-white/70 transition"
            >
              Privacy Policy
            </Link>
            <span className="text-white/25">·</span>
            <Link
              href="/terms-and-conditions"
              className="hover:text-white/70 transition"
            >
              Terms &amp; Conditions
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full bg-[#050B10]" suppressHydrationWarning>
      <head>
        <link
          rel="preload"
          as="font"
          href="/fonts/bebas/BebasNeueProExpandedExtraBoldIt.woff2"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>

      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0B1210] text-[#E8FFF3]`}
      >
        <div className="min-h-screen flex flex-col bg-[#0B1210]">
          <Header />
          <main className="flex-1 pt-[72px]">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
