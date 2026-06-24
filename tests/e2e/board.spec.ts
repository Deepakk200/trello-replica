import { test, expect } from "@playwright/test";

// Critical journey: create a board from a template, add a list + card, reload,
// and prove the card persisted (DB-backed, not localStorage). Locators use
// data-testid so UI copy changes don't break the suite.
test("create board → list → card persists across reload", async ({ page }) => {
  await page.goto("/boards");
  // Wait for client JS to hydrate so the template card's create handler is wired
  // before we click (avoids a click landing before hydration → no nav → /boards).
  await page.waitForLoadState("networkidle");

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

  const card = page.getByTestId("card").filter({ hasText: cardTitle });
  await expect(card).toBeVisible();

  // Reload → the card is still there (DB persistence proof, not localStorage).
  await page.reload();
  await expect(page.getByTestId("card").filter({ hasText: cardTitle })).toBeVisible();
});
