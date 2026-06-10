/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import { Serwist, type PrecacheEntry } from "serwist";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,

  // Take control of all pages immediately (no waiting for tabs to close)
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,

  runtimeCaching: defaultCache,

  // Offline fallback: when a navigation fails (user is offline),
  // show the /~offline page instead of the browser's default error.
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
