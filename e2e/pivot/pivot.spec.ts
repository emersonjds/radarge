import { test, expect, type BrowserContext } from "@playwright/test";
import { newPageIn, signInContext, sidebar, captureScreen, captureEvidence } from "../helpers";
import { ACCOUNTS } from "../seed-api";

let adminContext: BrowserContext;
let teacherContext: BrowserContext;

test.beforeAll(async ({ browser }) => {
  adminContext = await signInContext(browser, ACCOUNTS.pivotAdmin);
  teacherContext = await signInContext(browser, ACCOUNTS.pivotProfessor);
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
    await captureScreen(admin, "e2e/pivot/evidencias/aluno-criado.png");

    await sidebar(admin).getByRole("link", { name: "Aulas", exact: true }).click();
    await expect(admin.getByRole("heading", { name: "Aulas" })).toBeVisible();

    const groupCard = admin.locator("li", { hasText: "E2E Pivot — Aula" });
    await groupCard.getByRole("button", { name: "Ver detalhes" }).click();

    await expect(groupCard.getByText("Alunos matriculados")).toBeVisible();

    await groupCard.getByLabel("Adicionar aluno").selectOption({ label: "João Pedro Silva" });
    await groupCard.getByRole("button", { name: "Matricular" }).click();

    await expect(groupCard.getByText("João Pedro Silva")).toBeVisible({ timeout: 5000 });
    await captureEvidence(groupCard, "e2e/pivot/evidencias/aluno-matriculado.png");

    const teacher = await newPageIn(teacherContext);
    await teacher.goto("/");
    await sidebar(teacher).getByRole("link", { name: "Chamada", exact: true }).click();

    await teacher.getByLabel("Selecionar aula").selectOption({ label: "E2E Pivot — Aula" });

    await expect(teacher.getByText("João Pedro Silva")).toBeVisible({ timeout: 5000 });
    await captureScreen(teacher, "e2e/pivot/evidencias/aluno-na-chamada.png");
  });
});
