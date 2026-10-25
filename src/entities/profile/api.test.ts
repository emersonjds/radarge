import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../test/msw/server";
import { ApiError } from "@/shared/lib/api/errors";
import { resetApiClient } from "@/shared/lib/api/instance";
import {
  createProfile,
  deleteProfile,
  fetchProfile,
  fetchProfiles,
  setProfileActive,
  updateProfile,
} from "./api";

const API_URL = "http://api.test";

const managed = {
  id: "profile-1",
  name: "Ana Professora",
  username: "ana",
  role: "teacher",
  email: null,
  jobTitle: null,
  active: true,
};

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", API_URL);
  resetApiClient();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("profiles against the API", () => {
  it("lists what the API returns, untouched", async () => {
    server.use(http.get("*/profiles", () => HttpResponse.json([managed])));

    await expect(fetchProfiles()).resolves.toEqual([managed]);
  });

  it("answers null for a profile that is gone, instead of throwing", async () => {
    server.use(
      http.get("*/profiles/missing", () =>
        HttpResponse.json({ code: "not_found", message: "profile not found" }, { status: 404 }),
      ),
    );

    await expect(fetchProfile("missing")).resolves.toBeNull();
  });

  it("still throws when the failure is not a missing profile", async () => {
    server.use(
      http.get("*/profiles/blocked", () =>
        HttpResponse.json({ code: "forbidden", message: "not allowed" }, { status: 403 }),
      ),
    );

    await expect(fetchProfile("blocked")).rejects.toBeInstanceOf(ApiError);
  });

  it("sends the new profile as the contract describes it, and reads back the generated password", async () => {
    let received: unknown = null;
    server.use(
      http.post("*/profiles", async ({ request }) => {
        received = await request.json();
        return HttpResponse.json(
          { ...managed, provisionalPassword: "GENERATED1234" },
          { status: 201 },
        );
      }),
    );

    const created = await createProfile({
      name: "Ana Professora",
      username: "ana",
      role: "teacher",
    });

    expect(received).toEqual({ name: "Ana Professora", username: "ana", role: "teacher" });
    expect(created.provisionalPassword).toBe("GENERATED1234");
  });

  it("surfaces a taken username as the API's own conflict code", async () => {
    server.use(
      http.post("*/profiles", () =>
        HttpResponse.json({ code: "conflict", message: "username taken" }, { status: 409 }),
      ),
    );

    const failure = createProfile({ name: "Ana", username: "ana", role: "teacher" });

    await expect(failure).rejects.toMatchObject({ code: "conflict" });
  });

  it("patches only what changed", async () => {
    let received: unknown = null;
    server.use(
      http.patch("*/profiles/profile-1", async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ ...managed, name: "Ana Maria" });
      }),
    );

    await updateProfile("profile-1", { name: "Ana Maria" });

    expect(received).toEqual({ name: "Ana Maria" });
  });

  it("asks for a password reset with a flag, never a chosen password", async () => {
    let received: unknown = null;
    server.use(
      http.patch("*/profiles/profile-1", async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ ...managed, provisionalPassword: "RESETGENERATED1" });
      }),
    );

    const updated = await updateProfile("profile-1", { resetPassword: true });

    expect(received).toEqual({ resetPassword: true });
    expect(updated.provisionalPassword).toBe("RESETGENERATED1");
  });

  it("deactivates through the same patch route, not a route of its own", async () => {
    let received: unknown = null;
    server.use(
      http.patch("*/profiles/profile-1", async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ ...managed, active: false });
      }),
    );

    await setProfileActive("profile-1", false);

    expect(received).toEqual({ active: false });
  });

  it("treats the 204 on delete as success, not as an empty body failure", async () => {
    server.use(http.delete("*/profiles/profile-1", () => new HttpResponse(null, { status: 204 })));

    await expect(deleteProfile("profile-1")).resolves.toBeUndefined();
  });
});
