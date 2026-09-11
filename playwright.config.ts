import { defineConfig, devices } from "@playwright/test";

/**
 * The specs run against a real radarge-api, not a mock. That is the whole point:
 * a mocked backend answers whatever the mock says and proves nothing about the
 * refresh cookie, the role scoping, or the field names the API actually reads.
 *
 * Bring it up first:
 *   cd ../radarge-api && docker compose up -d && npm run dev
 */
export default defineConfig({
  testDir: "e2e",
  // The API rotates the refresh cookie on every use and revokes the whole session
  // if an already-spent cookie is presented again (theft protection). Each spec file
  // signs in once with its own account into its own context, so nothing here needs
  // to share a session across files or workers — one worker just keeps the run simple.
  workers: 1,
  use: {
    baseURL: "http://localhost:3000",
  },
  webServer: {
    command: "npm run dev",
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
      name: "chromium",
      testIgnore: /.*\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
  ],
});
