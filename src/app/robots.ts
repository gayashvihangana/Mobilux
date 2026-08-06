import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        // The shop team's entrance. Listing it here is a hint to crawlers, not
        // a secret — /staff/login also sets robots: noindex on the page itself.
        "/staff",
        "/dashboard",
        "/repairs",
        "/orders",
        "/profile",
        "/bill",
        "/api",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
