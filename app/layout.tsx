import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import Header from "@/components/Header";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Today Stash Lite",
  description: "Deals app",
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

        <div className="mt-6 text-[11px] text-white/45">
          © {new Date().getFullYear()} Today’s Stash. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full bg-[#050B10]">
      <head>
        <link
          rel="preload"
          as="font"
          href="/fonts/bebas/BebasNeueProExpandedExtraBoldIt.woff2"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>

      <body
        className={`
          ${geistSans.variable} ${geistMono.variable}
          antialiased bg-[#0B1210] text-[#E8FFF3]
        `}
      >
        <div className="min-h-screen flex flex-col bg-[#0B1210]">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
