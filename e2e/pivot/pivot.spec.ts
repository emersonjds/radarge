import { test, expect, type BrowserContext } from "@playwright/test";
import { newPageIn, signInContext, sidebar } from "../helpers";
import { ACCOUNTS } from "../seed-api";

let adminContext: BrowserContext;
let professorContext: BrowserContext;

test.beforeAll(async ({ browser }) => {
  adminContext = await signInContext(browser, ACCOUNTS.pivotAdmin);
  professorContext = await signInContext(browser, ACCOUNTS.pivotProfessor);
});

test.describe("ong reforço pivot: ficha cadastral e matrícula N:N", () => {
  test("admin cria ficha do aluno, matricula em aula, e professor vê na chamada", async () => {
    const admin = await newPageIn(adminContext);

    await admin.goto("/");
    await sidebar(admin).getByRole("link", { name: "Alunos", exact: true }).click();
    await expect(admin.getByRole("heading", { name: "Alunos" })).toBeVisible({ timeout: 10000 });

    await admin.getByRole("button", { name: "Adicionar aluno" }).click();
    await admin.getByLabel("Nome", { exact: true }).fill("João Pedro Silva");
    await admin.getByLabel("Data de nascimento").fill("2010-03-15");
    await admin.getByLabel("Nome do responsável").fill("Maria Silva");
    await admin.getByLabel("Telefone do responsável").fill("(11) 98765-4321");
    await admin.getByRole("button", { name: "Salvar" }).click();

    await expect(admin.getByText("João Pedro Silva")).toBeVisible({ timeout: 5000 });
    await expect(admin.getByRole("dialog")).toHaveCount(0);
    await admin.screenshot({ path: "e2e/pivot/evidencias/aluno-criado.png", fullPage: true });

    await sidebar(admin).getByRole("link", { name: "Aulas", exact: true }).click();
    await expect(admin.getByRole("heading", { name: "Aulas" })).toBeVisible();

    const aulaCard = admin.locator("li", { hasText: "E2E Pivot — Aula" });
    await aulaCard.getByRole("button", { name: "Ver detalhes" }).click();

    await expect(aulaCard.getByText("Alunos matriculados")).toBeVisible();

    await aulaCard.getByLabel("Adicionar aluno").selectOption({ label: "João Pedro Silva" });
    await aulaCard.getByRole("button", { name: "Matricular" }).click();

    await expect(aulaCard.getByText("João Pedro Silva")).toBeVisible({ timeout: 5000 });
    await admin.screenshot({ path: "e2e/pivot/evidencias/aluno-matriculado.png", fullPage: true });

    const professor = await newPageIn(professorContext);
    await professor.goto("/");
    await sidebar(professor).getByRole("link", { name: "Chamada", exact: true }).click();

    await professor.getByLabel("Selecionar aula").selectOption({ label: "E2E Pivot — Aula" });

    await expect(professor.getByText("João Pedro Silva")).toBeVisible({ timeout: 5000 });
    await professor.screenshot({
      path: "e2e/pivot/evidencias/aluno-na-chamada.png",
      fullPage: true,
    });
  });
});
