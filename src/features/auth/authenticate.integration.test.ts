import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "@/shared/lib/storage/db";
import { createProfile, fetchProfiles, setProfileActive } from "@/entities/profile/api";
import { loginAsRole } from "./authenticate";

describe("profile management + auth (integration, over the store)", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("logs in by role and returns an active profile of that role", async () => {
    const admin = await loginAsRole("admin");
    expect(admin?.role).toBe("admin");
    expect(admin?.active).toBe(true);

    const teacher = await loginAsRole("teacher");
    expect(teacher?.role).toBe("teacher");

    const coordinator = await loginAsRole("coordinator");
    expect(coordinator?.role).toBe("coordinator");
  });

  it("returns null when the role has no active profile", async () => {
    const coordinators = (await fetchProfiles()).filter(
      (profile) => profile.role === "coordinator",
    );
    for (const coordinator of coordinators) {
      await setProfileActive(coordinator.id, false);
    }
    expect(await loginAsRole("coordinator")).toBeNull();
  });

  it("creates a profile that then shows up for its role", async () => {
    const criado = await createProfile({
      name: "Novo Coordenador",
      username: "NovoCoord",
      email: "novo@radarge.escola",
      role: "coordinator",
      password: "segredo123",
    });
    expect(criado.role).toBe("coordinator");
    expect(criado.username).toBe("novocoord");

    const roles = (await fetchProfiles()).map((profile) => profile.id);
    expect(roles).toContain(criado.id);
  });

  it("rejects a duplicate username", async () => {
    await expect(
      createProfile({
        name: "Outra Ana",
        username: "ana",
        email: "outra@radarge.escola",
        role: "admin",
        password: "segredo123",
      }),
    ).rejects.toThrow(/já está em uso/);
  });

  it("rejects a password shorter than the minimum", async () => {
    await expect(
      createProfile({
        name: "Senha Curta",
        username: "curto",
        email: "curto@radarge.escola",
        role: "teacher",
        password: "123",
      }),
    ).rejects.toThrow(/pelo menos 6/);
  });
});
