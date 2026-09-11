import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../test/msw/server";
import { resetApiClient } from "@/shared/lib/api/instance";
import { fetchAttendanceRecordsBySession, saveRollCall } from "./api";

const API_URL = "http://api.test";
const SESSION_ID = "session-1";

const record = {
  id: "record-1",
  sessionId: SESSION_ID,
  studentId: "student-1",
  status: "present",
};

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", API_URL);
  resetApiClient();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("the roll call against the API", () => {
  it("reads a sheet from the session it belongs to", async () => {
    let path = "";
    server.use(
      http.get(`*/attendance-sessions/${SESSION_ID}/records`, ({ request }) => {
        path = new URL(request.url).pathname;
        return HttpResponse.json([record]);
      }),
    );

    await expect(fetchAttendanceRecordsBySession(SESSION_ID)).resolves.toEqual([record]);
    expect(path).toBe(`/attendance-sessions/${SESSION_ID}/records`);
  });

  it("sends the sheet keyed `entries`, which is the name the API reads", async () => {
    let received: unknown = null;
    let method = "";
    server.use(
      http.put(`*/attendance-sessions/${SESSION_ID}/records`, async ({ request }) => {
        method = request.method;
        received = await request.json();
        return HttpResponse.json([record]);
      }),
    );

    await saveRollCall({
      sessionId: SESSION_ID,
      entries: [
        { studentId: "student-1", status: "present" },
        { studentId: "student-2", status: "absent" },
      ],
    });

    expect(method).toBe("PUT");
    expect(received).toEqual({
      entries: [
        { studentId: "student-1", status: "present" },
        { studentId: "student-2", status: "absent" },
      ],
    });
    expect(received).not.toHaveProperty("records");
  });

  it("saves the whole sheet in one request, never one student at a time", async () => {
    let calls = 0;
    server.use(
      http.put(`*/attendance-sessions/${SESSION_ID}/records`, () => {
        calls += 1;
        return HttpResponse.json([record]);
      }),
    );

    await saveRollCall({
      sessionId: SESSION_ID,
      entries: [
        { studentId: "student-1", status: "present" },
        { studentId: "student-2", status: "late" },
        { studentId: "student-3", status: "excused" },
      ],
    });

    expect(calls).toBe(1);
  });
});
