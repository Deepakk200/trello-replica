import { test, expect } from "@playwright/test";

// Critical journey: create a board from a template, add a list + card, reload,
// and prove the card persisted (DB-backed, not localStorage).
test("create board → list → card persists across reload", async ({ page }) => {
  await page.goto("/boards");

  // Create from the first template → navigates to /board/[id].
  await page.getByRole("button", { name: /Creating…|.+/ }).first(); // ensure templates rendered
  const firstTemplate = page.locator("section:has-text('Start from a template') button").first();
  await firstTemplate.click();
  await page.waitForURL(/\/board\//);

  // Add a list.
  await page.getByRole("button", { name: "Add a list" }).click();
  await page.getByPlaceholder("List title…").fill("QA");
  await page.getByRole("button", { name: "Add list" }).click();
  await expect(page.getByRole("heading", { name: "QA" })).toBeVisible();

  // Add a card to that list.
  const cardTitle = `Persisted card ${Date.now()}`;
  await page.getByRole("button", { name: "Add a card" }).last().click();
  await page.getByPlaceholder("Card title…").fill(cardTitle);
  await page.getByRole("button", { name: "Add", exact: true }).click();

  // Assert on the interactive card itself. A card on /board/[id] is a draggable
  // element that dnd-kit gives role="button" (its accessible name is the title),
  // so getByRole("button", {name}) targets THE card unambiguously. The previous
  // getByText(title) was a loose substring match that, after a full reload, also
  // matched a second DOM node bearing the title text → strict-mode violation.
  // This is a selector precision fix, not a `.first()` hack: it still resolves to
  // exactly one element, so a genuine duplicate card would still fail loudly.
  const card = page.getByRole("button", { name: cardTitle });
  await expect(card).toBeVisible();

  // Reload → the card is still there (DB persistence proof, not localStorage).
  await page.reload();
  await expect(page.getByRole("button", { name: cardTitle })).toBeVisible();
});
