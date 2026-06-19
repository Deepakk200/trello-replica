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

  // Deterministic readiness signal: the credentials form calls signIn() then
  // router.push("/"), but that client-side redirect is an incidental side-effect,
  // NOT proof the session cookie has committed — racing it (even via waitForURL)
  // is what made this setup flaky before visiting the protected /boards route.
  // Instead, poll NextAuth's own /api/auth/session: it returns the user ONLY once
  // the auth cookie is set, and page.request shares the browser context's cookie
  // jar. This is auto-retried polling (no fixed delay), independent of any app
  // redirect timing.
  await expect(async () => {
    const res = await page.request.get("/api/auth/session");
    expect(res.ok()).toBeTruthy();
    const session = await res.json();
    expect(session?.user?.email).toBe(email);
  }).toPass({ timeout: 15_000 });

  // Session is now provably established → the protected boards route renders.
  await page.goto("/boards");
  await expect(page.getByRole("heading", { name: "Your Boards" })).toBeVisible();

  await page.context().storageState({ path: authFile });
});
