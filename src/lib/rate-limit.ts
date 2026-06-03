// Rate limiting via Upstash Ratelimit. When Redis isn't configured (redis === null),
// limiters are null and checkRateLimit() is a no-op — so the app still works locally.
import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";
import { headers } from "next/headers";

function make(limiter: ReturnType<typeof Ratelimit.slidingWindow>, prefix: string): Ratelimit | null {
  if (!redis) return null;
  return new Ratelimit({ redis, limiter, prefix });
}

export const rateLimits = {
  auth: make(Ratelimit.slidingWindow(10, "15 m"), "rl:auth"),
  api: make(Ratelimit.slidingWindow(100, "1 m"), "rl:api"),
  ai: make(Ratelimit.slidingWindow(20, "1 m"), "rl:ai"),
  search: make(Ratelimit.slidingWindow(30, "1 m"), "rl:search"),
};

export async function getRequestIp(): Promise<string> {
  const hdrs = await headers();
  return (
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    hdrs.get("x-real-ip") ??
    "unknown"
  );
}

// Throws if the limit is exceeded. No-op when the limiter is null (no Redis).
export async function checkRateLimit(limiter: Ratelimit | null, identifier: string): Promise<void> {
  if (!limiter) return;
  const result = await limiter.limit(identifier);
  if (!result.success) {
    throw new Error(`Rate limit exceeded. Try again in ${Math.ceil((result.reset - Date.now()) / 1000)}s.`);
  }
}
