import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "@/shared/lib/storage/db";
import { createAssignment } from "@/entities/assignment/api";
import { createSubject, deleteSubject, fetchSubjects, updateSubject } from "./api";

describe("subject writes (over the store)", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("creates and updates a subject", async () => {
    const created = await createSubject({ name: "Filosofia", area: "humanities" });
    expect(created.id).toBeTruthy();
    await updateSubject(created.id, { name: "Sociologia" });
    const found = (await fetchSubjects()).find((s) => s.id === created.id);
    expect(found?.name).toBe("Sociologia");
  });

  it("deletes an unused subject", async () => {
    const created = await createSubject({ name: "Filosofia", area: "humanities" });
    await deleteSubject(created.id);
    expect((await fetchSubjects()).some((s) => s.id === created.id)).toBe(false);
  });

  it("refuses to delete a subject used by an assignment", async () => {
    const created = await createSubject({ name: "Filosofia", area: "humanities" });
    await createAssignment({
      groupId: "turma-mat-b",
      subjectId: created.id,
      teacherId: "perfil-ricardo",
    });
    await expect(deleteSubject(created.id)).rejects.toThrow();
  });
});
