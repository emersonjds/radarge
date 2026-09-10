import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../test/msw/server";
import { resetApiClient } from "@/shared/lib/api/instance";
import { createSubject, deleteSubject, fetchSubjects, updateSubject } from "./api";

const API_URL = "http://api.test";

const subject = {
  id: "subject-1",
  name: "Filosofia",
  area: "humanities",
};

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", API_URL);
  resetApiClient();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("subjects against the API", () => {
  it("lists what the API returns, untouched", async () => {
    server.use(http.get("*/subjects", () => HttpResponse.json([subject])));

    await expect(fetchSubjects()).resolves.toEqual([subject]);
  });

  it("sends the new subject as the contract describes it", async () => {
    let received: unknown = null;
    server.use(
      http.post("*/subjects", async ({ request }) => {
        received = await request.json();
        return HttpResponse.json(subject, { status: 201 });
      }),
    );

    await createSubject({ name: "Filosofia", area: "humanities" });

    expect(received).toEqual({ name: "Filosofia", area: "humanities" });
  });

  it("patches only what changed", async () => {
    let received: unknown = null;
    server.use(
      http.patch("*/subjects/subject-1", async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ ...subject, name: "Sociologia" });
      }),
    );

    await updateSubject("subject-1", { name: "Sociologia" });

    expect(received).toEqual({ name: "Sociologia" });
  });

  it("surfaces a subject in use as the API's own conflict code", async () => {
    server.use(
      http.delete("*/subjects/subject-1", () =>
        HttpResponse.json({ code: "conflict", message: "subject in use" }, { status: 409 }),
      ),
    );

    await expect(deleteSubject("subject-1")).rejects.toMatchObject({ code: "conflict" });
  });

  it("treats the 204 on delete as success, not as an empty body failure", async () => {
    server.use(http.delete("*/subjects/subject-1", () => new HttpResponse(null, { status: 204 })));

    await expect(deleteSubject("subject-1")).resolves.toBeUndefined();
  });
});
