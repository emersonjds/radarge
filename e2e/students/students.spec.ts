import { expect, test } from "@playwright/test";
import { login } from "../helpers";

test.use({ viewport: { width: 1280, height: 800 } });

test("admin adiciona, edita e exclui um aluno", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());
  await login(page, "Administrador");
  await page.goto("/students");

  await page.getByRole("button", { name: "Adicionar aluno" }).click();
  await expect(page.getByRole("heading", { name: "Adicionar aluno" })).toBeVisible();
  await page.getByLabel("Nome", { exact: true }).fill("Aluno Teste E2E");
  await page.getByLabel("Data de nascimento").fill("2011-05-20");
  await page.getByLabel("Nome do responsável").fill("Responsável Teste");
  await page.getByLabel("Telefone do responsável").fill("(11) 91234-5678");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Aluno Teste E2E")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.screenshot({ path: "e2e/students/evidencias/aluno-criado.png", fullPage: true });

  const linha = page.getByRole("row").filter({ hasText: "Aluno Teste E2E" });
  await linha.getByRole("button", { name: "Editar" }).click();
  await expect(page.getByRole("heading", { name: "Editar aluno" })).toBeVisible();
  await page.getByLabel("Nome", { exact: true }).fill("Aluno Editado E2E");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Aluno Editado E2E")).toBeVisible();

  const linhaEditada = page.getByRole("row").filter({ hasText: "Aluno Editado E2E" });
  await linhaEditada.getByRole("button", { name: "Excluir" }).click();
  await expect(page.getByText("Aluno Editado E2E")).toHaveCount(0);
  await page.screenshot({ path: "e2e/students/evidencias/aluno-excluido.png", fullPage: true });
});
