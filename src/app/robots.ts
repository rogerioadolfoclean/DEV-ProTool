import type { MetadataRoute } from "next";

const SITE_URL = process.env.APP_BASE_URL || "https://omnicomm-360.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Zones privées / techniques non indexables
      disallow: ["/console", "/console/", "/clients", "/api/", "/connexion"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
