import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { server } from "../../test/msw/server";
import { resetApiClient } from "@/shared/lib/api/instance";
import { renderHookWithQuery } from "@/test/react-query";
import { useStudentsByGroup } from "./queries";

const API_URL = "http://api.test";

const enrolledStudent = {
  id: "student-enrolled",
  name: "Aluno Matriculado",
  birthDate: "2013-01-01",
  guardianName: "Responsável",
  guardianPhone: "(11) 90000-0000",
  active: true,
};

const otherStudent = {
  id: "student-other-group",
  name: "Aluno de Outra Aula",
  birthDate: "2013-02-02",
  guardianName: "Responsável",
  guardianPhone: "(11) 90000-0001",
  active: true,
};

const enrollment = {
  id: "enrollment-1",
  studentId: enrolledStudent.id,
  groupId: "turma-mat-b",
  joinedAt: "2026-07-05",
  active: true,
};

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", API_URL);
  resetApiClient();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("useStudentsByGroup (integration)", () => {
  it("returns only students enrolled in the requested aula", async () => {
    server.use(
      http.get("*/students", () => HttpResponse.json([enrolledStudent, otherStudent])),
      http.get("*/enrollments", () => HttpResponse.json([enrollment])),
    );

    const { result } = renderHookWithQuery(() => useStudentsByGroup("turma-mat-b"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([enrolledStudent]);
  });
});
