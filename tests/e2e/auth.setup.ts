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

  // Sign in with the credentials we just created. The credentials form calls
  // signIn() then router.push("/") on success, so WAIT for that redirect — it's
  // the deterministic signal that the session cookie is set. Setting up the wait
  // before the click (Promise.all) avoids missing a fast navigation.
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await Promise.all([
    page.waitForURL((url) => url.pathname === "/"),
    page.getByRole("button", { name: "Sign in" }).click(),
  ]);

  // Session is now established → the protected boards route renders.
  await page.goto("/boards");
  await expect(page.getByRole("heading", { name: "Your Boards" })).toBeVisible();

  await page.context().storageState({ path: authFile });
});
