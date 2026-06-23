import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

// TEMPORARY DIAGNOSTICS (remove after root-causing the duplicate-card failure).
// Queries the test DB directly to compare DB row count vs DOM node count, before
// and after reload, and logs card/list/board ids + each DOM node's dnd-kit
// attributes. Assertions are UNCHANGED and there is no `.first()` — `.count()`
// and `.evaluateAll()` do not trigger strict mode, so they log without throwing.
const prisma = new PrismaClient();
test.afterAll(async () => { await prisma.$disconnect(); });

// Critical journey: create a board from a template, add a list + card, reload,
// and prove the card persisted (DB-backed, not localStorage).
test("create board → list → card persists across reload", async ({ page }) => {
  await page.goto("/boards");

  // Create from the first template → navigates to /board/[id].
  await expect(page.getByTestId("template-card").first()).toBeVisible();
  await page.getByTestId("template-card").first().click();
  await page.waitForURL(/\/board\//);

  // Add a list.
  await page.getByTestId("add-list").click();
  await page.getByTestId("list-title-input").fill("QA");
  await page.getByRole("button", { name: "Add list" }).click();
  await expect(page.getByRole("heading", { name: "QA" })).toBeVisible();

  // Add a card to that (last) list.
  const cardTitle = `Persisted card ${Date.now()}`;
  await page.getByTestId("card-add-trigger").last().click();
  await page.getByTestId("card-composer-input").fill(cardTitle);
  await page.getByTestId("card-composer-submit").click();

  // ── DIAGNOSTICS ───────────────────────────────────────────────────────────
  const boardUrl = page.url();
  const matcher = page.getByTestId("card").filter({ hasText: cardTitle });

  const dbCards = () =>
    prisma.card.findMany({
      where: { title: cardTitle },
      select: { id: true, listId: true, deletedAt: true, archived: true, list: { select: { id: true, boardId: true } } },
    });

  // Per-DOM-node detail: dnd attributes + which list it sits in + overlay/portal test.
  const domNodes = () =>
    matcher.evaluateAll((nodes) =>
      nodes.map((n) => {
        const el = n as HTMLElement;
        return {
          text: (el.textContent || "").trim().slice(0, 30),
          roledescription: el.getAttribute("aria-roledescription"),
          describedby: el.getAttribute("aria-describedby"),
          inOverlayOrPortal: !!el.closest("[role='tooltip'],[data-dnd-overlay],[data-rfd-drag-handle-draggable-id]"),
          // nearest ancestor list (its title heading text, if any)
          listText: (el.closest("[class*='rounded-xl']")?.querySelector("h2")?.textContent || "").trim().slice(0, 20),
        };
      }),
    );

  // 1. BEFORE reload
  const domBefore = await matcher.count();
  const dbBefore = await dbCards();
  console.log(`[DIAG] board=${boardUrl}`);
  console.log(`[DIAG] BEFORE reload — DOM=${domBefore} DB=${dbBefore.length}`);
  console.log(`[DIAG] BEFORE DB rows: ${JSON.stringify(dbBefore)}`);
  console.log(`[DIAG] BEFORE DOM nodes: ${JSON.stringify(await domNodes())}`);

  const card = page.getByTestId("card").filter({ hasText: cardTitle });
  await expect(card).toBeVisible();

  // Reload → the card is still there (DB persistence proof, not localStorage).
  await page.reload();

  // 2. AFTER reload
  const domAfter = await matcher.count();
  const dbAfter = await dbCards();
  console.log(`[DIAG] AFTER reload  — DOM=${domAfter} DB=${dbAfter.length}`);
  console.log(`[DIAG] AFTER DB rows: ${JSON.stringify(dbAfter)}`);
  console.log(`[DIAG] AFTER DOM nodes: ${JSON.stringify(await domNodes())}`);
  console.log(
    `[DIAG] VERDICT: ` +
      (dbAfter.length > 1
        ? "DB has duplicate rows → double-insert (Cause B)"
        : domAfter > 1
          ? "DB=1 but DOM>1 → rendering/hydration/overlay duplication (Cause A)"
          : "no duplication observed this run"),
  );

  await expect(page.getByTestId("card").filter({ hasText: cardTitle })).toBeVisible();
});
