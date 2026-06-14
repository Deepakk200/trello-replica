import { test as setup, expect } from "@playwright/test";
import path from "node:path";

const authFile = path.join(__dirname, ".auth/user.json");

// Sign up a fresh user, then sign in, and persist the authenticated session so
// the rest of the suite reuses it via storageState.
setup("authenticate", async ({ page }) => {
  const stamp = Date.now();
  const email = `e2e+${stamp}@test.dev`;
  const password = "password1234";

  // Sign up (redirects to /sign-in?message=account-created).
  await page.goto("/sign-up");
  await page.getByPlaceholder("Full name").fill("E2E User");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password", { exact: true }).fill(password);
  await page.getByPlaceholder("Confirm password").fill(password);
  await page.getByRole("button", { name: "Sign up" }).click();
  await page.waitForURL(/\/sign-in/);

  // Sign in with the credentials we just created.
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  // Confirm the session works on a protected route.
  await page.goto("/boards");
  await expect(page.getByRole("heading", { name: "Your Boards" })).toBeVisible();

  await page.context().storageState({ path: authFile });
});
