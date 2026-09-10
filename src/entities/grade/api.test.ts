import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../test/msw/server";
import { resetApiClient } from "@/shared/lib/api/instance";
import { fetchGrades, fetchGradesByStudent } from "./api";

const API_URL = "http://api.test";

const average = { studentId: "aluno-1", subjectId: "materia-matematica", score: 8.2 };

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", API_URL);
  resetApiClient();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("grades against the API", () => {
  it("derives an id from the average, since the SQL aggregate carries none", async () => {
    server.use(http.get("*/grades", () => HttpResponse.json([average])));

    await expect(fetchGrades()).resolves.toEqual([
      { id: "aluno-1-materia-matematica", ...average },
    ]);
  });

  it("filters by student through a query param, not a client-side filter", async () => {
    let receivedUrl: string | null = null;
    server.use(
      http.get("*/grades", ({ request }) => {
        receivedUrl = request.url;
        return HttpResponse.json([average]);
      }),
    );

    await fetchGradesByStudent("aluno-1");

    expect(new URL(receivedUrl ?? "").searchParams.get("studentId")).toBe("aluno-1");
  });
});
