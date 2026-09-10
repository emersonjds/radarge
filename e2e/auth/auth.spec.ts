import { expect, test, type Page } from "@playwright/test";
import { login, sidebar } from "../helpers";

const MOBILE_VIEWPORT = { width: 375, height: 812 };

async function openMenu(page: Page) {
  await page.getByRole("button", { name: "Alternar menu" }).click();
}

test.use({ viewport: MOBILE_VIEWPORT });

test.describe("login", () => {
  test("tela de login mostra seletor de cargo, sem campo de senha, e entra como Professor", async ({
    page,
  }) => {
    await page.goto("/login");

    const select = page.getByLabel("Entrar como");
    await expect(select).toBeVisible();
    await expect(page.getByRole("option", { name: "Administrador" })).toHaveCount(1);
    await expect(page.getByRole("option", { name: "Professor" })).toHaveCount(1);
    await expect(page.getByRole("option", { name: "Coordenador" })).toHaveCount(1);
    await expect(page.getByLabel("Senha")).toHaveCount(0);

    await select.selectOption({ label: "Professor" });
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByText("Meus alunos")).toBeVisible();

    await page.screenshot({ path: "e2e/auth/evidencias/login-professor.png", fullPage: true });
  });
});

test.describe("visão por papel", () => {
  test("professor vê apenas Chamada e Alunos, home mostra lista de alunos", async ({ page }) => {
    await login(page, "Professor");

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

  test("admin vê Painel, Alunos, Relatórios e Perfis, e abre /users", async ({ page }) => {
    await login(page, "Administrador");

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

  test("coordenador vê Painel, Alunos, Relatórios sem Perfis, e deep link /users volta pra home", async ({
    page,
  }) => {
    await login(page, "Coordenador");

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
  test("sem sessão, /students redireciona pra /login", async ({ page }) => {
    await page.goto("/students");
    await expect(page).toHaveURL("/login");

    await page.screenshot({ path: "e2e/auth/evidencias/guard-sem-sessao.png", fullPage: true });
  });

  test("sem sessão, / redireciona pra /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/login");
  });

  test("professor não acessa /reports (redireciona pra home)", async ({ page }) => {
    await login(page, "Professor");
    await page.goto("/reports");
    await expect(page).toHaveURL("/");
    await expect(page.getByText("Meus alunos")).toBeVisible();
  });

  test("coordenador não acessa /attendance (redireciona pra home)", async ({ page }) => {
    await login(page, "Coordenador");
    await page.goto("/attendance");
    await expect(page).toHaveURL("/");
  });
});

test.describe("gestão de perfis (admin)", () => {
  test("admin cria perfil de professor", async ({ page }) => {
    await login(page, "Administrador");
    await page.goto("/users");

    await page.getByLabel("Nome").fill("Perfil de Teste");
    await page.getByLabel("Login de usuário").fill("teste");
    await page.getByLabel("Papel").click();
    await page.getByRole("option", { name: "Professor" }).click();
    await page.getByLabel("Senha").fill("teste123");
    await page.getByRole("button", { name: "Criar perfil" }).click();

    const item = page.getByRole("listitem").filter({ hasText: "Perfil de Teste" });
    await expect(item).toBeVisible();
    await expect(item.getByText("Ativo")).toBeVisible();

    const editar = item.getByRole("button", { name: "Editar Perfil de Teste" });
    const alvo = await editar.boundingBox();
    expect(alvo?.width).toBeGreaterThanOrEqual(44);
    expect(alvo?.height).toBeGreaterThanOrEqual(44);

    await page.screenshot({ path: "e2e/auth/evidencias/perfil-criado.png", fullPage: true });
  });

  test("admin edita o papel de um perfil e o badge muda", async ({ page }) => {
    await login(page, "Administrador");
    await page.goto("/users");

    const item = page.getByRole("listitem").filter({ hasText: "Ricardo Alves" });
    await expect(item.getByText("Professor")).toBeVisible();
    await item.getByRole("button", { name: "Editar Ricardo Alves" }).click();

    const modal = page.locator("form").filter({ hasText: "Editar perfil" });
    await modal.getByLabel("Papel").click();
    await page.getByRole("option", { name: "Administrador" }).click();
    await modal.getByRole("button", { name: "Salvar" }).click();

    await expect(item.getByText("Administrador")).toBeVisible();

    await page.screenshot({ path: "e2e/auth/evidencias/perfil-editado.png", fullPage: true });
  });

  test("admin desativa um perfil e o cargo fica sem perfil ativo pro login", async ({ page }) => {
    await login(page, "Administrador");
    await page.goto("/users");

    const item = page.getByRole("listitem").filter({ hasText: "Carla Dias" });
    await expect(item.getByText("Ativo")).toBeVisible();

    await item.getByRole("button", { name: "Desativar" }).click();
    await expect(item.getByText("Inativo")).toBeVisible();

    await page.screenshot({ path: "e2e/auth/evidencias/perfil-desativado.png", fullPage: true });

    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL("/login");
    await page.getByLabel("Entrar como").selectOption({ label: "Coordenador" });
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(
      page.getByRole("alert").filter({ hasText: "Nenhum perfil ativo para esse cargo." }),
    ).toBeVisible();
  });

  test("perfil desativado pode ser reativado e excluído", async ({ page }) => {
    await login(page, "Administrador");
    await page.goto("/users");

    const item = page.getByRole("listitem").filter({ hasText: "Carla Dias" });

    await item.getByRole("button", { name: "Desativar Carla Dias" }).click();
    await expect(item.getByText("Inativo")).toBeVisible();

    await item.getByRole("button", { name: "Ativar Carla Dias" }).click();
    await expect(item.getByText("Ativo")).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await item.getByRole("button", { name: "Excluir Carla Dias" }).click();
    await expect(page.getByText("Carla Dias")).toHaveCount(0);
  });

  test("o próprio admin não expõe ativar nem excluir, e a linha é marcada", async ({ page }) => {
    await login(page, "Administrador");
    await page.goto("/users");

    const eu = page.getByRole("listitem").filter({ hasText: "Ana Vance" });
    await expect(eu.getByText("Você")).toBeVisible();
    await expect(eu.getByRole("button", { name: "Editar Ana Vance" })).toBeVisible();
    await expect(eu.getByRole("button", { name: /(Des)?[Aa]tivar Ana Vance/ })).toHaveCount(0);
    await expect(eu.getByRole("button", { name: "Excluir Ana Vance" })).toHaveCount(0);
  });

  test("excluir professor regente avisa que as aulas ficam sem professor", async ({ page }) => {
    await login(page, "Administrador");
    await page.goto("/users");

    let aviso = "";
    page.once("dialog", (dialog) => {
      aviso = dialog.message();
      return dialog.dismiss();
    });
    const ricardo = page.getByRole("listitem").filter({ hasText: "Ricardo Alves" });
    await ricardo.getByRole("button", { name: "Excluir Ricardo Alves" }).click();

    expect(aviso).toContain("regente de 2 aulas");
    expect(aviso).toContain("ficarão sem professor");
    await expect(page.getByText("Ricardo Alves")).toBeVisible();
  });
});
