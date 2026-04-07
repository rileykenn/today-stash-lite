import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join the Waitlist — Today's Stash",
  description:
    "Want Today's Stash in your town? Join the waitlist and be the first to know when we launch local deals in your area.",
  alternates: {
    canonical: "https://todaysstash.com.au/waitlist",
  },
  openGraph: {
    title: "Join the Waitlist — Today's Stash",
    description:
      "Be the first to know when Today's Stash launches in your town.",
    url: "https://todaysstash.com.au/waitlist",
  },
};

export default function WaitlistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
