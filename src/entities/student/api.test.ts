import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../test/msw/server";
import { ApiError } from "@/shared/lib/api/errors";
import { resetApiClient } from "@/shared/lib/api/instance";
import {
  createStudent,
  deleteStudent,
  fetchStudentById,
  fetchStudents,
  updateStudent,
} from "./api";

const API_URL = "http://api.test";

const student = {
  id: "student-1",
  name: "Aluno Teste",
  birthDate: "2012-05-10",
  guardianName: "Responsável Teste",
  guardianPhone: "(11) 91234-5678",
  active: true,
};

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", API_URL);
  resetApiClient();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("students against the API", () => {
  it("lists what the API returns, untouched", async () => {
    server.use(http.get("*/students", () => HttpResponse.json([student])));

    await expect(fetchStudents()).resolves.toEqual([student]);
  });

  it("answers null for a student that is gone, instead of throwing", async () => {
    server.use(
      http.get("*/students/missing", () =>
        HttpResponse.json({ code: "not_found", message: "student not found" }, { status: 404 }),
      ),
    );

    await expect(fetchStudentById("missing")).resolves.toBeNull();
  });

  it("still throws when the failure is not a missing student", async () => {
    server.use(
      http.get("*/students/blocked", () =>
        HttpResponse.json({ code: "forbidden", message: "not allowed" }, { status: 403 }),
      ),
    );

    await expect(fetchStudentById("blocked")).rejects.toBeInstanceOf(ApiError);
  });

  it("sends the new student as the contract describes it", async () => {
    let received: unknown = null;
    server.use(
      http.post("*/students", async ({ request }) => {
        received = await request.json();
        return HttpResponse.json(student, { status: 201 });
      }),
    );

    await createStudent({
      name: "Aluno Teste",
      birthDate: "2012-05-10",
      guardianName: "Responsável Teste",
      guardianPhone: "(11) 91234-5678",
    });

    expect(received).toEqual({
      name: "Aluno Teste",
      birthDate: "2012-05-10",
      guardianName: "Responsável Teste",
      guardianPhone: "(11) 91234-5678",
    });
  });

  it("surfaces a duplicate ficha as the API's own conflict code", async () => {
    server.use(
      http.post("*/students", () =>
        HttpResponse.json({ code: "conflict", message: "student already exists" }, { status: 409 }),
      ),
    );

    const failure = createStudent({
      name: "Aluno Teste",
      birthDate: "2012-05-10",
      guardianName: "Responsável Teste",
      guardianPhone: "(11) 91234-5678",
    });

    await expect(failure).rejects.toMatchObject({ code: "conflict" });
  });

  it("patches only what changed", async () => {
    let received: unknown = null;
    server.use(
      http.patch("*/students/student-1", async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ ...student, active: false });
      }),
    );

    await updateStudent("student-1", { active: false });

    expect(received).toEqual({ active: false });
  });

  it("treats the 204 on delete as success, not as an empty body failure", async () => {
    server.use(http.delete("*/students/student-1", () => new HttpResponse(null, { status: 204 })));

    await expect(deleteStudent("student-1")).resolves.toBeUndefined();
  });
});
