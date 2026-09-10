import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import type { TestAccount } from "./seed-api";

export interface Viewport {
  width: number;
  height: number;
}

/**
 * Signs in through the login form on a fresh context and returns that context —
 * one sign-in attempt spent against the account's throttle. Call this once per
 * account per file (in `test.beforeAll`) and open every test's page from the
 * returned context with `newPageIn`, so the file never signs the same account in
 * twice: the refresh cookie the API hands back is single-use, and a context's own
 * cookie jar already carries each rotation forward to the next page opened from it.
 */
export async function signInContext(
  browser: Browser,
  account: Pick<TestAccount, "username"> & { password: string },
): Promise<BrowserContext> {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("/login");
  await page.getByLabel("Usuário").fill(account.username);
  await page.getByLabel("Senha").fill(account.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL("/");

  return context;
}

/** A new tab in an already signed-in context, sized for whichever test needs it. */
export async function newPageIn(context: BrowserContext, viewport?: Viewport): Promise<Page> {
  const page = await context.newPage();
  if (viewport) await page.setViewportSize(viewport);
  return page;
}

export function sidebar(page: Page) {
  return page.getByRole("navigation", { name: "Navegação principal" });
}
