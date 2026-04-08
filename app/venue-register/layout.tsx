import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register Your Business — Today's Stash",
  description:
    "List your business on Today's Stash for free during beta. Turn quiet times into loyal customers with QR-based local deals. No lock-in, no fees.",
  keywords: [
    "register business deals platform",
    "list business local deals",
    "restaurant promotion platform",
    "cafe promotion australia",
    "local business marketing",
  ],
  alternates: {
    canonical: "https://todaysstash.com.au/venue-register",
  },
  openGraph: {
    title: "Register Your Business — Today's Stash",
    description:
      "Join 10,000+ businesses that have used our platform to fill quiet times and grow local trade.",
    url: "https://todaysstash.com.au/venue-register",
  },
  twitter: {
    card: "summary_large_image",
    title: "Register Your Business — Today's Stash",
    description:
      "Join 10,000+ businesses that have used our platform to fill quiet times and grow local trade.",
  },
};

export default function VenueRegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
