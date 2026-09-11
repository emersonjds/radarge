import { test as setup } from "@playwright/test";
import { seedAll } from "./seed-api";

/**
 * Puts every account and every spec's demo dataset into the API before any spec
 * runs. Nothing here signs in through the browser — each spec file does that itself,
 * once, with its own account (see helpers.ts and seed-api.ts for why).
 */
setup("seed the API", async () => {
  await seedAll();
});
