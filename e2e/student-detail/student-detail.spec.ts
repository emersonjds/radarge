import { expect, test, type Page } from "@playwright/test";
import { login } from "../helpers";

const DESKTOP_VIEWPORT = { width: 1280, height: 800 };
const MOBILE_VIEWPORT = { width: 375, height: 812 };

async function semOverflowHorizontal(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe("detalhe do aluno (desktop)", () => {
  test.use({ viewport: DESKTOP_VIEWPORT });

  test("admin abre o detalhe a partir da tabela de relatórios", async ({ page }) => {
    await login(page, "Administrador");
    await page.goto("/reports");

    const linhaMarcus = page.getByRole("row").filter({ hasText: "Marcus Thorne" });
    await linhaMarcus.getByRole("link", { name: "Ver relatório de Marcus Thorne" }).click();

    await expect(page).toHaveURL("/reports?studentId=aluno-1");
    await expect(page.getByRole("heading", { name: "Marcus Thorne" })).toBeVisible();
    await expect(page.getByText("404")).toHaveCount(0);

    await page.screenshot({
      path: "e2e/student-detail/evidencias/admin-detalhe-aluno.png",
      fullPage: true,
    });
  });

  test("professor abre o detalhe a partir da lista de alunos", async ({ page }) => {
    await login(page, "Professor");
    await page.goto("/students");

    await page.getByRole("link", { name: "Ver detalhes de Marcus Thorne" }).click();

    await expect(page).toHaveURL("/students?aluno=aluno-1");
    await expect(page.getByRole("heading", { name: "Marcus Thorne" })).toBeVisible();
    await expect(page.getByText("Reforço de Matemática — Segunda")).toBeVisible();
    await expect(page.getByText("Reforço de Física — Terça")).toBeVisible();
    await expect(page.getByText("404")).toHaveCount(0);

    await page.screenshot({
      path: "e2e/student-detail/evidencias/professor-detalhe-aluno.png",
      fullPage: true,
    });
  });

  test("escopo: professor não acessa a ficha de aluno de outro professor, nem por link direto (PII)", async ({
    page,
  }) => {
    await login(page, "Professor");
    await page.goto("/students?aluno=aluno-3");

    // Julian Rossi é aluno do Bruno — pro Ricardo o aluno "não existe", ponto final.
    await expect(page.getByText("Aluno não encontrado.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Julian Rossi" })).toHaveCount(0);
    await expect(page.getByText("Julian Rossi")).toHaveCount(0);
    await expect(page.getByText("Mãe de Rossi")).toHaveCount(0);
    await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
    await expect(page.getByText("Reforço de Ciências — Quarta")).toHaveCount(0);

    await page.screenshot({
      path: "e2e/student-detail/evidencias/escopo-professor.png",
      fullPage: true,
    });

    await page.getByRole("link", { name: "Voltar para Alunos" }).click();
    await expect(page).toHaveURL("/students");
    await expect(page.getByRole("heading", { name: "Meus alunos" })).toBeVisible();
  });

  test("professor vê a ficha completa do próprio aluno, com PII do responsável", async ({
    page,
  }) => {
    await login(page, "Professor");
    await page.goto("/students?aluno=aluno-1");

    await expect(page.getByRole("heading", { name: "Marcus Thorne" })).toBeVisible();
    await expect(page.getByText("Aluno não encontrado.")).toHaveCount(0);
    await expect(page.getByText("Mãe de Thorne")).toBeVisible();
    await expect(page.locator('a[href^="tel:"]')).toBeVisible();
    await expect(page.getByText("Reforço de Matemática — Segunda")).toBeVisible();
    await expect(page.getByText("Reforço de Física — Terça")).toBeVisible();

    await page.screenshot({
      path: "e2e/student-detail/evidencias/aluno-proprio-professor.png",
      fullPage: true,
    });
  });

  test("aluno sem aula matriculada mostra estado vazio", async ({ page }) => {
    await login(page, "Administrador");
    await page.goto("/reports?studentId=aluno-sem-aula");

    await expect(page.getByRole("heading", { name: "Otávio Prado" })).toBeVisible();
    await expect(page.getByText("Sem aulas matriculadas.")).toBeVisible();
    await expect(page.getByText("—", { exact: true })).toHaveCount(2);

    await page.screenshot({
      path: "e2e/student-detail/evidencias/aluno-sem-aula.png",
      fullPage: true,
    });
  });

  test("aluno inativo mostra badge INATIVO e aviso", async ({ page }) => {
    await login(page, "Administrador");
    await page.goto("/reports?studentId=aluno-inativo");

    await expect(page.getByRole("heading", { name: "Priscila Amaral" })).toBeVisible();
    await expect(page.getByText("INATIVO", { exact: true })).toBeVisible();
    await expect(
      page.getByText(
        "Aluno inativo — os dados abaixo estão congelados e não recebem novas chamadas.",
      ),
    ).toBeVisible();

    await page.screenshot({
      path: "e2e/student-detail/evidencias/aluno-inativo.png",
      fullPage: true,
    });
  });

  test("aluno inexistente mostra estado de erro com botão de voltar funcional", async ({
    page,
  }) => {
    await login(page, "Administrador");
    await page.goto("/reports?studentId=nao-existe");

    await expect(page.getByText("Aluno não encontrado.")).toBeVisible();
    await expect(page.getByText("404")).toHaveCount(0);

    await page.screenshot({
      path: "e2e/student-detail/evidencias/aluno-nao-encontrado.png",
      fullPage: true,
    });

    await page.getByRole("link", { name: "Voltar para Relatórios" }).click();
    await expect(page).toHaveURL("/reports");
    await expect(page.getByRole("heading", { name: "Relatórios", exact: true })).toBeVisible();
  });

  test("abas Presença e Notas trocam o conteúdo", async ({ page }) => {
    await login(page, "Administrador");
    await page.goto("/reports?studentId=aluno-1");

    await expect(page.getByRole("heading", { name: "Resumo de presença" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Desempenho acadêmico" })).toHaveCount(0);
    await page.screenshot({
      path: "e2e/student-detail/evidencias/aba-presenca.png",
      fullPage: true,
    });

    await page.getByRole("tab", { name: "Notas" }).click();
    await expect(page.getByRole("heading", { name: "Desempenho acadêmico" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Resumo de presença" })).toHaveCount(0);
    await page.screenshot({ path: "e2e/student-detail/evidencias/aba-notas.png", fullPage: true });
  });
});

test.describe("detalhe do aluno (mobile 375px)", () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test("professor visualiza o detalhe do aluno com abas usáveis", async ({ page }) => {
    await login(page, "Professor");
    await page.goto("/students?aluno=aluno-1");

    await expect(page.getByRole("heading", { name: "Marcus Thorne" })).toBeVisible();
    await semOverflowHorizontal(page);

    await page.getByRole("tab", { name: "Notas" }).click();
    await expect(page.getByRole("heading", { name: "Desempenho acadêmico" })).toBeVisible();
    await semOverflowHorizontal(page);

    await page.getByRole("tab", { name: "Presença" }).click();
    await expect(page.getByRole("heading", { name: "Resumo de presença" })).toBeVisible();

    await page.screenshot({
      path: "e2e/student-detail/evidencias/mobile-detalhe-aluno.png",
      fullPage: true,
    });
  });
});
