import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = "https://todaysstash.com.au";

    return [
        {
            url: baseUrl,
            lastModified: new Date("2026-04-08"),
            changeFrequency: "weekly",
            priority: 1.0,
        },
        {
            url: `${baseUrl}/about`,
            lastModified: new Date("2026-04-08"),
            changeFrequency: "monthly",
            priority: 0.9,
        },
        {
            url: `${baseUrl}/consumer`,
            lastModified: new Date("2026-04-08"),
            changeFrequency: "daily",
            priority: 0.9,
        },
        {
            url: `${baseUrl}/merchant`,
            lastModified: new Date("2026-04-08"),
            changeFrequency: "monthly",
            priority: 0.8,
        },
        {
            url: `${baseUrl}/areas`,
            lastModified: new Date("2026-04-08"),
            changeFrequency: "weekly",
            priority: 0.8,
        },
        {
            url: `${baseUrl}/blog`,
            lastModified: new Date("2026-04-08"),
            changeFrequency: "weekly",
            priority: 0.8,
        },
        {
            url: `${baseUrl}/blog/local-business-promotions-australia`,
            lastModified: new Date("2026-04-08"),
            changeFrequency: "monthly",
            priority: 0.7,
        },
        {
            url: `${baseUrl}/blog/local-deals-near-me-australia`,
            lastModified: new Date("2026-04-07"),
            changeFrequency: "monthly",
            priority: 0.7,
        },
        {
            url: `${baseUrl}/blog/how-to-increase-foot-traffic-restaurant-australia`,
            lastModified: new Date("2026-04-08"),
            changeFrequency: "monthly",
            priority: 0.7,
        },
        {
            url: `${baseUrl}/blog/increase-cafe-foot-traffic-australia`,
            lastModified: new Date("2026-04-08"),
            changeFrequency: "monthly",
            priority: 0.7,
        },
        {
            url: `${baseUrl}/waitlist`,
            lastModified: new Date("2026-04-08"),
            changeFrequency: "monthly",
            priority: 0.7,
        },
        {
            url: `${baseUrl}/venue-register`,
            lastModified: new Date("2026-04-08"),
            changeFrequency: "monthly",
            priority: 0.7,
        },
        {
            url: `${baseUrl}/success-stories`,
            lastModified: new Date("2026-04-08"),
            changeFrequency: "monthly",
            priority: 0.6,
        },
        {
            url: `${baseUrl}/contactsupport`,
            lastModified: new Date("2026-04-08"),
            changeFrequency: "monthly",
            priority: 0.4,
        },
        {
            url: `${baseUrl}/privacy-policy`,
            lastModified: new Date("2026-04-08"),
            changeFrequency: "yearly",
            priority: 0.3,
        },
        {
            url: `${baseUrl}/terms-and-conditions`,
            lastModified: new Date("2026-04-08"),
            changeFrequency: "yearly",
            priority: 0.3,
        },
    ];
}

