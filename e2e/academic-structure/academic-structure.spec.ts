import { expect, test, type BrowserContext } from "@playwright/test";
import { newPageIn, signInContext, sidebar } from "../helpers";
import { ACCOUNTS } from "../seed-api";

test.describe("academic structure admin", () => {
  let adminContext: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    adminContext = await signInContext(browser, ACCOUNTS.academicaAdmin);
  });

  test("admin creates a subject", async () => {
    const page = await newPageIn(adminContext);
    await page.goto("/subjects");

    const nome = `Filosofia E2E ${String(Date.now())}`;
    await page.getByRole("button", { name: "Adicionar matéria" }).click();
    await page.getByLabel("Nome").fill(nome);
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText(nome)).toBeVisible();
    await page.screenshot({
      path: "e2e/academic-structure/evidencias/materia-criada.png",
      fullPage: true,
    });
  });

  test("admin creates a turma and assigns a matéria to a teacher", async () => {
    const page = await newPageIn(adminContext);
    await page.goto("/groups");

    const nome = `Redação E2E ${String(Date.now())}`;
    await page.getByRole("button", { name: "Adicionar aula" }).click();
    await page.getByLabel("Nome").fill(nome);
    await page.getByLabel("Professor regente").click();
    await page.getByRole("option", { name: ACCOUNTS.academicaProfessor2.name }).click();
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText(nome)).toBeVisible();

    const card = page.locator("li", { hasText: nome });
    await card.getByRole("button", { name: "Ver detalhes" }).click();
    await card.getByRole("button", { name: "Adicionar matéria à aula" }).click();
    await expect(card.getByText("Nenhuma matéria atribuída ainda.")).toHaveCount(0);

    await page.screenshot({
      path: "e2e/academic-structure/evidencias/turma-com-lecionamento.png",
      fullPage: true,
    });
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

    await page.screenshot({
      path: "e2e/academic-structure/evidencias/chamada-ricardo.png",
      fullPage: true,
    });
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

    await page.screenshot({
      path: "e2e/academic-structure/evidencias/chamada-bruno.png",
      fullPage: true,
    });
  });
});
