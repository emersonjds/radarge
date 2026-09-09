import { expect, test, type Page } from "@playwright/test";
import { login } from "../helpers";

const MOBILE_VIEWPORT = { width: 375, height: 812 };

/**
 * Bruno (perfil-bruno) is the second seeded teacher — the standard `login`
 * helper always returns the first active profile of a role, so scope tests
 * that need him set the demo session directly (same storage key as `login`).
 */
async function loginAsBruno(page: Page) {
  await page.goto("/login");
  await page.evaluate(() => window.localStorage.setItem("radarge.session", "perfil-bruno"));
  await page.goto("/events");
}

test("coordenador cria um evento para uma aula", async ({ page }) => {
  await login(page, "Coordenador");
  await page.goto("/events");

  await page.getByRole("button", { name: "Novo evento" }).click();
  await expect(page.getByRole("heading", { name: "Novo evento" })).toBeVisible();

  await page.getByLabel("Aula").selectOption({ label: "Reforço de Ciências — Quarta" });
  await page.getByLabel("Título").fill("Feira de Ciências");
  await page.getByLabel("Data").fill("2026-09-10");
  await page.getByLabel("Local").fill("Ginásio da ONG");
  await page.getByLabel("Valor por aluno (R$)").fill("15");
  await page.getByRole("button", { name: "Salvar" }).click();

  await expect(page.getByRole("heading", { name: "Novo evento" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Reforço de Ciências — Quarta" })).toBeVisible();
  const cartao = page.getByRole("button").filter({ hasText: "Feira de Ciências" });
  await expect(cartao).toBeVisible();
  await expect(cartao).toContainText("R$ 15,00");
  await expect(cartao).toContainText("10/09/2026");

  await page.screenshot({ path: "e2e/events/evidencias/evento-criado.png", fullPage: true });
});

test("professor registra autorização e pagamento de um aluno", async ({ page }) => {
  await login(page, "Professor");
  await page.goto("/events");

  await page.getByRole("button").filter({ hasText: "Passeio ao Zoológico" }).click();
  await expect(page.getByRole("heading", { name: "Passeio ao Zoológico" })).toBeVisible();

  const item = page.getByRole("listitem").filter({ hasText: "Benjamin Harrison" });
  const autorizacao = item.getByLabel("Autorização de Benjamin Harrison");
  const pagamento = item.getByLabel("Pagamento de Benjamin Harrison");
  await expect(autorizacao).toHaveValue("pending");
  await expect(pagamento).toHaveValue("pending");

  const statAutorizados = page.getByText("Autorizados", { exact: true }).locator("..").locator("p.text-2xl");
  const statPagos = page.getByText("Pagos", { exact: true }).locator("..").locator("p.text-2xl");
  const statArrecadado = page.getByText("Arrecadado", { exact: true }).locator("..").locator("p.text-2xl");

  const autorizadosAntes = Number(await statAutorizados.textContent());
  const pagosAntes = Number(await statPagos.textContent());
  const arrecadadoAntes = (await statArrecadado.textContent())!;

  await autorizacao.selectOption("authorized");
  await expect(autorizacao).toHaveValue("authorized");
  await expect(statAutorizados).toHaveText(String(autorizadosAntes + 1));

  await page.screenshot({ path: "e2e/events/evidencias/autorizacao-registrada.png", fullPage: true });

  await pagamento.selectOption("paid");
  await expect(pagamento).toHaveValue("paid");
  await expect(statPagos).toHaveText(String(pagosAntes + 1));
  await expect(statArrecadado).not.toHaveText(arrecadadoAntes);
  await expect(statArrecadado).toContainText("R$");

  await page.screenshot({ path: "e2e/events/evidencias/pagamento-registrado.png", fullPage: true });
});

test("botão de WhatsApp abre a mensagem de aviso já preenchida, sem abrir o WhatsApp de verdade", async ({
  page,
}) => {
  await login(page, "Professor");
  await page.goto("/events");
  await page.getByRole("button").filter({ hasText: "Passeio ao Zoológico" }).click();

  const item = page.getByRole("listitem").filter({ hasText: "Marcus Thorne" });
  const link = item.getByRole("link", { name: "WhatsApp" });
  await expect(link).toBeVisible();

  const href = await link.getAttribute("href");
  expect(href).toMatch(/^https:\/\/wa\.me\/55\d+\?text=/);
  const texto = decodeURIComponent(href!.split("?text=")[1]);
  expect(texto).toContain("Passeio ao Zoológico");
  expect(texto).toContain("Marcus Thorne");
  await expect(link).toHaveAttribute("target", "_blank");

  await page.screenshot({ path: "e2e/events/evidencias/aviso-whatsapp.png", fullPage: true });
});

test("evento gratuito não mostra coluna nem contadores de pagamento", async ({ page }) => {
  await login(page, "Professor");
  await page.goto("/events");
  await page.getByRole("button").filter({ hasText: "Visita ao Planetário" }).click();

  await expect(page.getByRole("heading", { name: "Visita ao Planetário" })).toBeVisible();
  await expect(page.getByText("Gratuito")).toBeVisible();
  await expect(page.getByLabel(/^Pagamento de /)).toHaveCount(0);
  await expect(page.getByText("Pagos", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Arrecadado")).toHaveCount(0);
  await expect(page.getByText("Total de alunos")).toBeVisible();

  await page.screenshot({ path: "e2e/events/evidencias/evento-gratuito.png", fullPage: true });
});

test("escopo: professor de outra aula não vê os eventos de Ricardo", async ({ page }) => {
  await loginAsBruno(page);

  await expect(page.getByRole("heading", { name: "Eventos" })).toBeVisible();
  await expect(page.getByText("Passeio ao Zoológico")).toHaveCount(0);
  await expect(page.getByText("Visita ao Planetário")).toHaveCount(0);
  await expect(page.getByText("Nenhum evento cadastrado ainda.")).toBeVisible();

  await page.screenshot({ path: "e2e/events/evidencias/escopo-professor.png", fullPage: true });
});

test.describe("detalhe do evento (mobile 375px)", () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test("professor consegue marcar autorização e pagamento no celular", async ({ page }) => {
    await login(page, "Professor");
    await page.goto("/events");

    await page.getByRole("button").filter({ hasText: "Passeio ao Zoológico" }).click();
    await expect(page.getByRole("heading", { name: "Passeio ao Zoológico" })).toBeVisible();

    // Regressão: numa tabela larga esses controles ficam fora da viewport de 375px
    // e só aparecem com rolagem lateral — o professor não alcança em sala.
    const primeiroItem = page
      .getByRole("listitem")
      .filter({ has: page.getByLabel(/^Autorização de /) })
      .first();
    const pagamento = primeiroItem.getByLabel(/^Pagamento de /);
    const whatsapp = primeiroItem.getByRole("link", { name: "WhatsApp" });
    await expect(pagamento).toBeVisible();
    await expect(whatsapp).toBeVisible();
    await pagamento.scrollIntoViewIfNeeded();
    await whatsapp.scrollIntoViewIfNeeded();
    const caixaPagamento = await pagamento.boundingBox();
    const caixaWhatsapp = await whatsapp.boundingBox();
    expect(caixaPagamento!.x).toBeGreaterThanOrEqual(0);
    expect(caixaPagamento!.x + caixaPagamento!.width).toBeLessThanOrEqual(MOBILE_VIEWPORT.width);
    expect(caixaWhatsapp!.x).toBeGreaterThanOrEqual(0);
    expect(caixaWhatsapp!.x + caixaWhatsapp!.width).toBeLessThanOrEqual(MOBILE_VIEWPORT.width);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    await page.screenshot({ path: "e2e/events/evidencias/mobile-evento.png", fullPage: true });
  });
});
