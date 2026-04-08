import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Areas We're Promoting — Today's Stash",
  description:
    "Explore the local communities where Today's Stash is active. Subscribe to your area to unlock exclusive deals from local businesses.",
  keywords: [
    "local deals areas",
    "today's stash towns",
    "local deals near me",
    "australia local coupons",
  ],
  alternates: {
    canonical: "https://todaysstash.com.au/areas",
  },
  openGraph: {
    title: "Areas We're Promoting — Today's Stash",
    description:
      "Browse towns where Today's Stash is live. Subscribe to unlock exclusive local deals.",
    url: "https://todaysstash.com.au/areas",
  },
  twitter: {
    card: "summary_large_image",
    title: "Areas We're Promoting — Today's Stash",
    description:
      "Browse towns where Today's Stash is live. Subscribe to unlock exclusive local deals.",
  },
};

export default function AreasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
