import { http, HttpResponse } from "msw";
import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "@/test/msw/server";
import { renderHookWithQuery } from "@/test/react-query";
import { resetApiClient } from "@/shared/lib/api/instance";
import { useCreateAttendanceSession } from "@/entities/attendance-session/queries";
import { useSaveRollCall } from "@/entities/attendance-record/queries";

const API_URL = "http://api.test";
const SESSION_ID = "session-1";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", API_URL);
  resetApiClient();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("saving a roll call", () => {
  it("opens the session, then saves every mark in a single request", async () => {
    const openings: unknown[] = [];
    let sheet: unknown = null;
    let sheetWrites = 0;

    server.use(
      http.post("*/attendance-sessions", async ({ request }) => {
        openings.push(await request.json());
        return HttpResponse.json({
          id: SESSION_ID,
          groupId: "group-1",
          date: "2026-09-10",
          teacherId: "teacher-1",
        });
      }),
      http.put(`*/attendance-sessions/${SESSION_ID}/records`, async ({ request }) => {
        sheetWrites += 1;
        sheet = await request.json();
        return HttpResponse.json([]);
      }),
    );

    const { result: open } = renderHookWithQuery(() => useCreateAttendanceSession());
    const { result: save } = renderHookWithQuery(() => useSaveRollCall());

    await act(async () => {
      const session = await open.current.mutateAsync({ groupId: "group-1", date: "2026-09-10" });
      await save.current.mutateAsync({
        sessionId: session.id,
        entries: [
          { studentId: "student-1", status: "present" },
          { studentId: "student-2", status: "absent" },
        ],
      });
    });

    expect(openings).toEqual([{ groupId: "group-1", date: "2026-09-10" }]);
    expect(sheetWrites).toBe(1);
    expect(sheet).toEqual({
      entries: [
        { studentId: "student-1", status: "present" },
        { studentId: "student-2", status: "absent" },
      ],
    });
  });

  it("lets the API's refusal through instead of turning it into a silent success", async () => {
    server.use(
      http.post("*/attendance-sessions", () =>
        HttpResponse.json({ code: "forbidden", message: "not your group" }, { status: 403 }),
      ),
    );

    const { result: open } = renderHookWithQuery(() => useCreateAttendanceSession());

    await expect(
      act(async () => {
        await open.current.mutateAsync({ groupId: "someone-elses-group", date: "2026-09-10" });
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });
});
