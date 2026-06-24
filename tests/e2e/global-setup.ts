import { PrismaClient } from "@prisma/client";

// E2E test isolation. Wipes the test database once before the suite so:
//  - accumulated boards across runs can't trip the per-workspace plan board
//    limit (which makes `createBoardFromTemplate` fail and the flow fall back to
//    /boards — the flaky "navigated to /boards" failure), and
//  - leftover rows from a prior run can't cause ambiguous/duplicate matches.
//
// SAFETY: only runs when DATABASE_URL clearly points at a TEST database. A real
// or Neon production URL (no "test" in it) is skipped, so this can never wipe
// real data.
export default async function globalSetup() {
  const url = process.env.DATABASE_URL ?? "";
  // Isolate on the DATABASE NAME, not the whole URL: a prod/Neon URL whose host
  // happens to contain "test" must never match. Only a db named like a test DB
  // (e.g. `trello_test`) is eligible for truncation.
  let dbName = "";
  try {
    dbName = new URL(url).pathname.replace(/^\//, "").split("?")[0];
  } catch {
    /* malformed/empty URL → dbName stays "" → guard below skips */
  }
  if (!/test/i.test(dbName)) {
    console.warn(
      `[e2e global-setup] DATABASE_URL db "${dbName || "?"}" is not a test DB — skipping truncate. ` +
        "Point DATABASE_URL at a *_test database to enable isolation.",
    );
    return;
  }
  const prisma = new PrismaClient();
  try {
    // Truncating User + Workspace CASCADE clears every dependent table
    // (accounts, sessions, members, boards, lists, cards, …) in one statement.
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "User", "Workspace" RESTART IDENTITY CASCADE;',
    );
    console.log("[e2e global-setup] test DB truncated for a clean run.");
  } finally {
    await prisma.$disconnect();
  }
}
