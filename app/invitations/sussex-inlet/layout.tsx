import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Sussex Inlet — Today's Stash is Launching | Free Deals & Coupons",
    description:
        "Today's Stash is launching in Sussex Inlet. The first businesses and locals get 6 months completely free. Claim your free spot now.",
    openGraph: {
        title: "Sussex Inlet — Today's Stash is Launching",
        description:
            "Free advertising for businesses. Free coupons for locals. The first businesses and locals in Sussex Inlet get 6 months completely free.",
        url: "https://todaysstash.com.au/invitations/sussex-inlet",
        siteName: "Today's Stash",
        images: [
            {
                url: "https://todaysstash.com.au/Sussexinlet/sussexheroimage.JPG",
                width: 1200,
                height: 630,
                alt: "Sussex Inlet — Today's Stash Founding Town",
            },
        ],
        locale: "en_AU",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "Sussex Inlet — Today's Stash is Launching",
        description:
            "Free advertising for businesses. Free coupons for locals. 6 months completely free.",
        images: ["https://todaysstash.com.au/Sussexinlet/sussexheroimage.JPG"],
    },
};

export default function SussexInletLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
