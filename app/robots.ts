import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://chowk-kandula.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/me", "/messages", "/notifications", "/admin", "/post", "/auth", "/login"] },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
