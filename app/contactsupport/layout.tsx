import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact & Support — Today's Stash",
  description:
    "Get in touch with the Today's Stash team. Report issues, share feedback, or discuss partnership opportunities.",
  alternates: {
    canonical: "https://todaysstash.com.au/contactsupport",
  },
  openGraph: {
    title: "Contact & Support — Today's Stash",
    description:
      "Get in touch with the Today's Stash team for support, feedback, or partnerships.",
    url: "https://todaysstash.com.au/contactsupport",
  },
};

export default function ContactSupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
