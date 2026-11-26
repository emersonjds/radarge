import { expect, test, type Page } from "@playwright/test";
import { adminToken, apiRequest, signIn } from "../seed-api";
import { captureScreen } from "../helpers";

const VIEWPORTS = [
  { width: 375, height: 812 },
  { width: 1440, height: 900 },
];

const createFreshTeacher = async (username: string): Promise<string> => {
  const response = await apiRequest("/profiles", "POST", await adminToken(), {
    name: "Professora do Tour",
    username,
    role: "teacher",
  });
  expect(response.status).toBe(201);
  const { provisionalPassword } = (await response.json()) as { provisionalPassword: string };
  return provisionalPassword;
};

const submitLogin = async (page: Page, username: string, password: string): Promise<void> => {
  await page.getByLabel("Usuário").fill(username);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
};

const tourCompletedOf = async (username: string, password: string): Promise<boolean> => {
  const token = await signIn(username, password);
  if (token === null) throw new Error(`could not sign ${username} in`);
  const response = await apiRequest("/auth/me", "GET", token);
  const { tourCompleted } = (await response.json()) as { tourCompleted: boolean };
  return tourCompleted;
};

for (const viewport of VIEWPORTS) {
  test(`a first access meets the tour once, and it replays on demand at ${String(viewport.width)}px`, async ({
    browser,
  }) => {
    const username = `perfil.tour.${String(Date.now())}`;
    const password = `definitiva-tour-${String(viewport.width)}`;
    const provisionalPassword = await createFreshTeacher(username);

    const context = await browser.newContext({ viewport });
    const page = await context.newPage();

    await page.goto("/login");
    await submitLogin(page, username, provisionalPassword);
    await expect(page).toHaveURL(/\/change-password/);
    await page.getByLabel("Senha atual").fill(provisionalPassword);
    await page.getByLabel("Nova senha").fill(password);
    await page.getByRole("button", { name: "Salvar e entrar de novo" }).click();
    await expect(page).toHaveURL(/\/login/);
    await submitLogin(page, username, password);
    await expect(page).toHaveURL("/");

    const popover = page.locator(".radarge-tour");
    await expect(popover).toBeVisible();
    await expect(popover).toContainText("1 de 6");
    await captureScreen(page, `e2e/product-tour/evidence/first-step-${String(viewport.width)}.png`);

    await popover.getByRole("button", { name: "Próximo" }).click();
    await expect(popover).toContainText("2 de 6");
    await expect(page.locator('[data-tour="nav-/attendance"]')).toHaveClass(
      /driver-active-element/,
    );
    // driver.js moves the spotlight in JS, which Playwright cannot freeze: wait until it lands.
    const spotlight = page.locator(".driver-overlay path");
    await expect
      .poll(async () => {
        const before = await spotlight.getAttribute("d");
        await page.waitForTimeout(100);
        return before === (await spotlight.getAttribute("d"));
      })
      .toBe(true);
    await captureScreen(
      page,
      `e2e/product-tour/evidence/attendance-step-${String(viewport.width)}.png`,
    );

    await popover.locator(".driver-popover-close-btn").click();
    await expect(popover).toBeHidden();
    await expect.poll(() => tourCompletedOf(username, password), { intervals: [1000] }).toBe(true);

    await page.reload();
    const replayButton = page.getByRole("button", { name: "Rever tour" });
    await expect(replayButton).toBeVisible();
    await expect(popover).toBeHidden();

    await replayButton.click();
    await expect(popover).toBeVisible();
    await expect(popover).toContainText("1 de 6");

    await context.close();
  });
}
