import { expect, test, type Page } from "@playwright/test";
import { ACCOUNTS, seedAll } from "../seed-api";
import { captureScreen } from "../helpers";

/**
 * Runs against a real radarge-api, not a mock. A mocked session would answer
 * whatever the mock says and prove nothing about the refresh cookie, which is
 * the part that actually carries a session across a reload.
 */
test.beforeAll(async () => {
  await seedAll();
});

const signIn = async (page: Page, username: string, password: string): Promise<void> => {
  await page.goto("/login");
  await page.getByLabel("Usuário").fill(username);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
};

test("signs in with valid credentials and reaches the dashboard", async ({ page }) => {
  const account = ACCOUNTS.signIn;
  await signIn(page, account.username, account.password);

  await expect(page).toHaveURL("/");
  await expect(page.getByText(account.name).first()).toBeVisible();
  await captureScreen(page, "e2e/auth-real/evidence/valid-sign-in.png");
});

test("invalid credentials show our copy, never the server message", async ({ page }) => {
  const account = ACCOUNTS.wrongPassword;
  await signIn(page, account.username, "nao-e-a-senha-dele");

  const alert = page.locator("form").getByRole("alert");
  await expect(alert).toHaveText("Usuário ou senha incorretos.");
  await expect(alert).not.toContainText("credential");
  await expect(page).toHaveURL(/\/login/);
  await captureScreen(page, "e2e/auth-real/evidence/invalid-credential.png");
});

test("session survives a reload even though the token dies with memory", async ({ page }) => {
  const account = ACCOUNTS.reload;
  await signIn(page, account.username, account.password);
  await expect(page).toHaveURL("/");

  await page.reload();

  await expect(page).toHaveURL("/");
  await expect(page.getByText(account.name).first()).toBeVisible();
  await captureScreen(page, "e2e/auth-real/evidence/session-after-reload.png");
});

test("a provisional password leads to the set-password screen", async ({ page }) => {
  const account = ACCOUNTS.provisional;
  await signIn(page, account.username, account.provisionalPassword);

  await expect(page).toHaveURL(/\/change-password/);
  await expect(page.getByRole("heading", { name: "Defina sua senha" })).toBeVisible();
  await captureScreen(page, "e2e/auth-real/evidence/provisional-password.png");
});

test("signing out really ends the session: going back to the dashboard does not enter", async ({
  page,
}) => {
  const account = ACCOUNTS.logout;
  await signIn(page, account.username, account.password);
  await expect(page).toHaveURL("/");

  await page.getByRole("button", { name: /sair/i }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await captureScreen(page, "e2e/auth-real/evidence/sign-out-revoked.png");
});
