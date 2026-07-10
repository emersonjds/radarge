import { describe, expect, it } from "vitest";
import type { Assignment } from "@/entities/assignment/model";
import type { Enrollment } from "@/entities/enrollment/model";
import type { Grade } from "@/entities/grade/model";
import type { Group } from "@/entities/group/model";
import { studentGradesInScope, studentGroupsInScope } from "./scope";

const RICARDO = "perfil-ricardo";
const BRUNO = "perfil-bruno";

const groups: Group[] = [
  { id: "mat-b", name: "Matemática", shift: "afternoon", teacherId: RICARDO },
  { id: "fis-a", name: "Física", shift: "afternoon", teacherId: RICARDO },
  { id: "cie-c", name: "Ciências", shift: "afternoon", teacherId: BRUNO },
];

const enrollment = (groupId: string, active = true): Enrollment => ({
  id: `matricula-${groupId}`,
  studentId: "aluno-1",
  groupId,
  joinedAt: "2026-07-01",
  active,
});

describe("studentGroupsInScope", () => {
  it("gives a teacher only the aulas they run with this student", () => {
    const aulas = studentGroupsInScope(
      [enrollment("mat-b"), enrollment("cie-c")],
      groups,
      "teacher",
      RICARDO,
    );
    expect(aulas.map((aula) => aula.id)).toEqual(["mat-b"]);
  });

  it("returns nothing when the student studies with another teacher only", () => {
    expect(studentGroupsInScope([enrollment("cie-c")], groups, "teacher", RICARDO)).toEqual([]);
  });

  it("ignores inactive enrollments", () => {
    expect(studentGroupsInScope([enrollment("mat-b", false)], groups, "teacher", RICARDO)).toEqual(
      [],
    );
  });

  it("gives an admin every aula of the student", () => {
    const aulas = studentGroupsInScope(
      [enrollment("mat-b"), enrollment("cie-c")],
      groups,
      "admin",
      "perfil-ana",
    );
    expect(aulas.map((aula) => aula.id)).toEqual(["mat-b", "cie-c"]);
  });
});

describe("studentGradesInScope", () => {
  const grades: Grade[] = [
    { id: "g1", studentId: "aluno-1", subjectId: "matematica", score: 8 },
    { id: "g2", studentId: "aluno-1", subjectId: "biologia", score: 7 },
  ];
  const assignments: Assignment[] = [
    { id: "a1", groupId: "mat-b", subjectId: "matematica", teacherId: RICARDO },
    { id: "a2", groupId: "fis-a", subjectId: "biologia", teacherId: RICARDO },
  ];

  it("keeps only the subjects the teacher teaches in this student's aulas", () => {
    const aulasDoAluno = [groups[0]];
    const visiveis = studentGradesInScope(grades, assignments, aulasDoAluno, "teacher");
    expect(visiveis.map((grade) => grade.subjectId)).toEqual(["matematica"]);
  });

  it("does not leak a subject the teacher teaches in an aula the student is not in", () => {
    const visiveis = studentGradesInScope(grades, assignments, [], "teacher");
    expect(visiveis).toEqual([]);
  });

  it("gives coordinators every grade", () => {
    expect(studentGradesInScope(grades, assignments, [], "coordinator")).toEqual(grades);
  });
});
