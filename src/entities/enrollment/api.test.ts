import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../test/msw/server";
import { resetApiClient } from "@/shared/lib/api/instance";
import {
  enrollStudent,
  fetchEnrollments,
  fetchEnrollmentsByGroup,
  fetchEnrollmentsByStudent,
  unenrollStudent,
} from "./api";

const API_URL = "http://api.test";

const enrollment = {
  id: "enrollment-1",
  studentId: "student-1",
  groupId: "group-1",
  joinedAt: "2026-02-01",
  active: true,
};

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", API_URL);
  resetApiClient();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("enrollments against the API", () => {
  it("lists what the API returns, untouched", async () => {
    server.use(http.get("*/enrollments", () => HttpResponse.json([enrollment])));

    await expect(fetchEnrollments()).resolves.toEqual([enrollment]);
  });

  it("filters by group through the query string, not in JavaScript", async () => {
    let receivedUrl: string | null = null;
    server.use(
      http.get("*/enrollments", ({ request }) => {
        receivedUrl = request.url;
        return HttpResponse.json([enrollment]);
      }),
    );

    await fetchEnrollmentsByGroup("group-1");

    expect(new URL(receivedUrl ?? "").searchParams.get("groupId")).toBe("group-1");
  });

  it("filters by student through the query string, not in JavaScript", async () => {
    let receivedUrl: string | null = null;
    server.use(
      http.get("*/enrollments", ({ request }) => {
        receivedUrl = request.url;
        return HttpResponse.json([enrollment]);
      }),
    );

    await fetchEnrollmentsByStudent("student-1");

    expect(new URL(receivedUrl ?? "").searchParams.get("studentId")).toBe("student-1");
  });

  it("accepts the API's 200 on enrol, not a 201", async () => {
    let received: unknown = null;
    server.use(
      http.post("*/enrollments", async ({ request }) => {
        received = await request.json();
        return HttpResponse.json(enrollment, { status: 200 });
      }),
    );

    await expect(enrollStudent({ studentId: "student-1", groupId: "group-1" })).resolves.toEqual(
      enrollment,
    );
    expect(received).toEqual({ studentId: "student-1", groupId: "group-1" });
  });

  it("withdraws with the student and group as query parameters, not a body", async () => {
    let receivedUrl: string | null = null;
    let receivedBody: string | null = null;
    server.use(
      http.delete("*/enrollments", async ({ request }) => {
        receivedUrl = request.url;
        receivedBody = await request.text();
        return HttpResponse.json({ ...enrollment, active: false });
      }),
    );

    await expect(
      unenrollStudent({ studentId: "student-1", groupId: "group-1" }),
    ).resolves.toBeUndefined();
    const searchParams = new URL(receivedUrl ?? "").searchParams;
    expect(searchParams.get("studentId")).toBe("student-1");
    expect(searchParams.get("groupId")).toBe("group-1");
    expect(receivedBody).toBe("");
  });
});
