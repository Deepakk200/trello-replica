import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

// E2E runs against a REAL built app + test Postgres (HARD RULE: no DB mocks).
// CI builds first, then Playwright's webServer boots `next start` with the test
// DATABASE_URL + AUTH_SECRET in the environment.
export default defineConfig({
  testDir: "tests/e2e",
  // Wipe the test DB before the suite (test isolation; guarded to *_test DBs).
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  // Cold `next start` + a force-dynamic, multi-query /boards render can exceed the
  // 5s default on the first request in CI. This is auto-retry headroom (polled),
  // NOT a fixed delay — assertions resolve the instant the element is visible.
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: "tests/e2e/.auth/user.json" },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: process.env.E2E_BASE_URL ? "echo using-existing-server" : "npm run start",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
