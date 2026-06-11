import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Build-safe placeholder. Prisma's constructor rejects an undefined datasource
// URL, which crashes `next build` "page data collection" on Vercel before
// DATABASE_URL is configured. A syntactically valid placeholder lets the build
// (and the env-free localStorage app) succeed; real queries use the real URL at
// runtime — set DATABASE_URL in Vercel for the DB-backed routes to function.
const PLACEHOLDER_DB_URL = "postgresql://placeholder:placeholder@localhost:5432/placeholder";

// Serverless connection pooling: cap the client pool so concurrent lambdas
// don't exhaust Postgres connections. Appended only if not already present.
function pooledUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) return PLACEHOLDER_DB_URL;
  if (url.includes("connection_limit")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}connection_limit=3&pool_timeout=10`;
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: pooledUrl() } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
