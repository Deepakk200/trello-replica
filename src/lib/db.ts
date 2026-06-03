import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Serverless connection pooling: cap the client pool so concurrent lambdas
// don't exhaust Postgres connections. Appended only if not already present.
function pooledUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url || url.includes("connection_limit")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}connection_limit=3&pool_timeout=10`;
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: pooledUrl() } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
