import { expect, test, type BrowserContext } from "@playwright/test";
import { newPageIn, signInContext, sidebar, captureScreen, captureEvidence } from "../helpers";
import { ACCOUNTS } from "../seed-api";

test.describe("academic structure admin", () => {
  let adminContext: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    adminContext = await signInContext(browser, ACCOUNTS.academicaAdmin);
  });

  test("admin creates a subject", async () => {
    const page = await newPageIn(adminContext);
    await page.goto("/subjects");

    const name = `Filosofia E2E ${String(Date.now())}`;
    await page.getByRole("button", { name: "Adicionar matéria" }).click();
    await page.getByLabel("Nome").fill(name);
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText(name)).toBeVisible();

    // Frames the new row, not the whole (ever-growing) matérias list.
    const item = page.locator("li", { hasText: name });
    await captureEvidence(item, "e2e/academic-structure/evidencias/materia-criada.png");
  });

  test("admin creates a turma and assigns a matéria to a professor", async () => {
    const page = await newPageIn(adminContext);
    await page.goto("/groups");

    const name = `Redação E2E ${String(Date.now())}`;
    await page.getByRole("button", { name: "Adicionar aula" }).click();
    await page.getByLabel("Nome").fill(name);
    await page.getByLabel("Professor regente").click();
    await page.getByRole("option", { name: ACCOUNTS.academicaProfessor2.name }).click();
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText(name)).toBeVisible();

    const card = page.locator("li", { hasText: name });
    await card.getByRole("button", { name: "Ver detalhes" }).click();
    await card.getByRole("button", { name: "Adicionar matéria à aula" }).click();
    await expect(card.getByText("Nenhuma matéria atribuída ainda.")).toHaveCount(0);

    // Frames the turma card, not the whole (ever-growing) aulas list.
    await captureEvidence(card, "e2e/academic-structure/evidencias/turma-com-lecionamento.png");
  });
});

test.describe("roll-call scoping", () => {
  test("ricardo sees only his regência turmas in the roll-call select", async ({ browser }) => {
    const context = await signInContext(browser, ACCOUNTS.academicaProfessor1);
    const page = await newPageIn(context);
    await page.goto("/");
    await sidebar(page).getByRole("link", { name: "Chamada", exact: true }).click();

    const select = page.getByLabel("Selecionar aula");
    await expect(select).toBeEnabled();
    const options = await select.locator("option").allTextContents();
    expect(options.join(" ")).toContain("Reforço de Matemática — Segunda");
    expect(options.join(" ")).toContain("Reforço de Português — Quarta");
    expect(options.join(" ")).not.toContain("Reforço de Ciências — Quarta");

    await captureScreen(page, "e2e/academic-structure/evidencias/chamada-ricardo.png");
  });

  test("bruno sees only Reforço de Ciências — Quarta in the roll-call select", async ({
    browser,
  }) => {
    const context = await signInContext(browser, ACCOUNTS.academicaProfessor2);
    const page = await newPageIn(context);
    await page.goto("/");
    await sidebar(page).getByRole("link", { name: "Chamada", exact: true }).click();

    const select = page.getByLabel("Selecionar aula");
    await expect(select).toBeEnabled();
    const options = await select.locator("option").allTextContents();
    expect(options.join(" ")).toContain("Reforço de Ciências — Quarta");
    expect(options.join(" ")).not.toContain("Reforço de Matemática — Segunda");

    await captureScreen(page, "e2e/academic-structure/evidencias/chamada-bruno.png");
  });
});
