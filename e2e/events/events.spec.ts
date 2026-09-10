import { expect, test, type BrowserContext } from "@playwright/test";
import { newPageIn, signInContext, captureScreen } from "../helpers";
import { ACCOUNTS } from "../seed-api";

const MOBILE_VIEWPORT = { width: 375, height: 812 };

let teacher1Context: BrowserContext;
let teacher2Context: BrowserContext;
let coordinatorContext: BrowserContext;

test.beforeAll(async ({ browser }) => {
  teacher1Context = await signInContext(browser, ACCOUNTS.eventsTeacher1);
  teacher2Context = await signInContext(browser, ACCOUNTS.eventsTeacher2);
  coordinatorContext = await signInContext(browser, ACCOUNTS.eventsCoordinator);
});

test("scope: a teacher does not see another teacher's events", async () => {
  const page = await newPageIn(teacher2Context);
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
  const page = await newPageIn(teacher1Context);
  await page.goto("/events");

  await page.getByRole("button").filter({ hasText: "Passeio ao Zoológico" }).click();
  await expect(page.getByRole("heading", { name: "Passeio ao Zoológico" })).toBeVisible();

  const item = page.getByRole("listitem").filter({ hasText: "Benjamin Harrison" });
  const authorization = item.getByLabel("Autorização de Benjamin Harrison");
  const payment = item.getByLabel("Pagamento de Benjamin Harrison");
  await expect(authorization).toHaveValue("pending");
  await expect(payment).toHaveValue("pending");

  const statAuthorized = page.getByTestId("stat-authorized");
  const statPaid = page.getByTestId("stat-paid");
  const statCollected = page.getByTestId("stat-collected");

  const authorizedBefore = Number(await statAuthorized.textContent());
  const paidBefore = Number(await statPaid.textContent());
  const collectedBefore = (await statCollected.textContent())!;

  await authorization.selectOption("authorized");
  await expect(authorization).toHaveValue("authorized");
  await expect(statAuthorized).toHaveText(String(authorizedBefore + 1));

  await captureScreen(page, "e2e/events/evidence/authorization-recorded.png");

  await payment.selectOption("paid");
  await expect(payment).toHaveValue("paid");
  await expect(statPaid).toHaveText(String(paidBefore + 1));
  await expect(statCollected).not.toHaveText(collectedBefore);
  await expect(statCollected).toContainText("R$");

  await captureScreen(page, "e2e/events/evidence/payment-recorded.png");
});

test("the WhatsApp button prepares the filled-in notice without opening WhatsApp", async () => {
  const page = await newPageIn(teacher1Context);
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
  const page = await newPageIn(teacher1Context);
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
    const page = await newPageIn(teacher1Context, MOBILE_VIEWPORT);
    await page.goto("/events");

    await page.getByRole("button").filter({ hasText: "Passeio ao Zoológico" }).click();
    await expect(page.getByRole("heading", { name: "Passeio ao Zoológico" })).toBeVisible();

    // Regression: in a wide table these controls fell outside the 375px viewport
    // e só aparecem com rolagem lateral — o teacher não alcança em sala.
    const firstItem = page
      .getByRole("listitem")
      .filter({ has: page.getByLabel(/^Autorização de /) })
      .first();
    const payment = firstItem.getByLabel(/^Pagamento de /);
    const whatsapp = firstItem.getByRole("link", { name: "WhatsApp" });
    await expect(payment).toBeVisible();
    await expect(whatsapp).toBeVisible();
    await payment.scrollIntoViewIfNeeded();
    await whatsapp.scrollIntoViewIfNeeded();
    const paymentBox = await payment.boundingBox();
    const whatsappBox = await whatsapp.boundingBox();
    expect(paymentBox!.x).toBeGreaterThanOrEqual(0);
    expect(paymentBox!.x + paymentBox!.width).toBeLessThanOrEqual(MOBILE_VIEWPORT.width);
    expect(whatsappBox!.x).toBeGreaterThanOrEqual(0);
    expect(whatsappBox!.x + whatsappBox!.width).toBeLessThanOrEqual(MOBILE_VIEWPORT.width);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    await captureScreen(page, "e2e/events/evidence/mobile-event.png");
  });
});
