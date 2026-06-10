import type { MetadataRoute } from "next";

// Sitemap for publicly reachable routes. This build has no marketing /pricing
// page (deferred), so only the entry point and the auth pages are listed.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://trello-replica-one.vercel.app";
  const now = new Date();

  return [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/sign-up`, lastModified: now, changeFrequency: "yearly", priority: 0.6 },
    { url: `${base}/sign-in`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
  ];
}
