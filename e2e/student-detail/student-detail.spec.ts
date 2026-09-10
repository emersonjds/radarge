import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { newPageIn, signInContext, captureScreen } from "../helpers";
import { ACCOUNTS, adminToken, findByName } from "../seed-api";

const DESKTOP_VIEWPORT = { width: 1280, height: 800 };
const MOBILE_VIEWPORT = { width: 375, height: 812 };
const NONEXISTENT_STUDENT_ID = "00000000-0000-0000-0000-000000000000";

async function semOverflowHorizontal(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

interface StudentIds {
  um: string;
  dois: string;
  semAula: string;
  inativo: string;
}

let ids: StudentIds;
let adminContext: BrowserContext;
let professor1Context: BrowserContext;

test.beforeAll(async ({ browser }) => {
  const token = await adminToken();
  const byName = async (name: string) =>
    (await findByName<{ id: string; name: string }>(token, "/students", name)).id;

  ids = {
    um: await byName("Aluno Detalhe Um"),
    dois: await byName("Aluno Detalhe Dois"),
    semAula: await byName("Aluno Detalhe Sem Aula"),
    inativo: await byName("Aluno Detalhe Inativo"),
  };

  adminContext = await signInContext(browser, ACCOUNTS.detalheAdmin);
  professor1Context = await signInContext(browser, ACCOUNTS.detalheProfessor1);
});

test.describe("detalhe do aluno (desktop)", () => {
  test("admin abre o detalhe a partir da tabela de relatórios", async () => {
    const page = await newPageIn(adminContext, DESKTOP_VIEWPORT);
    await page.goto("/reports");

    const row = page.getByRole("row").filter({ hasText: "Aluno Detalhe Um" });
    await row.getByRole("link", { name: "Ver relatório de Aluno Detalhe Um" }).click();

    await expect(page).toHaveURL(`/reports?studentId=${ids.um}`);
    await expect(page.getByRole("heading", { name: "Aluno Detalhe Um" })).toBeVisible();
    await expect(page.getByText("404")).toHaveCount(0);

    await captureScreen(page, "e2e/student-detail/evidencias/admin-detalhe-aluno.png");
  });

  test("professor abre o detalhe a partir da lista de alunos", async () => {
    const page = await newPageIn(professor1Context, DESKTOP_VIEWPORT);
    await page.goto("/students");

    await page.getByRole("link", { name: "Ver detalhes de Aluno Detalhe Um" }).click();

    await expect(page).toHaveURL(`/students?aluno=${ids.um}`);
    await expect(page.getByRole("heading", { name: "Aluno Detalhe Um" })).toBeVisible();
    await expect(page.getByText("E2E Detalhe — Aula A")).toBeVisible();
    await expect(page.getByText("E2E Detalhe — Aula B")).toBeVisible();
    await expect(page.getByText("404")).toHaveCount(0);

    await captureScreen(page, "e2e/student-detail/evidencias/professor-detalhe-aluno.png");
  });

  test("escopo: professor não acessa a ficha de aluno de outro professor, nem por link direto (PII)", async () => {
    const page = await newPageIn(professor1Context, DESKTOP_VIEWPORT);
    await page.goto(`/students?aluno=${ids.dois}`);

    // Aluno Detalhe Dois é aluno do outro teacher — pra este teacher o aluno
    // "não existe", ponto final.
    await expect(page.getByText("Aluno não encontrado.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Aluno Detalhe Dois" })).toHaveCount(0);
    await expect(page.getByText("Aluno Detalhe Dois")).toHaveCount(0);
    await expect(page.getByText("Responsável do Aluno Detalhe Dois")).toHaveCount(0);
    await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
    await expect(page.getByText("E2E Detalhe — Aula C")).toHaveCount(0);

    await captureScreen(page, "e2e/student-detail/evidencias/escopo-professor.png");

    await page.getByRole("link", { name: "Voltar para Alunos" }).click();
    await expect(page).toHaveURL("/students");
    await expect(page.getByRole("heading", { name: "Meus alunos" })).toBeVisible();
  });

  test("professor vê a ficha completa do próprio aluno, com PII do responsável", async () => {
    const page = await newPageIn(professor1Context, DESKTOP_VIEWPORT);
    await page.goto(`/students?aluno=${ids.um}`);

    await expect(page.getByRole("heading", { name: "Aluno Detalhe Um" })).toBeVisible();
    await expect(page.getByText("Aluno não encontrado.")).toHaveCount(0);
    await expect(page.getByText("Responsável do Aluno Detalhe Um")).toBeVisible();
    await expect(page.locator('a[href^="tel:"]')).toBeVisible();
    await expect(page.getByText("E2E Detalhe — Aula A")).toBeVisible();
    await expect(page.getByText("E2E Detalhe — Aula B")).toBeVisible();

    await captureScreen(page, "e2e/student-detail/evidencias/aluno-proprio-professor.png");
  });

  test("aluno sem aula matriculada mostra estado vazio", async () => {
    const page = await newPageIn(adminContext, DESKTOP_VIEWPORT);
    await page.goto(`/reports?studentId=${ids.semAula}`);

    await expect(page.getByRole("heading", { name: "Aluno Detalhe Sem Aula" })).toBeVisible();
    await expect(page.getByText("Sem aulas matriculadas.")).toBeVisible();
    await expect(page.getByText("—", { exact: true })).toHaveCount(2);

    await captureScreen(page, "e2e/student-detail/evidencias/aluno-sem-aula.png");
  });

  test("aluno inativo mostra badge INATIVO e aviso", async () => {
    const page = await newPageIn(adminContext, DESKTOP_VIEWPORT);
    await page.goto(`/reports?studentId=${ids.inativo}`);

    await expect(page.getByRole("heading", { name: "Aluno Detalhe Inativo" })).toBeVisible();
    await expect(page.getByText("INATIVO", { exact: true })).toBeVisible();
    await expect(
      page.getByText(
        "Aluno inativo — os dados abaixo estão congelados e não recebem novas chamadas.",
      ),
    ).toBeVisible();

    await captureScreen(page, "e2e/student-detail/evidencias/aluno-inativo.png");
  });

  test("aluno inexistente mostra estado de erro com botão de voltar funcional", async () => {
    const page = await newPageIn(adminContext, DESKTOP_VIEWPORT);
    await page.goto(`/reports?studentId=${NONEXISTENT_STUDENT_ID}`);

    await expect(page.getByText("Aluno não encontrado.")).toBeVisible();
    await expect(page.getByText("404")).toHaveCount(0);

    await captureScreen(page, "e2e/student-detail/evidencias/aluno-nao-encontrado.png");

    await page.getByRole("link", { name: "Voltar para Relatórios" }).click();
    await expect(page).toHaveURL("/reports");
    await expect(page.getByRole("heading", { name: "Relatórios", exact: true })).toBeVisible();
  });

  test("abas Presença e Notas trocam o conteúdo", async () => {
    const page = await newPageIn(adminContext, DESKTOP_VIEWPORT);
    await page.goto(`/reports?studentId=${ids.um}`);

    await expect(page.getByRole("heading", { name: "Resumo de presença" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Desempenho acadêmico" })).toHaveCount(0);
    await captureScreen(page, "e2e/student-detail/evidencias/aba-presenca.png");

    await page.getByRole("tab", { name: "Notas" }).click();
    await expect(page.getByRole("heading", { name: "Desempenho acadêmico" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Resumo de presença" })).toHaveCount(0);
    await captureScreen(page, "e2e/student-detail/evidencias/aba-notas.png");
  });
});

test.describe("detalhe do aluno (mobile 375px)", () => {
  test("professor visualiza o detalhe do aluno com abas usáveis", async () => {
    const page = await newPageIn(professor1Context, MOBILE_VIEWPORT);
    await page.goto(`/students?aluno=${ids.um}`);

    await expect(page.getByRole("heading", { name: "Aluno Detalhe Um" })).toBeVisible();
    await semOverflowHorizontal(page);

    await page.getByRole("tab", { name: "Notas" }).click();
    await expect(page.getByRole("heading", { name: "Desempenho acadêmico" })).toBeVisible();
    await semOverflowHorizontal(page);

    await page.getByRole("tab", { name: "Presença" }).click();
    await expect(page.getByRole("heading", { name: "Resumo de presença" })).toBeVisible();

    await captureScreen(page, "e2e/student-detail/evidencias/mobile-detalhe-aluno.png");
  });
});
