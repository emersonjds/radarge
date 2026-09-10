import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../test/msw/server";
import { resetApiClient } from "@/shared/lib/api/instance";
import { createAttendanceSession, fetchAttendanceSessionsByGroup } from "./api";

const API_URL = "http://api.test";

const session = {
  id: "session-1",
  groupId: "group-1",
  date: "2026-09-10",
  teacherId: "teacher-1",
};

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", API_URL);
  resetApiClient();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("attendance sessions against the API", () => {
  it("opens a session without naming the teacher, which the API takes from the caller", async () => {
    let received: unknown = null;
    server.use(
      http.post("*/attendance-sessions", async ({ request }) => {
        received = await request.json();
        return HttpResponse.json(session);
      }),
    );

    await createAttendanceSession({ groupId: "group-1", date: "2026-09-10" });

    expect(received).toEqual({ groupId: "group-1", date: "2026-09-10" });
    expect(received).not.toHaveProperty("teacherId");
  });

  it("treats the 200 on open as success, since the session is unique per group and day", async () => {
    server.use(http.post("*/attendance-sessions", () => HttpResponse.json(session)));

    await expect(
      createAttendanceSession({ groupId: "group-1", date: "2026-09-10" }),
    ).resolves.toEqual(session);
  });

  it("keeps only the sessions of the group it was asked about", async () => {
    server.use(
      http.get("*/attendance-sessions", () =>
        HttpResponse.json([session, { ...session, id: "session-2", groupId: "group-2" }]),
      ),
    );

    await expect(fetchAttendanceSessionsByGroup("group-1")).resolves.toEqual([session]);
  });
});
