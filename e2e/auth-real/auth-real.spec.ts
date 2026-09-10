import { expect, test, type Page } from "@playwright/test";
import { ACCOUNTS, seedAll } from "../seed-api";

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

test("entra com credencial válida e chega ao painel", async ({ page }) => {
  const account = ACCOUNTS.signIn;
  await signIn(page, account.username, account.password);

  await expect(page).toHaveURL("/");
  await expect(page.getByText(account.name).first()).toBeVisible();
  await page.screenshot({ path: "e2e/auth-real/evidencias/login-valido.png", fullPage: true });
});

test("credencial inválida mostra texto nosso, nunca a mensagem do servidor", async ({ page }) => {
  const account = ACCOUNTS.wrongPassword;
  await signIn(page, account.username, "nao-e-a-senha-dele");

  const alert = page.locator("form").getByRole("alert");
  await expect(alert).toHaveText("Usuário ou senha incorretos.");
  await expect(alert).not.toContainText("credential");
  await expect(page).toHaveURL(/\/login/);
  await page.screenshot({
    path: "e2e/auth-real/evidencias/credencial-invalida.png",
    fullPage: true,
  });
});

test("sessão sobrevive ao recarregar, mesmo com o token morrendo na memória", async ({ page }) => {
  const account = ACCOUNTS.reload;
  await signIn(page, account.username, account.password);
  await expect(page).toHaveURL("/");

  await page.reload();

  await expect(page).toHaveURL("/");
  await expect(page.getByText(account.name).first()).toBeVisible();
  await page.screenshot({
    path: "e2e/auth-real/evidencias/sessao-apos-reload.png",
    fullPage: true,
  });
});

test("senha provisória leva à tela de definição de senha", async ({ page }) => {
  const account = ACCOUNTS.provisional;
  await signIn(page, account.username, account.provisionalPassword);

  await expect(page).toHaveURL(/\/change-password/);
  await expect(page.getByRole("heading", { name: "Defina sua senha" })).toBeVisible();
  await page.screenshot({ path: "e2e/auth-real/evidencias/senha-provisoria.png", fullPage: true });
});

test("sair encerra a sessão de verdade: voltar ao painel não entra", async ({ page }) => {
  const account = ACCOUNTS.logout;
  await signIn(page, account.username, account.password);
  await expect(page).toHaveURL("/");

  await page.getByRole("button", { name: /sair/i }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await page.screenshot({ path: "e2e/auth-real/evidencias/logout-revogado.png", fullPage: true });
});
