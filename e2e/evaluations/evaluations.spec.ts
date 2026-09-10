import { expect, test, type BrowserContext } from "@playwright/test";
import { newPageIn, signInContext, sidebar } from "../helpers";
import { ACCOUNTS } from "../seed-api";

let professorContext: BrowserContext;

test.beforeAll(async ({ browser }) => {
  professorContext = await signInContext(browser, ACCOUNTS.notasProfessor);
});

test.describe("teacher grades flow", () => {
  test("teacher creates an evaluation and enters a grade", async () => {
    const page = await newPageIn(professorContext);
    await page.goto("/");
    await sidebar(page).getByRole("link", { name: "Notas", exact: true }).click();

    await page.getByRole("button", { name: /—/ }).first().click();
    await expect(page.getByRole("heading", { name: "Avaliações" })).toBeVisible();

    // Unique per run: the API rejects a repeat (group, subject, name, date) as a
    // conflict, and a fixed name would silently 409 on every rerun.
    const nome = `P2 ${String(Date.now())}`;
    await page.getByRole("button", { name: "Nova avaliação" }).click();
    await page.getByLabel("Nome").fill(nome);
    await page.getByLabel("Data").fill("2026-07-10");
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText(nome)).toBeVisible();
    await page.screenshot({
      path: "e2e/evaluations/evidencias/avaliacao-criada.png",
      fullPage: true,
    });

    const card = page.locator("li", { hasText: nome });
    await card.getByRole("button", { name: "Lançar notas" }).click();
    const firstScore = card.getByRole("spinbutton").first();
    await firstScore.fill("9.5");
    await firstScore.blur();
    await expect(firstScore).toHaveValue("9.5");
    await page.screenshot({ path: "e2e/evaluations/evidencias/nota-lancada.png", fullPage: true });
  });

  test("excluir avaliação pede confirmação e cancelar preserva a avaliação", async () => {
    const page = await newPageIn(professorContext);
    await page.goto("/");
    await sidebar(page).getByRole("link", { name: "Notas", exact: true }).click();
    await page.getByRole("button", { name: /—/ }).first().click();

    const nome = `P3 ${String(Date.now())}`;
    await page.getByRole("button", { name: "Nova avaliação" }).click();
    await page.getByLabel("Nome").fill(nome);
    await page.getByLabel("Data").fill("2026-07-11");
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText(nome)).toBeVisible();

    const card = page.locator("li", { hasText: nome });

    let aviso = "";
    page.once("dialog", (dialog) => {
      aviso = dialog.message();
      return dialog.dismiss();
    });
    await card.getByRole("button", { name: `Excluir ${nome}` }).click();
    expect(aviso).toContain("As notas lançadas nela serão apagadas");
    await expect(page.getByText(nome)).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await card.getByRole("button", { name: `Excluir ${nome}` }).click();
    await expect(page.getByText(nome)).toHaveCount(0);
  });
});
