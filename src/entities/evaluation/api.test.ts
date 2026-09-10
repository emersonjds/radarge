import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../test/msw/server";
import { resetApiClient } from "@/shared/lib/api/instance";
import {
  createEvaluation,
  deleteEvaluation,
  fetchEvaluations,
  fetchEvaluationsByAssignment,
  updateEvaluation,
} from "./api";

const API_URL = "http://api.test";

const evaluation = {
  id: "eval-1",
  groupId: "turma-mat-b",
  subjectId: "materia-matematica",
  name: "P1",
  type: "exam",
  date: "2026-07-01",
  weight: 3,
};

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", API_URL);
  resetApiClient();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("evaluations against the API", () => {
  it("lists what the API returns, untouched", async () => {
    server.use(http.get("*/evaluations", () => HttpResponse.json([evaluation])));

    await expect(fetchEvaluations()).resolves.toEqual([evaluation]);
  });

  it("filters by group and subject through query params, not a client-side filter", async () => {
    let receivedUrl: string | null = null;
    server.use(
      http.get("*/evaluations", ({ request }) => {
        receivedUrl = request.url;
        return HttpResponse.json([evaluation]);
      }),
    );

    await fetchEvaluationsByAssignment("turma-mat-b", "materia-matematica");

    const searchParams = new URL(receivedUrl ?? "").searchParams;
    expect(searchParams.get("groupId")).toBe("turma-mat-b");
    expect(searchParams.get("subjectId")).toBe("materia-matematica");
  });

  it("sends the new evaluation as the contract describes it", async () => {
    let received: unknown = null;
    server.use(
      http.post("*/evaluations", async ({ request }) => {
        received = await request.json();
        return HttpResponse.json(evaluation, { status: 201 });
      }),
    );

    await createEvaluation({
      groupId: "turma-mat-b",
      subjectId: "materia-matematica",
      name: "P1",
      type: "exam",
      date: "2026-07-01",
      weight: 3,
    });

    expect(received).toEqual({
      groupId: "turma-mat-b",
      subjectId: "materia-matematica",
      name: "P1",
      type: "exam",
      date: "2026-07-01",
      weight: 3,
    });
  });

  it("surfaces a duplicate (group, subject, name, date) as the API's own conflict code", async () => {
    server.use(
      http.post("*/evaluations", () =>
        HttpResponse.json({ code: "conflict", message: "already exists" }, { status: 409 }),
      ),
    );

    const failure = createEvaluation({
      groupId: "turma-mat-b",
      subjectId: "materia-matematica",
      name: "P1",
      type: "exam",
      date: "2026-07-01",
      weight: 3,
    });

    await expect(failure).rejects.toMatchObject({ code: "conflict" });
  });

  it("patches only what changed", async () => {
    let received: unknown = null;
    server.use(
      http.patch("*/evaluations/eval-1", async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ ...evaluation, name: "P1 refeita" });
      }),
    );

    await updateEvaluation("eval-1", { name: "P1 refeita" });

    expect(received).toEqual({ name: "P1 refeita" });
  });

  it("treats the 204 on delete as success, and lets the API cascade the grades", async () => {
    server.use(http.delete("*/evaluations/eval-1", () => new HttpResponse(null, { status: 204 })));

    await expect(deleteEvaluation("eval-1")).resolves.toBeUndefined();
  });
});
