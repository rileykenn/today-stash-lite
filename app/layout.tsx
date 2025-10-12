import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";
import BottomNav from "@/components/BottomNav";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Today Stash Lite",
  description: "Deals app",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* ✅ Add this <head> block */}
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0B1210] text-[#E8FFF3]
        pb-[calc(env(safe-area-inset-bottom)+80px)]`} // ⬅️ room for the bottom nav
      >
        <NavBar />
        {children}
        <BottomNav /> {/* ⬅️ fixed global bottom bar */}
      </body>
    </html>
  );
}
