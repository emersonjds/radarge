import { describe, expect, it } from "vitest";
import type { Grade } from "@/entities/grade/model";
import type { Subject } from "@/entities/subject/model";
import {
  areaAffinity,
  attentionSubjects,
  classAcademicSummary,
  overallAverage,
  studentAptitude,
  topSubjects,
} from "./academic";

const subjects: Subject[] = [
  { id: "mat", name: "Matemática", area: "exact_sciences" },
  { id: "fis", name: "Física", area: "exact_sciences" },
  { id: "hist", name: "História", area: "humanities" },
  { id: "geo", name: "Geografia", area: "humanities" },
];

function grade(studentId: string, subjectId: string, score: number): Grade {
  return { id: `${studentId}-${subjectId}`, studentId, subjectId, score };
}

const marcus: Grade[] = [
  grade("s1", "mat", 9),
  grade("s1", "fis", 8),
  grade("s1", "hist", 6),
  grade("s1", "geo", 5),
];

describe("academic analytics", () => {
  it("média geral arredonda a uma casa", () => {
    expect(overallAverage(marcus)).toBe(7);
  });

  it("aptidão é a área de maior média", () => {
    expect(studentAptitude(marcus, subjects)).toBe("exact_sciences");
    const affinity = areaAffinity(marcus, subjects);
    expect(affinity[0]).toEqual({ area: "exact_sciences", average: 8.5 });
    expect(affinity[affinity.length - 1].area).toBe("humanities");
  });

  it("matérias de destaque e de atenção ordenam por nota", () => {
    expect(topSubjects(marcus, subjects, 2).map((item) => item.subject.id)).toEqual(["mat", "fis"]);
    expect(attentionSubjects(marcus, subjects, 2).map((item) => item.subject.id)).toEqual([
      "geo",
      "hist",
    ]);
  });

  it("resumo da turma faz média por matéria entre alunos", () => {
    const turma: Grade[] = [
      grade("s1", "mat", 8),
      grade("s2", "mat", 6),
      grade("s1", "hist", 4),
      grade("s2", "hist", 6),
    ];
    const summary = classAcademicSummary(turma, subjects);
    expect(summary.averageScore).toBe(6);
    expect(summary.topArea).toBe("exact_sciences");
    expect(summary.topSubjects[0]).toEqual({ subject: subjects[0], score: 7 });
  });

  it("entradas vazias retornam neutro, nunca NaN", () => {
    expect(overallAverage([])).toBe(0);
    expect(studentAptitude([], subjects)).toBeNull();
    expect(areaAffinity([], subjects)).toEqual([]);
    expect(classAcademicSummary([], subjects).topArea).toBeNull();
  });
});
