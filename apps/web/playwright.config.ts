import { defineConfig, devices } from "@playwright/test";
import { E2E_BASE_URL, E2E_ENV, E2E_PORT, MOCK_PORT } from "./tests/e2e/env";

// Critical journeys against a production build with mocked payment providers (testing-strategy.md §2).
export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  // Journeys share one seeded database; run them one at a time.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: E2E_BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
  webServer: [
    {
      command: "node tests/e2e/mock-providers.mjs",
      url: `http://localhost:${MOCK_PORT}/health`,
      env: { ...E2E_ENV, MOCK_PROVIDERS_PORT: String(MOCK_PORT) },
      reuseExistingServer: false,
    },
    {
      command: `pnpm exec next build && pnpm exec next start --port ${E2E_PORT}`,
      // A static route: /api/health needs a migrated database, which globalSetup only prepares after the
      // server is up (on a fresh CI database that deadlocks).
      url: `${E2E_BASE_URL}/manifest.webmanifest`,
      env: E2E_ENV,
      timeout: 600_000,
      reuseExistingServer: false,
      stdout: "pipe",
    },
  ],
});
