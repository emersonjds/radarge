import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../test/msw/server";
import { resetApiClient } from "@/shared/lib/api/instance";
import {
  createAssignment,
  deleteAssignment,
  fetchAssignments,
  fetchAssignmentsByGroup,
  fetchAssignmentsByTeacher,
  updateAssignmentTeacher,
} from "./api";

const API_URL = "http://api.test";

const assignment = {
  id: "assignment-1",
  groupId: "group-1",
  subjectId: "subject-1",
  teacherId: "profile-1",
};

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", API_URL);
  resetApiClient();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("assignments against the API", () => {
  it("lists what the API returns, untouched", async () => {
    server.use(http.get("*/assignments", () => HttpResponse.json([assignment])));

    await expect(fetchAssignments()).resolves.toEqual([assignment]);
  });

  it("filters by group through the query string, not in JavaScript", async () => {
    let receivedUrl: string | null = null;
    server.use(
      http.get("*/assignments", ({ request }) => {
        receivedUrl = request.url;
        return HttpResponse.json([assignment]);
      }),
    );

    await fetchAssignmentsByGroup("group-1");

    expect(new URL(receivedUrl ?? "").searchParams.get("groupId")).toBe("group-1");
  });

  it("filters by teacher through the query string, not in JavaScript", async () => {
    let receivedUrl: string | null = null;
    server.use(
      http.get("*/assignments", ({ request }) => {
        receivedUrl = request.url;
        return HttpResponse.json([assignment]);
      }),
    );

    await fetchAssignmentsByTeacher("profile-1");

    expect(new URL(receivedUrl ?? "").searchParams.get("teacherId")).toBe("profile-1");
  });

  it("sends the new assignment as the contract describes it", async () => {
    let received: unknown = null;
    server.use(
      http.post("*/assignments", async ({ request }) => {
        received = await request.json();
        return HttpResponse.json(assignment, { status: 201 });
      }),
    );

    await createAssignment({
      groupId: "group-1",
      subjectId: "subject-1",
      teacherId: "profile-1",
    });

    expect(received).toEqual({
      groupId: "group-1",
      subjectId: "subject-1",
      teacherId: "profile-1",
    });
  });

  it("surfaces a duplicate (group, subject) as the API's own conflict code", async () => {
    server.use(
      http.post("*/assignments", () =>
        HttpResponse.json({ code: "conflict", message: "already assigned" }, { status: 409 }),
      ),
    );

    const failure = createAssignment({
      groupId: "group-1",
      subjectId: "subject-1",
      teacherId: "profile-1",
    });

    await expect(failure).rejects.toMatchObject({ code: "conflict" });
  });

  it("hands the assignment to a different teacher through a patch", async () => {
    let received: unknown = null;
    server.use(
      http.patch("*/assignments/assignment-1", async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ ...assignment, teacherId: "profile-2" });
      }),
    );

    await updateAssignmentTeacher("assignment-1", "profile-2");

    expect(received).toEqual({ teacherId: "profile-2" });
  });

  it("treats the 204 on delete as success, not as an empty body failure", async () => {
    server.use(
      http.delete("*/assignments/assignment-1", () => new HttpResponse(null, { status: 204 })),
    );

    await expect(deleteAssignment("assignment-1")).resolves.toBeUndefined();
  });
});
