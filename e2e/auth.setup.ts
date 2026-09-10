import { test as setup, expect } from "@playwright/test";
import { ACCOUNTS, seedAll, type TestAccount } from "./seed-api";

/**
 * Signs in once per role and saves the browser state, so the specs reuse a session
 * instead of signing in again each time. Two reasons this is not just a speed-up:
 * sign-in is throttled per username at ten attempts per five minutes and the throttle
 * counts successes, and signing out ends that account's session everywhere.
 *
 * Only the refresh cookie is saved — the access token lives in memory by design and
 * dies with the page. That is fine: on load the client spends the cookie and gets a
 * new one, which is the same path a returning user takes.
 */
export const STATE_FILES = {
  teacher: "e2e/.auth/teacher.json",
  coordinator: "e2e/.auth/coordinator.json",
  admin: "e2e/.auth/admin.json",
} as const;

setup("seed the API", async () => {
  await seedAll();
});

const signInAndSave = async (
  page: import("@playwright/test").Page,
  account: Pick<TestAccount, "username"> & { password: string },
  statePath: string,
): Promise<void> => {
  await page.goto("/login");
  await page.getByLabel("Usuário").fill(account.username);
  await page.getByLabel("Senha").fill(account.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL("/");
  await page.context().storageState({ path: statePath });
};

setup("authenticate as teacher", async ({ page }) => {
  await signInAndSave(page, ACCOUNTS.teacher, STATE_FILES.teacher);
});

setup("authenticate as coordinator", async ({ page }) => {
  await signInAndSave(page, ACCOUNTS.coordinator, STATE_FILES.coordinator);
});
