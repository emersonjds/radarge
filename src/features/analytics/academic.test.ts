import { describe, expect, it } from "vitest";
import type { Grade } from "@/entities/grade/model";
import type { Subject } from "@/entities/subject/model";
import { areaAffinity, overallAverage, studentAptitude } from "./academic";

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

  it("entradas vazias retornam neutro, nunca NaN", () => {
    expect(overallAverage([])).toBe(0);
    expect(studentAptitude([], subjects)).toBeNull();
    expect(areaAffinity([], subjects)).toEqual([]);
  });
});
