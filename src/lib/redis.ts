import { Redis } from "@upstash/redis";

// Singleton — safe across hot reloads. Null when Upstash isn't configured, so
// the whole cache layer degrades to a no-op (reads fall through to Postgres).
const globalForRedis = globalThis as unknown as { redis: Redis | undefined };

function isConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

export const redis: Redis | null = isConfigured()
  ? (globalForRedis.redis ??
     new Redis({
       url: process.env.UPSTASH_REDIS_REST_URL!,
       token: process.env.UPSTASH_REDIS_REST_TOKEN!,
     }))
  : null;

if (process.env.NODE_ENV !== "production" && redis) globalForRedis.redis = redis;

// ─── Cache helpers ───────────────────────────────────────────────────────────

const BOARD_TTL = 60;   // seconds — board data
const BOARDS_TTL = 30;  // seconds — board list

export const CacheKeys = {
  board: (id: string) => `board:${id}`,
  boards: (workspaceId: string) => `boards:${workspaceId}`,
  notifications: (userId: string) => `notif:unread:${userId}`,
};

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const val = await redis.get<T>(key);
    return val ?? null;
  } catch {
    return null; // cache miss on error — never break the app
  }
}

export async function cacheSet<T>(key: string, value: T, ttl: number): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: ttl });
  } catch {
    // non-critical
  }
}

export async function cacheDel(...keys: string[]): Promise<void> {
  if (!redis || keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch {
    // non-critical
  }
}

export { BOARD_TTL, BOARDS_TTL };
