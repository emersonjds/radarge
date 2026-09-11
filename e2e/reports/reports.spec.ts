import { expect, test, type BrowserContext } from "@playwright/test";
import { newPageIn, signInContext, captureScreen, captureEvidence } from "../helpers";
import { ACCOUNTS, adminToken, findByName } from "../seed-api";

let adminContext: BrowserContext;

test.beforeAll(async ({ browser }) => {
  adminContext = await signInContext(browser, ACCOUNTS.reportsAdmin);
});

test("analysis center: overview, per-group slice and CSV export", async () => {
  const page = await newPageIn(adminContext, { width: 1280, height: 800 });
  await page.goto("/reports");

  await expect(page.getByRole("heading", { name: "Relatórios", exact: true })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByRole("heading", { name: "Panorama — Todas as aulas" })).toBeVisible();
  const panorama = page.locator("section").filter({ hasText: "Panorama — Todas as aulas" });
  await expect(panorama.getByText("Nota média")).toBeVisible();
  await expect(panorama.getByText("Área forte")).toBeVisible();
  await expect(panorama.getByText("Média por área")).toBeVisible();

  const enzoRow = page.getByRole("row").filter({ hasText: "Enzo Ferreira" });
  await expect(enzoRow).toContainText("Exatas");

  await captureEvidence(panorama, "e2e/reports/evidence/reports-overview.png");

  await page.getByLabel("Selecionar aula").selectOption({ label: "E2E Relatorios — Aula A" });
  await expect(
    page.getByRole("heading", { name: "Panorama — E2E Relatorios — Aula A" }),
  ).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Exportar CSV" }).click(),
  ]);
  expect(download.suggestedFilename()).toContain(".csv");
});

test("student record shows the attendance rate and the academic block with aptitude", async () => {
  const token = await adminToken();
  const enzo = await findByName<{ id: string; name: string }>(token, "/students", "Enzo Ferreira");

  const page = await newPageIn(adminContext, { width: 1280, height: 800 });
  await page.goto("/reports");

  const enzoRow = page.getByRole("row").filter({ hasText: "Enzo Ferreira" });
  await enzoRow.getByRole("link", { name: "Abrir relatório de Enzo Ferreira" }).click();
  await expect(page).toHaveURL(`/reports?studentId=${enzo.id}`);

  await expect(page.getByRole("heading", { name: "Enzo Ferreira" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Relatórios" })).toBeVisible();
  await expect(page.getByText("Sem chamadas registradas.")).toBeVisible();

  await page.getByRole("tab", { name: "Notas" }).click();
  await expect(page.getByRole("heading", { name: "Desempenho acadêmico" })).toBeVisible();
  await expect(page.getByText("Aptidão: Exatas")).toBeVisible();
  await expect(page.getByText("Notas por matéria")).toBeVisible();

  await captureScreen(page, "e2e/reports/evidence/student-record.png");
});
