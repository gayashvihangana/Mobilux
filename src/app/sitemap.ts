import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { phonesVisible } from "@/lib/settings";
import { SITE_URL } from "@/lib/config";

// Render per-request: product list changes and the DB isn't reachable
// at build time.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const showPhones = await phonesVisible();
  const products = await prisma.product.findMany({
    where: {
      visible: true,
      ...(showPhones ? {} : { category: "ACCESSORY" }),
    },
    select: { slug: true, updatedAt: true },
  });

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/track`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/register`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/login`, changeFrequency: "monthly", priority: 0.3 },
  ];

  return [
    ...staticPages,
    ...products.map((p) => ({
      url: `${SITE_URL}/shop/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
