import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { newPageIn, signInContext, sidebar, captureScreen, captureEvidence } from "../helpers";
import { ACCOUNTS } from "../seed-api";

const MOBILE_VIEWPORT = { width: 375, height: 812 };

async function openMenu(page: Page) {
  await page.getByRole("button", { name: "Alternar menu" }).click();
}

let adminContext: BrowserContext;
let teacherContext: BrowserContext;
let coordinatorContext: BrowserContext;

// One sign-in per account for the whole file: every test below opens its own tab
// from these already-authenticated contexts instead of signing in again.
test.beforeAll(async ({ browser }) => {
  adminContext = await signInContext(browser, ACCOUNTS.profilesAdmin);
  teacherContext = await signInContext(browser, ACCOUNTS.profilesTeacher);
  coordinatorContext = await signInContext(browser, ACCOUNTS.profilesCoordinator);
});

test.describe("role-based view", () => {
  test("teacher sees only roll call and students, home shows the student list", async () => {
    const page = await newPageIn(teacherContext, MOBILE_VIEWPORT);
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

    await captureScreen(page, "e2e/auth/evidence/teacher-home.png");
  });

  test("admin sees dashboard, students, reports and profiles, and opens /users", async () => {
    const page = await newPageIn(adminContext, MOBILE_VIEWPORT);
    await page.goto("/");

    const nav = sidebar(page);
    await expect(nav.getByRole("link")).toHaveCount(7);
    await expect(nav.getByRole("link", { name: "Painel" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Alunos", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Relatórios" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Eventos", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Perfis" })).toBeVisible();

    await captureScreen(page, "e2e/auth/evidence/admin-home.png");

    await openMenu(page);
    await nav.getByRole("link", { name: "Perfis" }).click();
    await expect(page).toHaveURL("/users");
    await expect(page.getByRole("heading", { name: "Perfis", exact: true })).toBeVisible();

    await captureScreen(page, "e2e/auth/evidence/admin-profiles.png");
  });

  test("coordinator sees dashboard, students and reports but no profiles, and a /users deep link returns home", async () => {
    const page = await newPageIn(coordinatorContext, MOBILE_VIEWPORT);
    await page.goto("/");

    const nav = sidebar(page);
    await expect(nav.getByRole("link")).toHaveCount(4);
    await expect(nav.getByRole("link", { name: "Painel" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Alunos", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Relatórios" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Eventos", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Perfis" })).toHaveCount(0);

    await captureScreen(page, "e2e/auth/evidence/coordinator-home.png");

    await page.goto("/users");
    await expect(page).toHaveURL("/");
  });
});

test.describe("auth guard", () => {
  test("without a session, /students redirects to /login", async ({ browser }) => {
    const context = await browser.newContext({ viewport: MOBILE_VIEWPORT });
    const page = await context.newPage();
    await page.goto("/students");
    await expect(page).toHaveURL("/login");

    await captureScreen(page, "e2e/auth/evidence/guard-without-session.png");
  });

  test("without a session, / redirects to /login", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/");
    await expect(page).toHaveURL("/login");
  });

  test("teacher cannot reach /reports (redirects home)", async () => {
    const page = await newPageIn(teacherContext);
    await page.goto("/reports");
    await expect(page).toHaveURL("/");
    await expect(page.getByText("Meus alunos")).toBeVisible();
  });

  test("coordinator cannot reach /attendance (redirects home)", async () => {
    const page = await newPageIn(coordinatorContext);
    await page.goto("/attendance");
    await expect(page).toHaveURL("/");
  });
});

test.describe("profile management (admin)", () => {
  test("admin creates a teacher profile", async () => {
    const page = await newPageIn(adminContext, MOBILE_VIEWPORT);
    await page.goto("/users");

    const username = `perfil.teste.${Date.now()}`;
    await page.getByLabel("Nome").fill("Perfil de Teste");
    await page.getByLabel("Login de usuário").fill(username);
    await page.getByLabel("Papel", { exact: true }).click();
    await page.getByRole("option", { name: "Professor" }).click();
    await page.getByLabel("Senha").fill("teste1234");
    await page.getByRole("button", { name: "Criar perfil" }).click();

    // By username, not display name: delete is exercised elsewhere in this file, so
    // a rerun can leave two rows sharing a name.
    const item = page.getByRole("listitem").filter({ hasText: username });
    await expect(item).toBeVisible();
    await expect(item.getByText("Ativo", { exact: true })).toBeVisible();

    // Mobile touch target: this button must be reachable with a thumb, not a cursor.
    const editar = item.getByRole("button", { name: "Editar Perfil de Teste" });
    const alvo = await editar.boundingBox();
    expect(alvo?.width).toBeGreaterThanOrEqual(44);
    expect(alvo?.height).toBeGreaterThanOrEqual(44);

    await captureEvidence(item, "e2e/auth/evidence/profile-created.png");
  });

  test("admin edits a profile role and the badge changes", async () => {
    const page = await newPageIn(adminContext);
    await page.goto("/users");

    // A throwaway profile: editing the file's fixed teacher would change the
    // regente of the groups every other test here depends on.
    const username = `perfil.papel.${Date.now()}`;
    await page.getByLabel("Nome").fill("Perfil Papel E2E");
    await page.getByLabel("Login de usuário").fill(username);
    await page.getByLabel("Papel", { exact: true }).click();
    await page.getByRole("option", { name: "Professor" }).click();
    await page.getByLabel("Senha").fill("teste1234");
    await page.getByRole("button", { name: "Criar perfil" }).click();

    // By username, for the same reason as above.
    const item = page.getByRole("listitem").filter({ hasText: username });
    await expect(item.getByText("Professor")).toBeVisible();
    await item.getByRole("button", { name: "Editar Perfil Papel E2E" }).click();

    const modal = page.locator("form").filter({ hasText: "Editar perfil" });
    await modal.getByLabel("Papel", { exact: true }).click();
    await page.getByRole("option", { name: "Administrador" }).click();
    await modal.getByRole("button", { name: "Salvar" }).click();

    await expect(item.getByText("Administrador")).toBeVisible();

    await captureEvidence(item, "e2e/auth/evidence/profile-edited.png");
  });

  test("admin deactivates a profile and the account can no longer sign in", async ({ browser }) => {
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

    await captureEvidence(item, "e2e/auth/evidence/profile-deactivated.png");

    // A deactivated account answers 401, exactly like a wrong password.
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

  test("a deactivated profile can be reactivated and deleted", async () => {
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

  test("the admin's own row exposes neither activate nor delete, and is marked", async () => {
    const page = await newPageIn(adminContext);
    await page.goto("/users");

    const eu = page.getByRole("listitem").filter({ hasText: ACCOUNTS.profilesAdmin.name });
    await expect(eu.getByText("Você")).toBeVisible();
    await expect(eu.getByRole("button", { name: `Editar ${ACCOUNTS.profilesAdmin.name}` })).toBeVisible();
    await expect(
      eu.getByRole("button", { name: new RegExp(`(Des)?[Aa]tivar ${ACCOUNTS.profilesAdmin.name}`) }),
    ).toHaveCount(0);
    await expect(eu.getByRole("button", { name: `Excluir ${ACCOUNTS.profilesAdmin.name}` })).toHaveCount(0);
  });

  test("deleting a teacher warns that their groups are left without one", async () => {
    const page = await newPageIn(adminContext);
    await page.goto("/users");

    let aviso = "";
    page.once("dialog", (dialog) => {
      aviso = dialog.message();
      return dialog.dismiss();
    });
    const regente = page.getByRole("listitem").filter({ hasText: ACCOUNTS.profilesTeacher.name });
    await regente.getByRole("button", { name: `Excluir ${ACCOUNTS.profilesTeacher.name}` }).click();

    expect(aviso).toContain("regente de 2 aulas");
    expect(aviso).toContain("ficarão sem professor");
    await expect(page.getByText(ACCOUNTS.profilesTeacher.name)).toBeVisible();
  });
});
