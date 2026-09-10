import { expect, test } from "@playwright/test";
import { newPageIn, signInContext } from "../helpers";
import { ACCOUNTS } from "../seed-api";

test("admin adiciona, edita e exclui um aluno", async ({ browser }) => {
  const context = await signInContext(browser, ACCOUNTS.alunosAdmin);
  const page = await newPageIn(context, { width: 1280, height: 800 });
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/students");

  const nome = `Aluno Teste E2E ${String(Date.now())}`;
  await page.getByRole("button", { name: "Adicionar aluno" }).click();
  await expect(page.getByRole("heading", { name: "Adicionar aluno" })).toBeVisible();
  await page.getByLabel("Nome", { exact: true }).fill(nome);
  await page.getByLabel("Data de nascimento").fill("2011-05-20");
  await page.getByLabel("Nome do responsável").fill("Responsável Teste");
  await page.getByLabel("Telefone do responsável").fill("(11) 91234-5678");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText(nome)).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.screenshot({ path: "e2e/students/evidencias/aluno-criado.png", fullPage: true });

  const linha = page.getByRole("row").filter({ hasText: nome });
  const nomeEditado = `${nome} Editado`;
  await linha.getByRole("button", { name: "Editar" }).click();
  await expect(page.getByRole("heading", { name: "Editar aluno" })).toBeVisible();
  await page.getByLabel("Nome", { exact: true }).fill(nomeEditado);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText(nomeEditado)).toBeVisible();

  const linhaEditada = page.getByRole("row").filter({ hasText: nomeEditado });
  await linhaEditada.getByRole("button", { name: "Excluir" }).click();
  await expect(page.getByText(nomeEditado)).toHaveCount(0);
  await page.screenshot({ path: "e2e/students/evidencias/aluno-excluido.png", fullPage: true });
});
