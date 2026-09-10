import { expect, test } from "@playwright/test";
import { newPageIn, signInContext, captureScreen } from "../helpers";
import { ACCOUNTS } from "../seed-api";

test.describe("admin dashboard", () => {
  test("KPIs and ApexCharts charts render", async ({ browser }) => {
    const context = await signInContext(browser, ACCOUNTS.dashboardAdmin);
    const page = await newPageIn(context, { width: 1280, height: 900 });
    await page.goto("/");
    await expect(page.getByText("Total de alunos")).toBeVisible();
    await expect(page.getByText("Total de professores")).toBeVisible();
    await expect(page.getByText("Frequência geral")).toBeVisible();
    await expect(page.getByText("Frequência por aula")).toBeVisible();
    await expect(page.getByText("Tendência de frequência")).toBeVisible();
    await expect(page.locator(".apexcharts-canvas")).toHaveCount(2, { timeout: 15000 });
    await captureScreen(page, "e2e/dashboard/evidence/admin-dashboard.png");
  });
});

test.describe("coordinator dashboard", () => {
  test("coordinator sees the dashboard", async ({ browser }) => {
    const context = await signInContext(browser, ACCOUNTS.dashboardCoordinator);
    const page = await newPageIn(context, { width: 375, height: 812 });
    await page.goto("/");

    await expect(page.getByText("Total de alunos")).toBeVisible();
    await expect(page.locator(".apexcharts-canvas").first()).toBeVisible({ timeout: 15000 });

    await captureScreen(page, "e2e/dashboard/evidence/coordination-dashboard-mobile.png");
  });
});
