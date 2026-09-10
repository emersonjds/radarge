import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../test/msw/server";
import { resetApiClient } from "@/shared/lib/api/instance";
import {
  fetchAbsenteeismTrend,
  fetchAcademicSummary,
  fetchAttendanceRate,
  fetchStudentsAtRisk,
} from "./api";

const API_URL = "http://api.test";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", API_URL);
  resetApiClient();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("attendance rate against the API", () => {
  it("sends only the filters the caller gave", async () => {
    let pathAndQuery = "";
    server.use(
      http.get("*/analytics/attendance-rate", ({ request }) => {
        const url = new URL(request.url);
        pathAndQuery = `${url.pathname}${url.search}`;
        return HttpResponse.json({ rate: 82, present: 41, total: 50 });
      }),
    );

    await expect(fetchAttendanceRate({ groupId: "group-1", from: "2026-01-01" })).resolves.toEqual({
      rate: 82,
      present: 41,
      total: 50,
    });
    expect(pathAndQuery).toBe("/analytics/attendance-rate?groupId=group-1&from=2026-01-01");
  });

  it("sends no query string with no filter", async () => {
    let pathAndQuery = "";
    server.use(
      http.get("*/analytics/attendance-rate", ({ request }) => {
        const url = new URL(request.url);
        pathAndQuery = `${url.pathname}${url.search}`;
        return HttpResponse.json({ rate: 0, present: 0, total: 0 });
      }),
    );

    await fetchAttendanceRate();
    expect(pathAndQuery).toBe("/analytics/attendance-rate");
  });
});

describe("absenteeism trend against the API", () => {
  it("scopes to a group and a date range", async () => {
    let pathAndQuery = "";
    server.use(
      http.get("*/analytics/absenteeism-trend", ({ request }) => {
        const url = new URL(request.url);
        pathAndQuery = `${url.pathname}${url.search}`;
        return HttpResponse.json([{ date: "2026-06-16", absenceRate: 10 }]);
      }),
    );

    await expect(fetchAbsenteeismTrend({ groupId: "group-1", to: "2026-06-30" })).resolves.toEqual([
      { date: "2026-06-16", absenceRate: 10 },
    ]);
    expect(pathAndQuery).toBe("/analytics/absenteeism-trend?groupId=group-1&to=2026-06-30");
  });
});

describe("students at risk against the API", () => {
  it("sends the threshold as a query param, not a body", async () => {
    let pathAndQuery = "";
    let method = "";
    server.use(
      http.get("*/analytics/students-at-risk", ({ request }) => {
        method = request.method;
        const url = new URL(request.url);
        pathAndQuery = `${url.pathname}${url.search}`;
        return HttpResponse.json([{ studentId: "student-1", absences: 4, attendance: 60 }]);
      }),
    );

    await expect(fetchStudentsAtRisk({ threshold: 1 })).resolves.toEqual([
      { studentId: "student-1", absences: 4, attendance: 60 },
    ]);
    expect(method).toBe("GET");
    expect(pathAndQuery).toBe("/analytics/students-at-risk?threshold=1");
  });
});

describe("academic summary against the API", () => {
  it("scopes to one student", async () => {
    let pathAndQuery = "";
    server.use(
      http.get("*/analytics/academic-summary", ({ request }) => {
        const url = new URL(request.url);
        pathAndQuery = `${url.pathname}${url.search}`;
        return HttpResponse.json({
          averageScore: 7.5,
          topArea: "exact_sciences",
          areaAffinity: [{ area: "exact_sciences", average: 8.5 }],
          topSubjects: [{ subjectId: "mat", score: 9 }],
          attentionSubjects: [{ subjectId: "geo", score: 5 }],
        });
      }),
    );

    await fetchAcademicSummary({ studentId: "student-1" });
    expect(pathAndQuery).toBe("/analytics/academic-summary?studentId=student-1");
  });
});
