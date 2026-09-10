import { expect, test } from "@playwright/test";
import { newPageIn, signInContext } from "../helpers";
import { ACCOUNTS } from "../seed-api";

test.describe("painel admin", () => {
  test("KPIs e gráficos ApexCharts renderizam", async ({ browser }) => {
    const context = await signInContext(browser, ACCOUNTS.painelAdmin);
    const page = await newPageIn(context, { width: 1280, height: 900 });
    await page.goto("/");
    await expect(page.getByText("Total de alunos")).toBeVisible();
    await expect(page.getByText("Total de professores")).toBeVisible();
    await expect(page.getByText("Frequência geral")).toBeVisible();
    await expect(page.getByText("Frequência por aula")).toBeVisible();
    await expect(page.getByText("Tendência de frequência")).toBeVisible();
    await expect(page.locator(".apexcharts-canvas")).toHaveCount(2, { timeout: 15000 });
    await page.screenshot({ path: "e2e/dashboard/evidencias/painel-admin.png", fullPage: true });
  });
});

test.describe("painel coordenação", () => {
  test("coordenador vê o painel", async ({ browser }) => {
    const context = await signInContext(browser, ACCOUNTS.painelCoordenador);
    const page = await newPageIn(context, { width: 375, height: 812 });
    await page.goto("/");

    await expect(page.getByText("Total de alunos")).toBeVisible();
    await expect(page.locator(".apexcharts-canvas").first()).toBeVisible({ timeout: 15000 });

    await page.screenshot({
      path: "e2e/dashboard/evidencias/painel-coordenacao-mobile.png",
      fullPage: true,
    });
  });
});
