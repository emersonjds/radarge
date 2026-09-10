import { test, expect } from "@playwright/test";
import { login, sidebar } from "../helpers";

test.describe("ong reforço pivot: ficha cadastral e matrícula N:N", () => {
  test("admin cria ficha do aluno, matricula em aula, e professor vê na chamada", async ({
    page,
  }) => {
    await login(page, "Administrador");

    await sidebar(page).getByRole("link", { name: "Alunos", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Alunos" })).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: "Adicionar aluno" }).click();
    await page.getByLabel("Nome", { exact: true }).fill("João Pedro Silva");
    await page.getByLabel("Data de nascimento").fill("2010-03-15");
    await page.getByLabel("Nome do responsável").fill("Maria Silva");
    await page.getByLabel("Telefone do responsável").fill("(11) 98765-4321");
    await page.getByRole("button", { name: "Salvar" }).click();

    await expect(page.getByText("João Pedro Silva")).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.screenshot({ path: "e2e/pivot/evidencias/aluno-criado.png", fullPage: true });

    await sidebar(page).getByRole("link", { name: "Aulas", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Aulas" })).toBeVisible();

    const aulaCard = page.locator("li", { hasText: "Reforço de Matemática — Segunda" });
    await aulaCard.getByRole("button", { name: "Ver detalhes" }).click();

    await expect(aulaCard.getByText("Alunos matriculados")).toBeVisible();

    await aulaCard.getByLabel("Adicionar aluno").selectOption({ label: "João Pedro Silva" });
    await aulaCard.getByRole("button", { name: "Matricular" }).click();

    await expect(aulaCard.getByText("João Pedro Silva")).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: "e2e/pivot/evidencias/aluno-matriculado.png", fullPage: true });

    await page.getByRole("button", { name: "Sair" }).click();

    await login(page, "Professor");
    await sidebar(page).getByRole("link", { name: "Chamada", exact: true }).click();

    await page
      .getByLabel("Selecionar aula")
      .selectOption({ label: "Reforço de Matemática — Segunda" });

    await expect(page.getByText("João Pedro Silva")).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: "e2e/pivot/evidencias/aluno-na-chamada.png", fullPage: true });
  });
});
