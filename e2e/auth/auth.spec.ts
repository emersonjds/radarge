import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { newPageIn, signInContext, sidebar } from "../helpers";
import { ACCOUNTS } from "../seed-api";

const MOBILE_VIEWPORT = { width: 375, height: 812 };

async function openMenu(page: Page) {
  await page.getByRole("button", { name: "Alternar menu" }).click();
}

let adminContext: BrowserContext;
let professorContext: BrowserContext;
let coordinatorContext: BrowserContext;

// One sign-in per account for the whole file: every test below opens its own tab
// from these already-authenticated contexts instead of signing in again.
test.beforeAll(async ({ browser }) => {
  adminContext = await signInContext(browser, ACCOUNTS.perfisAdmin);
  professorContext = await signInContext(browser, ACCOUNTS.perfisProfessor);
  coordinatorContext = await signInContext(browser, ACCOUNTS.perfisCoordenador);
});

test.describe("visão por papel", () => {
  test("professor vê apenas Chamada e Alunos, home mostra lista de alunos", async () => {
    const page = await newPageIn(professorContext, MOBILE_VIEWPORT);
    await page.goto("/");

    await expect(page.getByText("Meus alunos")).toBeVisible();

    const nav = sidebar(page);
    await expect(nav.getByRole("link")).toHaveCount(4);
    await expect(nav.getByRole("link", { name: "Chamada", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Alunos", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Eventos", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Painel" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Relatórios" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Perfis" })).toHaveCount(0);

    await page.screenshot({ path: "e2e/auth/evidencias/professor-home.png", fullPage: true });
  });

  test("admin vê Painel, Alunos, Relatórios e Perfis, e abre /users", async () => {
    const page = await newPageIn(adminContext, MOBILE_VIEWPORT);
    await page.goto("/");

    const nav = sidebar(page);
    await expect(nav.getByRole("link")).toHaveCount(7);
    await expect(nav.getByRole("link", { name: "Painel" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Alunos", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Relatórios" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Eventos", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Perfis" })).toBeVisible();

    await page.screenshot({ path: "e2e/auth/evidencias/admin-home.png", fullPage: true });

    await openMenu(page);
    await nav.getByRole("link", { name: "Perfis" }).click();
    await expect(page).toHaveURL("/users");
    await expect(page.getByRole("heading", { name: "Perfis", exact: true })).toBeVisible();

    await page.screenshot({ path: "e2e/auth/evidencias/admin-perfis.png", fullPage: true });
  });

  test("coordenador vê Painel, Alunos, Relatórios sem Perfis, e deep link /users volta pra home", async () => {
    const page = await newPageIn(coordinatorContext, MOBILE_VIEWPORT);
    await page.goto("/");

    const nav = sidebar(page);
    await expect(nav.getByRole("link")).toHaveCount(4);
    await expect(nav.getByRole("link", { name: "Painel" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Alunos", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Relatórios" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Eventos", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Perfis" })).toHaveCount(0);

    await page.screenshot({ path: "e2e/auth/evidencias/coordenador-home.png", fullPage: true });

    await page.goto("/users");
    await expect(page).toHaveURL("/");
  });
});

test.describe("guard de auth", () => {
  test("sem sessão, /students redireciona pra /login", async ({ browser }) => {
    const context = await browser.newContext({ viewport: MOBILE_VIEWPORT });
    const page = await context.newPage();
    await page.goto("/students");
    await expect(page).toHaveURL("/login");

    await page.screenshot({ path: "e2e/auth/evidencias/guard-sem-sessao.png", fullPage: true });
  });

  test("sem sessão, / redireciona pra /login", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/");
    await expect(page).toHaveURL("/login");
  });

  test("professor não acessa /reports (redireciona pra home)", async () => {
    const page = await newPageIn(professorContext);
    await page.goto("/reports");
    await expect(page).toHaveURL("/");
    await expect(page.getByText("Meus alunos")).toBeVisible();
  });

  test("coordenador não acessa /attendance (redireciona pra home)", async () => {
    const page = await newPageIn(coordinatorContext);
    await page.goto("/attendance");
    await expect(page).toHaveURL("/");
  });
});

test.describe("gestão de perfis (admin)", () => {
  test("admin cria perfil de professor", async () => {
    const page = await newPageIn(adminContext, MOBILE_VIEWPORT);
    await page.goto("/users");

    const username = `perfil.teste.${Date.now()}`;
    await page.getByLabel("Nome").fill("Perfil de Teste");
    await page.getByLabel("Login de usuário").fill(username);
    await page.getByLabel("Papel", { exact: true }).click();
    await page.getByRole("option", { name: "Professor" }).click();
    await page.getByLabel("Senha").fill("teste1234");
    await page.getByRole("button", { name: "Criar perfil" }).click();

    // Scoped by username, not the display name: a rerun that could not clean up an
    // earlier profile (delete is exercised by another test in this suite) would
    // otherwise leave two rows named "Perfil de Teste" and break strict mode here.
    const item = page.getByRole("listitem").filter({ hasText: username });
    await expect(item).toBeVisible();
    await expect(item.getByText("Ativo", { exact: true })).toBeVisible();

    // Mobile touch target: this button must be reachable with a thumb, not a cursor.
    const editar = item.getByRole("button", { name: "Editar Perfil de Teste" });
    const alvo = await editar.boundingBox();
    expect(alvo?.width).toBeGreaterThanOrEqual(44);
    expect(alvo?.height).toBeGreaterThanOrEqual(44);

    await page.screenshot({ path: "e2e/auth/evidencias/perfil-criado.png", fullPage: true });
  });

  test("admin edita o papel de um perfil e o badge muda", async () => {
    const page = await newPageIn(adminContext);
    await page.goto("/users");

    // Perfil descartável criado aqui mesmo: editar o professor fixo do arquivo
    // mudaria o regente das aulas usadas pelo resto desta suíte.
    const username = `perfil.papel.${Date.now()}`;
    await page.getByLabel("Nome").fill("Perfil Papel E2E");
    await page.getByLabel("Login de usuário").fill(username);
    await page.getByLabel("Papel", { exact: true }).click();
    await page.getByRole("option", { name: "Professor" }).click();
    await page.getByLabel("Senha").fill("teste1234");
    await page.getByRole("button", { name: "Criar perfil" }).click();

    // Scoped by username: delete is exercised by another test in this suite, so a
    // rerun that could not clean up an earlier "Perfil Papel E2E" would otherwise
    // leave two rows with the same display name and break strict mode here.
    const item = page.getByRole("listitem").filter({ hasText: username });
    await expect(item.getByText("Professor")).toBeVisible();
    await item.getByRole("button", { name: "Editar Perfil Papel E2E" }).click();

    const modal = page.locator("form").filter({ hasText: "Editar perfil" });
    await modal.getByLabel("Papel", { exact: true }).click();
    await page.getByRole("option", { name: "Administrador" }).click();
    await modal.getByRole("button", { name: "Salvar" }).click();

    await expect(item.getByText("Administrador")).toBeVisible();

    await page.screenshot({ path: "e2e/auth/evidencias/perfil-editado.png", fullPage: true });
  });

  test("admin desativa um perfil e a conta não consegue mais entrar", async ({ browser }) => {
    const page = await newPageIn(adminContext);
    await page.goto("/users");

    const username = `perfil.inativo.${Date.now()}`;
    const password = "teste1234";
    await page.getByLabel("Nome").fill("Perfil Inativo E2E");
    await page.getByLabel("Login de usuário").fill(username);
    await page.getByLabel("Papel", { exact: true }).click();
    await page.getByRole("option", { name: "Professor" }).click();
    await page.getByLabel("Senha").fill(password);
    await page.getByRole("button", { name: "Criar perfil" }).click();

    const item = page.getByRole("listitem").filter({ hasText: username });
    await expect(item.getByText("Ativo", { exact: true })).toBeVisible();

    await item.getByRole("button", { name: "Desativar Perfil Inativo E2E" }).click();
    await expect(item.getByText("Inativo", { exact: true })).toBeVisible();

    await page.screenshot({ path: "e2e/auth/evidencias/perfil-desativado.png", fullPage: true });

    // A API responde 401 igual à senha errada — não existe mais "cargo sem perfil
    // ativo", existe só a conta que não entra mais. Sem sessão prévia: não conta
    // como um segundo sign-in do admin, é a conta desativada tentando entrar.
    const context = await browser.newContext();
    const loginPage = await context.newPage();
    await loginPage.goto("/login");
    await loginPage.getByLabel("Usuário").fill(username);
    await loginPage.getByLabel("Senha").fill(password);
    await loginPage.getByRole("button", { name: "Entrar" }).click();

    // Scoped to the form: Next renders its own route announcer with role="alert".
    await expect(loginPage.locator("form").getByRole("alert")).toHaveText(
      "Usuário ou senha incorretos.",
    );
    await expect(loginPage).toHaveURL(/\/login/);
  });

  test("perfil desativado pode ser reativado e excluído", async () => {
    const page = await newPageIn(adminContext);
    await page.goto("/users");

    const username = `perfil.ciclo.${Date.now()}`;
    await page.getByLabel("Nome").fill("Perfil Ciclo E2E");
    await page.getByLabel("Login de usuário").fill(username);
    await page.getByLabel("Papel", { exact: true }).click();
    await page.getByRole("option", { name: "Professor" }).click();
    await page.getByLabel("Senha").fill("teste1234");
    await page.getByRole("button", { name: "Criar perfil" }).click();

    const item = page.getByRole("listitem").filter({ hasText: username });
    await expect(item).toBeVisible();

    await item.getByRole("button", { name: "Desativar Perfil Ciclo E2E" }).click();
    await expect(item.getByText("Inativo", { exact: true })).toBeVisible();

    await item.getByRole("button", { name: "Ativar Perfil Ciclo E2E" }).click();
    await expect(item.getByText("Ativo", { exact: true })).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await item.getByRole("button", { name: "Excluir Perfil Ciclo E2E" }).click();
    await expect(page.getByText(username)).toHaveCount(0);
  });

  test("o próprio admin não expõe ativar nem excluir, e a linha é marcada", async () => {
    const page = await newPageIn(adminContext);
    await page.goto("/users");

    const eu = page.getByRole("listitem").filter({ hasText: ACCOUNTS.perfisAdmin.name });
    await expect(eu.getByText("Você")).toBeVisible();
    await expect(eu.getByRole("button", { name: `Editar ${ACCOUNTS.perfisAdmin.name}` })).toBeVisible();
    await expect(
      eu.getByRole("button", { name: new RegExp(`(Des)?[Aa]tivar ${ACCOUNTS.perfisAdmin.name}`) }),
    ).toHaveCount(0);
    await expect(eu.getByRole("button", { name: `Excluir ${ACCOUNTS.perfisAdmin.name}` })).toHaveCount(0);
  });

  test("excluir professor regente avisa que as aulas ficam sem professor", async () => {
    const page = await newPageIn(adminContext);
    await page.goto("/users");

    let aviso = "";
    page.once("dialog", (dialog) => {
      aviso = dialog.message();
      return dialog.dismiss();
    });
    const regente = page.getByRole("listitem").filter({ hasText: ACCOUNTS.perfisProfessor.name });
    await regente.getByRole("button", { name: `Excluir ${ACCOUNTS.perfisProfessor.name}` }).click();

    expect(aviso).toContain("regente de 2 aulas");
    expect(aviso).toContain("ficarão sem professor");
    await expect(page.getByText(ACCOUNTS.perfisProfessor.name)).toBeVisible();
  });
});
