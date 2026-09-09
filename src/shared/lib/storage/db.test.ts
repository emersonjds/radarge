import { beforeEach, describe, expect, it } from "vitest";
import { mutateCollection, readCollection, resetDb } from "./db";

interface Group {
  id: string;
  name: string;
}

describe("storage db", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("seeds collections on first read", async () => {
    const turmas = await readCollection<Group>("groups");
    expect(turmas.length).toBeGreaterThan(0);
  });

  it("returns detached copies (mutating the result does not touch the store)", async () => {
    const first = await readCollection<Group>("groups");
    first[0].name = "hacked";
    const second = await readCollection<Group>("groups");
    expect(second[0].name).not.toBe("hacked");
  });

  it("persists mutations", async () => {
    await mutateCollection<Group>("groups", (rows) => [
      ...rows,
      { id: "nova", name: "Nova Turma" },
    ]);
    const turmas = await readCollection<Group>("groups");
    expect(turmas.some((turma) => turma.id === "nova")).toBe(true);
  });

  it("tolerates a collection missing from a persisted blob", async () => {
    await mutateCollection("groups", (rows) => rows);
    await expect(readCollection("schoolEvents")).resolves.toBeInstanceOf(Array);
  });

  it("discards a stale radarge.db.v1 blob and reseeds", async () => {
    window.localStorage.setItem(
      "radarge.db.v1",
      JSON.stringify({ perfis: [{ id: "professor-1", name: "Carla Professora" }] }),
    );
    const turmas = await readCollection<Group>("groups");
    expect(turmas.length).toBeGreaterThan(0);
    expect(window.localStorage.getItem("radarge.db.v1")).toBeNull();
  });
});
