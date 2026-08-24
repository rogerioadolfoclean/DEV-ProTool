import type { MetadataRoute } from "next";

const SITE_URL = process.env.APP_BASE_URL || "https://omnicomm-360.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/docs`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/connexion`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
  ];
}
