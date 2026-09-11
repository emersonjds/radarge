import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../test/msw/server";
import { resetApiClient } from "@/shared/lib/api/instance";
import { fetchEvaluationGradesByEvaluation, setEvaluationGrade } from "./api";

const API_URL = "http://api.test";

const gradeRow = (studentId: string, score: number | null) => ({
  id: `eg-${studentId}`,
  evaluationId: "eval-1",
  studentId,
  score,
});

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", API_URL);
  resetApiClient();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("evaluation grades against the API", () => {
  it("lists every grade on one evaluation", async () => {
    server.use(
      http.get("*/evaluations/eval-1/grades", () => HttpResponse.json([gradeRow("aluno-1", 7.5)])),
    );

    await expect(fetchEvaluationGradesByEvaluation("eval-1")).resolves.toEqual([
      gradeRow("aluno-1", 7.5),
    ]);
  });

  it("saves the whole sheet keyed by entries, not a per-row payload", async () => {
    let received: unknown = null;
    server.use(
      http.get("*/evaluations/eval-1/grades", () => HttpResponse.json([])),
      http.put("*/evaluations/eval-1/grades", async ({ request }) => {
        received = await request.json();
        return HttpResponse.json([gradeRow("aluno-1", 9)]);
      }),
    );

    await setEvaluationGrade({ evaluationId: "eval-1", studentId: "aluno-1", score: 9 });

    expect(received).toEqual({ entries: [{ studentId: "aluno-1", score: 9 }] });
  });

  it("keeps the other students' entries when only one row changes", async () => {
    let received: unknown = null;
    server.use(
      http.get("*/evaluations/eval-1/grades", () =>
        HttpResponse.json([gradeRow("aluno-1", 7), gradeRow("aluno-2", 8)]),
      ),
      http.put("*/evaluations/eval-1/grades", async ({ request }) => {
        received = await request.json();
        return HttpResponse.json([]);
      }),
    );

    await setEvaluationGrade({ evaluationId: "eval-1", studentId: "aluno-1", score: 9 });

    expect(received).toEqual({
      entries: [
        { studentId: "aluno-2", score: 8 },
        { studentId: "aluno-1", score: 9 },
      ],
    });
  });

  it("sends a pending grade as null, not zero", async () => {
    let received: unknown = null;
    server.use(
      http.get("*/evaluations/eval-1/grades", () => HttpResponse.json([])),
      http.put("*/evaluations/eval-1/grades", async ({ request }) => {
        received = await request.json();
        return HttpResponse.json([]);
      }),
    );

    await setEvaluationGrade({ evaluationId: "eval-1", studentId: "aluno-1", score: null });

    expect(received).toEqual({ entries: [{ studentId: "aluno-1", score: null }] });
  });
});
