import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                disallow: ["/admin", "/merchant-dashboard", "/api", "/profile", "/test"],
            },
        ],
        sitemap: "https://todaysstash.com.au/sitemap.xml",
    };
}
