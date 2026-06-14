// Integration tests: server actions exercised end-to-end against a REAL Postgres.
//
// Runs only when INTEGRATION=1 (CI sets it + a postgres service via DATABASE_URL);
// otherwise the suite is skipped so `npm run test:integration` stays green locally
// without a database. The request layer (auth/cookies/cache/sentry) is mocked so
// the actions run outside a Next request — the DB writes are real.
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";

const RUN = process.env.INTEGRATION === "1";

// Mutable "logged-in" user id the auth() mock returns.
let currentUserId: string | null = null;

vi.mock("@/lib/auth", () => ({
  auth: async () => (currentUserId ? { user: { id: currentUserId } } : null),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
  headers: async () => new Map(),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
vi.mock("@sentry/nextjs", () => ({
  setUser: () => {}, setTag: () => {}, captureException: () => {}, captureRequestError: () => {},
}));

describe.runIf(RUN)("server actions (integration)", () => {
  // Imported lazily so the mocks are in place first.
  let db: typeof import("@/lib/db").db;
  let boards: typeof import("@/features/boards/actions");
  let lists: typeof import("@/features/lists/actions");
  let cards: typeof import("@/features/cards/actions");

  // Two seeded users; user A owns a workspace, user B is an outsider.
  const A = "00000000-0000-0000-0000-00000000000a";
  const B = "00000000-0000-0000-0000-00000000000b";
  const WS = "00000000-0000-0000-0000-0000000000a1";

  beforeAll(async () => {
    db = (await import("@/lib/db")).db;
    boards = await import("@/features/boards/actions");
    lists = await import("@/features/lists/actions");
    cards = await import("@/features/cards/actions");
  });

  beforeEach(async () => {
    await db.$executeRawUnsafe('TRUNCATE TABLE "User","Workspace","Board" RESTART IDENTITY CASCADE');
    await db.user.createMany({
      data: [
        { id: A, email: "alice@test.dev", name: "Alice" },
        { id: B, email: "bob@test.dev", name: "Bob" },
      ],
    });
    await db.workspace.create({
      data: { id: WS, name: "Alice WS", slug: `alice-${WS}`, members: { create: { userId: A, role: "OWNER" } } },
    });
    currentUserId = A;
  });

  async function makeCardStack() {
    const b = await boards.createBoard({ title: "Board 1", background: "#0052CC" });
    const boardId = b.board.id;
    const l1 = (await lists.createList({ boardId, title: "To Do" })).list;
    const l2 = (await lists.createList({ boardId, title: "Doing" })).list;
    const c1 = (await cards.createCard({ listId: l1.id, title: "Card A" })).card;
    const c2 = (await cards.createCard({ listId: l1.id, title: "Card B" })).card;
    return { boardId, l1, l2, c1, c2 };
  }

  it("createBoard → list → card persists with increasing positions", async () => {
    const { l1, c1, c2 } = await makeCardStack();
    const rows = await db.card.findMany({ where: { listId: l1.id }, orderBy: { position: "asc" } });
    expect(rows.map((r) => r.title)).toEqual(["Card A", "Card B"]);
    expect(c2.position).toBeGreaterThan(c1.position);
  });

  it("moveCard places a card at the correct position in the target list", async () => {
    const { l1, l2, c1 } = await makeCardStack();
    await cards.moveCard({ cardId: c1.id, toListId: l2.id, beforePosition: null, afterPosition: null });
    const moved = await db.card.findUniqueOrThrow({ where: { id: c1.id } });
    expect(moved.listId).toBe(l2.id);
    // remaining card still in the source list
    const remaining = await db.card.findMany({ where: { listId: l1.id, deletedAt: null } });
    expect(remaining).toHaveLength(1);
  });

  it("toggleCardLabel adds then removes a label", async () => {
    const { boardId, c1 } = await makeCardStack();
    const label = (await boards.upsertLabel({ boardId, color: "green", name: "Bug" })).label;
    await cards.toggleCardLabel(c1.id, label.id);
    expect(await db.cardLabel.count({ where: { cardId: c1.id } })).toBe(1);
    await cards.toggleCardLabel(c1.id, label.id);
    expect(await db.cardLabel.count({ where: { cardId: c1.id } })).toBe(0);
  });

  it("comment create + delete (soft) round-trips", async () => {
    const { c1 } = await makeCardStack();
    const created = await cards.createComment({ cardId: c1.id, content: "hello team" });
    expect(await db.comment.count({ where: { cardId: c1.id, deletedAt: null } })).toBe(1);
    await cards.deleteComment(created.comment.id, c1.id);
    expect(await db.comment.count({ where: { cardId: c1.id, deletedAt: null } })).toBe(0);
  });

  it("authz: a non-member cannot mutate another user's board", async () => {
    const { boardId } = await makeCardStack();
    currentUserId = B; // Bob is not a member of Alice's workspace/board
    await expect(boards.updateBoard(boardId, { title: "hacked" })).rejects.toThrow();
    // unchanged in DB
    const row = await db.board.findUniqueOrThrow({ where: { id: boardId } });
    expect(row.title).toBe("Board 1");
  });

  it("isolation: getBoards only returns the active workspace's boards", async () => {
    await makeCardStack(); // Alice's board
    currentUserId = B;
    const bobBoards = await boards.getBoards();
    expect(bobBoards).toHaveLength(0); // Bob has no workspace → no boards
  });
});
