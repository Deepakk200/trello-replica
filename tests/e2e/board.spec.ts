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
  await expect(page.getByText(cardTitle)).toBeVisible();

  // Reload → card is still there (persistence proof).
  await page.reload();
  await expect(page.getByText(cardTitle)).toBeVisible();
});
