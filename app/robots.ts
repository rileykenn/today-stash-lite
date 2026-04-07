import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                disallow: [
                    "/admin",
                    "/merchant-dashboard",
                    "/merchant-qr-poster",
                    "/api",
                    "/profile",
                    "/test",
                    "/payment",
                    "/upgrade",
                    "/invitations",
                    "/(auth)",
                ],
            },
            {
                userAgent: "Googlebot",
                allow: "/",
                disallow: [
                    "/admin",
                    "/merchant-dashboard",
                    "/merchant-qr-poster",
                    "/api",
                    "/profile",
                    "/test",
                    "/payment",
                    "/upgrade",
                    "/invitations",
                    "/(auth)",
                ],
            },
        ],
        sitemap: "https://todaysstash.com.au/sitemap.xml",
    };
}
