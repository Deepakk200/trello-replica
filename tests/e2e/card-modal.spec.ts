import { test, expect } from "@playwright/test";

// Open a card and exercise the modal: add a comment. Locators use data-testid
// so UI copy changes don't break the suite.
test("card modal: add a comment", async ({ page }) => {
  await page.goto("/boards");

  // Create a board + list + card to operate on.
  await expect(page.getByTestId("template-card").first()).toBeVisible();
  await page.getByTestId("template-card").first().click();
  await page.waitForURL(/\/board\//);

  await page.getByTestId("add-list").click();
  await page.getByTestId("list-title-input").fill("Work");
  await page.getByRole("button", { name: "Add list" }).click();

  const cardTitle = `Modal card ${Date.now()}`;
  await page.getByTestId("card-add-trigger").last().click();
  await page.getByTestId("card-composer-input").fill(cardTitle);
  await page.getByTestId("card-composer-submit").click();

  // Open the card modal.
  await page.getByTestId("card").filter({ hasText: cardTitle }).click();
  await expect(page.getByTestId("card-modal")).toBeVisible();

  // Add a comment.
  const comment = `Looks good ${Date.now()}`;
  await page.getByTestId("comment-input").fill(comment);
  await page.getByTestId("comment-submit").click();
  await expect(page.getByText(comment)).toBeVisible();
});
