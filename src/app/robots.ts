import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/sign-in", "/sign-up"],
        // Block authenticated / private routes from indexing.
        disallow: ["/boards", "/board/", "/settings", "/invite/", "/api/"],
      },
    ],
    sitemap: "https://trello-replica-one.vercel.app/sitemap.xml",
  };
}
