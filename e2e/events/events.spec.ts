import { expect, test, type BrowserContext } from "@playwright/test";
import { newPageIn, signInContext, captureScreen } from "../helpers";
import { ACCOUNTS } from "../seed-api";

const MOBILE_VIEWPORT = { width: 375, height: 812 };

let professor1Context: BrowserContext;
let professor2Context: BrowserContext;
let coordinatorContext: BrowserContext;

test.beforeAll(async ({ browser }) => {
  professor1Context = await signInContext(browser, ACCOUNTS.eventsTeacher1);
  professor2Context = await signInContext(browser, ACCOUNTS.eventsTeacher2);
  coordinatorContext = await signInContext(browser, ACCOUNTS.eventsCoordinator);
});

test("scope: a teacher does not see another teacher's events", async () => {
  const page = await newPageIn(professor2Context);
  await page.goto("/events");

  await expect(page.getByRole("heading", { name: "Eventos" })).toBeVisible();
  await expect(page.getByText("Passeio ao Zoológico")).toHaveCount(0);
  await expect(page.getByText("Visita ao Planetário")).toHaveCount(0);
  await expect(page.getByText("Nenhum evento cadastrado ainda.")).toBeVisible();

  await captureScreen(page, "e2e/events/evidence/teacher-scope.png");
});

test("coordinator creates an event for a group", async () => {
  const page = await newPageIn(coordinatorContext);
  await page.goto("/events");

  await page.getByRole("button", { name: "Novo evento" }).click();
  await expect(page.getByRole("heading", { name: "Novo evento" })).toBeVisible();

  await page.getByLabel("Aula").click();
  await page.getByRole("option", { name: "E2E Eventos — Aula B" }).click();
  await page.getByLabel("Título").fill("Feira de Ciências");
  await page.getByLabel("Data").fill("2026-09-10");
  await page.getByLabel("Local").fill("Ginásio da ONG");
  await page.getByLabel("Valor por aluno (R$)").fill("15");
  await page.getByRole("button", { name: "Salvar" }).click();

  await expect(page.getByRole("heading", { name: "Novo evento" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "E2E Eventos — Aula B" })).toBeVisible();
  const card = page.getByRole("button").filter({ hasText: "Feira de Ciências" });
  await expect(card).toBeVisible();
  await expect(card).toContainText("R$ 15,00");
  await expect(card).toContainText("10/09/2026");

  await captureScreen(page, "e2e/events/evidence/event-created.png");
});

test("teacher records a student's authorization and payment", async () => {
  const page = await newPageIn(professor1Context);
  await page.goto("/events");

  await page.getByRole("button").filter({ hasText: "Passeio ao Zoológico" }).click();
  await expect(page.getByRole("heading", { name: "Passeio ao Zoológico" })).toBeVisible();

  const item = page.getByRole("listitem").filter({ hasText: "Benjamin Harrison" });
  const authorization = item.getByLabel("Autorização de Benjamin Harrison");
  const payment = item.getByLabel("Pagamento de Benjamin Harrison");
  await expect(authorization).toHaveValue("pending");
  await expect(payment).toHaveValue("pending");

  const statAutorizados = page.getByText("Autorizados", { exact: true }).locator("..").locator("p.text-2xl");
  const statPagos = page.getByText("Pagos", { exact: true }).locator("..").locator("p.text-2xl");
  const statArrecadado = page.getByText("Arrecadado", { exact: true }).locator("..").locator("p.text-2xl");

  const autorizadosAntes = Number(await statAutorizados.textContent());
  const pagosAntes = Number(await statPagos.textContent());
  const arrecadadoAntes = (await statArrecadado.textContent())!;

  await authorization.selectOption("authorized");
  await expect(authorization).toHaveValue("authorized");
  await expect(statAutorizados).toHaveText(String(autorizadosAntes + 1));

  await captureScreen(page, "e2e/events/evidence/authorization-recorded.png");

  await payment.selectOption("paid");
  await expect(payment).toHaveValue("paid");
  await expect(statPagos).toHaveText(String(pagosAntes + 1));
  await expect(statArrecadado).not.toHaveText(arrecadadoAntes);
  await expect(statArrecadado).toContainText("R$");

  await captureScreen(page, "e2e/events/evidence/payment-recorded.png");
});

test("the WhatsApp button prepares the filled-in notice without opening WhatsApp", async () => {
  const page = await newPageIn(professor1Context);
  await page.goto("/events");
  await page.getByRole("button").filter({ hasText: "Passeio ao Zoológico" }).click();

  const item = page.getByRole("listitem").filter({ hasText: "Marcus Thorne" });
  const link = item.getByRole("link", { name: "WhatsApp" });
  await expect(link).toBeVisible();

  const href = await link.getAttribute("href");
  expect(href).toMatch(/^https:\/\/wa\.me\/55\d+\?text=/);
  const text = decodeURIComponent(href!.split("?text=")[1]);
  expect(text).toContain("Passeio ao Zoológico");
  expect(text).toContain("Marcus Thorne");
  await expect(link).toHaveAttribute("target", "_blank");

  await captureScreen(page, "e2e/events/evidence/whatsapp-notice.png");
});

test("a free event shows no payment column and no payment counters", async () => {
  const page = await newPageIn(professor1Context);
  await page.goto("/events");
  await page.getByRole("button").filter({ hasText: "Visita ao Planetário" }).click();

  await expect(page.getByRole("heading", { name: "Visita ao Planetário" })).toBeVisible();
  await expect(page.getByText("Gratuito")).toBeVisible();
  await expect(page.getByLabel(/^Pagamento de /)).toHaveCount(0);
  await expect(page.getByText("Pagos", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Arrecadado")).toHaveCount(0);
  await expect(page.getByText("Total de alunos")).toBeVisible();

  await captureScreen(page, "e2e/events/evidence/free-event.png");
});

test.describe("event detail (mobile 375px)", () => {
  test("teacher can mark authorization and payment on a phone", async () => {
    const page = await newPageIn(professor1Context, MOBILE_VIEWPORT);
    await page.goto("/events");

    await page.getByRole("button").filter({ hasText: "Passeio ao Zoológico" }).click();
    await expect(page.getByRole("heading", { name: "Passeio ao Zoológico" })).toBeVisible();

    // Regressão: numa tabela larga esses controles ficam fora da viewport de 375px
    // e só aparecem com rolagem lateral — o teacher não alcança em sala.
    const primeiroItem = page
      .getByRole("listitem")
      .filter({ has: page.getByLabel(/^Autorização de /) })
      .first();
    const payment = primeiroItem.getByLabel(/^Pagamento de /);
    const whatsapp = primeiroItem.getByRole("link", { name: "WhatsApp" });
    await expect(payment).toBeVisible();
    await expect(whatsapp).toBeVisible();
    await payment.scrollIntoViewIfNeeded();
    await whatsapp.scrollIntoViewIfNeeded();
    const caixaPagamento = await payment.boundingBox();
    const caixaWhatsapp = await whatsapp.boundingBox();
    expect(caixaPagamento!.x).toBeGreaterThanOrEqual(0);
    expect(caixaPagamento!.x + caixaPagamento!.width).toBeLessThanOrEqual(MOBILE_VIEWPORT.width);
    expect(caixaWhatsapp!.x).toBeGreaterThanOrEqual(0);
    expect(caixaWhatsapp!.x + caixaWhatsapp!.width).toBeLessThanOrEqual(MOBILE_VIEWPORT.width);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    await captureScreen(page, "e2e/events/evidence/mobile-event.png");
  });
});
