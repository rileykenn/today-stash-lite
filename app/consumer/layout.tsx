import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Local Deals — Today's Stash",
  description:
    "Discover exclusive in-store deals from cafés, restaurants, gyms, salons and more in your area. Redeem with QR codes at the counter — no coupons, no fuss.",
  keywords: [
    "local deals",
    "deals near me",
    "in-store deals",
    "cafe deals",
    "restaurant deals",
    "local coupons",
    "QR code deals australia",
  ],
  alternates: {
    canonical: "https://todaysstash.com.au/consumer",
  },
  openGraph: {
    title: "Browse Local Deals — Today's Stash",
    description:
      "Exclusive in-store deals from local businesses near you. Browse, redeem, save.",
    url: "https://todaysstash.com.au/consumer",
  },
};

export default function ConsumerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
