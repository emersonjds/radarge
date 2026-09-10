import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../test/msw/server";
import { ApiError } from "@/shared/lib/api/errors";
import { resetApiClient } from "@/shared/lib/api/instance";
import { createGroup, deleteGroup, fetchGroupById, fetchGroups, updateGroup } from "./api";

const API_URL = "http://api.test";

const group = {
  id: "group-1",
  name: "Redação I",
  shift: "afternoon",
  teacherId: "profile-1",
};

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", API_URL);
  resetApiClient();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("groups against the API", () => {
  it("lists what the API returns, untouched", async () => {
    server.use(http.get("*/groups", () => HttpResponse.json([group])));

    await expect(fetchGroups()).resolves.toEqual([group]);
  });

  it("answers null for a group that is gone, instead of throwing", async () => {
    server.use(
      http.get("*/groups/missing", () =>
        HttpResponse.json({ code: "not_found", message: "group not found" }, { status: 404 }),
      ),
    );

    await expect(fetchGroupById("missing")).resolves.toBeNull();
  });

  it("still throws when the failure is not a missing group", async () => {
    server.use(
      http.get("*/groups/blocked", () =>
        HttpResponse.json({ code: "forbidden", message: "not allowed" }, { status: 403 }),
      ),
    );

    await expect(fetchGroupById("blocked")).rejects.toBeInstanceOf(ApiError);
  });

  it("sends the new group as the contract describes it", async () => {
    let received: unknown = null;
    server.use(
      http.post("*/groups", async ({ request }) => {
        received = await request.json();
        return HttpResponse.json(group, { status: 201 });
      }),
    );

    await createGroup({ name: "Redação I", shift: "afternoon", teacherId: "profile-1" });

    expect(received).toEqual({ name: "Redação I", shift: "afternoon", teacherId: "profile-1" });
  });

  it("patches only what changed", async () => {
    let received: unknown = null;
    server.use(
      http.patch("*/groups/group-1", async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ ...group, teacherId: "profile-2" });
      }),
    );

    await updateGroup("group-1", { teacherId: "profile-2" });

    expect(received).toEqual({ teacherId: "profile-2" });
  });

  it("surfaces a group in use as the API's own conflict code", async () => {
    server.use(
      http.delete("*/groups/group-1", () =>
        HttpResponse.json({ code: "conflict", message: "group has enrollments" }, { status: 409 }),
      ),
    );

    await expect(deleteGroup("group-1")).rejects.toMatchObject({ code: "conflict" });
  });

  it("treats the 204 on delete as success, not as an empty body failure", async () => {
    server.use(http.delete("*/groups/group-1", () => new HttpResponse(null, { status: 204 })));

    await expect(deleteGroup("group-1")).resolves.toBeUndefined();
  });
});
