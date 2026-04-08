import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Success Stories — Today's Stash",
  description:
    "Real results from real local businesses. See how cafés, restaurants, salons and more have filled their quiet times and grown their customer base with Today's Stash.",
  keywords: [
    "local business success stories",
    "coupon program results",
    "local deals case studies",
    "urban promotions results",
  ],
  alternates: {
    canonical: "https://todaysstash.com.au/success-stories",
  },
  openGraph: {
    title: "Success Stories — Today's Stash",
    description:
      "Real results from real local businesses using Today's Stash to fill quiet times.",
    url: "https://todaysstash.com.au/success-stories",
  },
  twitter: {
    card: "summary_large_image",
    title: "Success Stories — Today's Stash",
    description:
      "Real results from real local businesses using Today's Stash to fill quiet times.",
  },
};

export default function SuccessStoriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
