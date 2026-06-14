import { test, expect } from "@playwright/test";

// Open a card and exercise the modal: add a comment.
test("card modal: add a comment", async ({ page }) => {
  await page.goto("/boards");

  // Create a board + list + card to operate on.
  await page.locator("section:has-text('Start from a template') button").first().click();
  await page.waitForURL(/\/board\//);
  await page.getByRole("button", { name: "Add a list" }).click();
  await page.getByPlaceholder("List title…").fill("Work");
  await page.getByRole("button", { name: "Add list" }).click();

  const cardTitle = `Modal card ${Date.now()}`;
  await page.getByRole("button", { name: "Add a card" }).last().click();
  await page.getByPlaceholder("Card title…").fill(cardTitle);
  await page.getByRole("button", { name: "Add", exact: true }).click();

  // Open the card modal.
  await page.getByText(cardTitle).click();
  await expect(page.getByRole("heading", { name: cardTitle })).toBeVisible();

  // Add a comment.
  const comment = `Looks good ${Date.now()}`;
  await page.getByPlaceholder(/Write a comment/).fill(comment);
  await page.getByRole("button", { name: "Comment" }).click();
  await expect(page.getByText(comment)).toBeVisible();
});
