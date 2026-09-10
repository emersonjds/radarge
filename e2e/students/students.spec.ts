import { expect, test } from "@playwright/test";
import { newPageIn, signInContext, captureScreen, captureEvidence } from "../helpers";
import { ACCOUNTS } from "../seed-api";

test("admin adds, edits and deletes a student", async ({ browser }) => {
  const context = await signInContext(browser, ACCOUNTS.studentsAdmin);
  const page = await newPageIn(context, { width: 1280, height: 800 });
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/students");

  const name = `Aluno Teste E2E ${String(Date.now())}`;
  await page.getByRole("button", { name: "Adicionar aluno" }).click();
  await expect(page.getByRole("heading", { name: "Adicionar aluno" })).toBeVisible();
  await page.getByLabel("Nome", { exact: true }).fill(name);
  await page.getByLabel("Data de nascimento").fill("2011-05-20");
  await page.getByLabel("Nome do responsável").fill("Responsável Teste");
  await page.getByLabel("Telefone do responsável").fill("(11) 91234-5678");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText(name)).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const row = page.getByRole("row").filter({ hasText: name });
  await captureEvidence(row, "e2e/students/evidence/student-created.png");

  const editedName = `${name} Editado`;
  await row.getByRole("button", { name: "Editar" }).click();
  await expect(page.getByRole("heading", { name: "Editar aluno" })).toBeVisible();
  await page.getByLabel("Nome", { exact: true }).fill(editedName);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText(editedName)).toBeVisible();

  const editedRow = page.getByRole("row").filter({ hasText: editedName });
  await editedRow.getByRole("button", { name: "Excluir" }).click();
  await expect(page.getByText(editedName)).toHaveCount(0);
  // Clicking in the rightmost column leaves the table's own overflow container
  // scrolled sideways, which frames the shot on the wrong columns.
  await page.getByRole("table").evaluate((table) => {
    for (let node = table.parentElement; node; node = node.parentElement) node.scrollLeft = 0;
  });
  await captureScreen(page, "e2e/students/evidence/student-deleted.png");
});
