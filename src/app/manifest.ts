import type { MetadataRoute } from "next";

// File-based PWA manifest (served at /manifest.webmanifest). Next.js auto-injects
// the <link rel="manifest"> tag. start_url points at /boards (this app's board
// grid — there is no /dashboard route in this build).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Trello Clone",
    short_name: "Trello",
    description: "Project boards your team will actually use",
    start_url: "/boards",
    display: "standalone",
    background_color: "#1D2125",
    theme_color: "#1D2125",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
    screenshots: [
      {
        src: "/screenshots/board.png",
        sizes: "1280x720",
        type: "image/png",
        form_factor: "wide",
        label: "Board view",
      },
    ],
    categories: ["productivity", "business"],
    lang: "en",
    dir: "ltr",
    prefer_related_applications: false,
  };
}
