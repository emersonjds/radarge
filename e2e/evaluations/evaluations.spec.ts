import { expect, test, type BrowserContext } from "@playwright/test";
import { newPageIn, signInContext, sidebar, captureScreen } from "../helpers";
import { ACCOUNTS } from "../seed-api";

let teacherContext: BrowserContext;

test.beforeAll(async ({ browser }) => {
  teacherContext = await signInContext(browser, ACCOUNTS.notasProfessor);
});

test.describe("professor grades flow", () => {
  test("professor creates an evaluation and enters a grade", async () => {
    const page = await newPageIn(teacherContext);
    await page.goto("/");
    await sidebar(page).getByRole("link", { name: "Notas", exact: true }).click();

    await page.getByRole("button", { name: /—/ }).first().click();
    await expect(page.getByRole("heading", { name: "Avaliações" })).toBeVisible();

    // Unique per run: the API rejects a repeat (group, subject, name, date) as a
    // conflict, and a fixed name would silently 409 on every rerun.
    const name = `P2 ${String(Date.now())}`;
    await page.getByRole("button", { name: "Nova avaliação" }).click();
    await page.getByLabel("Nome").fill(name);
    await page.getByLabel("Data").fill("2026-07-10");
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText(name)).toBeVisible();
    await captureScreen(page, "e2e/evaluations/evidencias/avaliacao-criada.png");

    const card = page.locator("li", { hasText: name });
    await card.getByRole("button", { name: "Lançar notas" }).click();
    const firstScore = card.getByRole("spinbutton").first();
    await firstScore.fill("9.5");
    await firstScore.blur();
    await expect(firstScore).toHaveValue("9.5");
    await captureScreen(page, "e2e/evaluations/evidencias/nota-lancada.png");
  });

  test("excluir avaliação pede confirmação e cancelar preserva a avaliação", async () => {
    const page = await newPageIn(teacherContext);
    await page.goto("/");
    await sidebar(page).getByRole("link", { name: "Notas", exact: true }).click();
    await page.getByRole("button", { name: /—/ }).first().click();

    const name = `P3 ${String(Date.now())}`;
    await page.getByRole("button", { name: "Nova avaliação" }).click();
    await page.getByLabel("Nome").fill(name);
    await page.getByLabel("Data").fill("2026-07-11");
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText(name)).toBeVisible();

    const card = page.locator("li", { hasText: name });

    let aviso = "";
    page.once("dialog", (dialog) => {
      aviso = dialog.message();
      return dialog.dismiss();
    });
    await card.getByRole("button", { name: `Excluir ${name}` }).click();
    expect(aviso).toContain("As notas lançadas nela serão apagadas");
    await expect(page.getByText(name)).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await card.getByRole("button", { name: `Excluir ${name}` }).click();
    await expect(page.getByText(name)).toHaveCount(0);
  });
});
