import { expect, test } from "@playwright/test";
import { login } from "../helpers";

test.use({ viewport: { width: 1280, height: 800 } });

test("central de análise: panorama, recorte por turma e export CSV", async ({ page }) => {
  await login(page, "Administrador");
  await page.goto("/reports");

  await expect(page.getByRole("heading", { name: "Relatórios", exact: true })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByRole("heading", { name: "Panorama — Todas as aulas" })).toBeVisible();
  const panorama = page.locator("section").filter({ hasText: "Panorama — Todas as aulas" });
  await expect(panorama.getByText("Nota média")).toBeVisible();
  await expect(panorama.getByText("Área forte")).toBeVisible();
  await expect(panorama.getByText("Média por área")).toBeVisible();

  const linhaMarcus = page.getByRole("row").filter({ hasText: "Marcus Thorne" });
  await expect(linhaMarcus).toContainText("Exatas");

  await page.screenshot({ path: "e2e/reports/evidencias/central-relatorios.png", fullPage: true });

  await page
    .getByLabel("Selecionar aula")
    .selectOption({ label: "Reforço de Matemática — Segunda" });
  await expect(
    page.getByRole("heading", { name: "Panorama — Reforço de Matemática — Segunda" }),
  ).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Exportar CSV" }).click(),
  ]);
  expect(download.suggestedFilename()).toContain(".csv");
});

test("ficha do aluno traz frequência e bloco acadêmico com aptidão", async ({ page }) => {
  await login(page, "Administrador");
  await page.goto("/reports");

  const linhaMarcus = page.getByRole("row").filter({ hasText: "Marcus Thorne" });
  await linhaMarcus.getByRole("link", { name: "Abrir relatório de Marcus Thorne" }).click();
  await expect(page).toHaveURL(/\/reports\?studentId=aluno-1/);

  await expect(page.getByRole("heading", { name: "Marcus Thorne" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Relatórios" })).toBeVisible();
  await expect(page.getByText("Frequência")).toBeVisible();
  await expect(page.getByText("Faltas")).toBeVisible();

  await page.getByRole("tab", { name: "Notas" }).click();
  await expect(page.getByRole("heading", { name: "Desempenho acadêmico" })).toBeVisible();
  await expect(page.getByText("Aptidão: Exatas")).toBeVisible();
  await expect(page.getByText("Notas por matéria")).toBeVisible();

  await page.screenshot({ path: "e2e/reports/evidencias/ficha-aluno.png", fullPage: true });
});
