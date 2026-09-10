import { defineConfig, devices } from "@playwright/test";

/**
 * The specs run against a real radarge-api, not a mock. That is the whole point:
 * a mocked backend answers whatever the mock says and proves nothing about the
 * refresh cookie, the role scoping, or the field names the API actually reads.
 *
 * Bring it up first:
 *   cd ../radarge-api && docker compose up -d && pnpm dev
 */
export default defineConfig({
  testDir: "e2e",
  use: {
    baseURL: "http://localhost:3000",
  },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120000,
  },
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      // Signs in through the form on every run, because these are the specs that
      // assert what signing in does. They cannot start from a restored session.
      name: "auth",
      testMatch: /auth-real\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
    {
      name: "chromium",
      testIgnore: /auth-real\/.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/teacher.json",
      },
      dependencies: ["setup"],
    },
  ],
});
