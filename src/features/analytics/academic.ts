import type { Grade } from "@/entities/grade/model";
import type { Area, Subject } from "@/entities/subject/model";

const round1 = (value: number): number => Math.round(value * 10) / 10;

export function overallAverage(grades: Grade[]): number {
  if (grades.length === 0) return 0;
  return round1(grades.reduce((sum, grade) => sum + grade.score, 0) / grades.length);
}

export interface SubjectScore {
  subject: Subject;
  score: number;
}

export function averageBySubject(grades: Grade[], subjects: Subject[]): SubjectScore[] {
  const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));
  const acc = new Map<string, { sum: number; count: number }>();
  for (const grade of grades) {
    if (!subjectById.has(grade.subjectId)) continue;
    const bucket = acc.get(grade.subjectId) ?? { sum: 0, count: 0 };
    bucket.sum += grade.score;
    bucket.count += 1;
    acc.set(grade.subjectId, bucket);
  }
  return [...acc.entries()]
    .map(([subjectId, { sum, count }]) => ({
      subject: subjectById.get(subjectId)!,
      score: round1(sum / count),
    }))
    .sort((first, second) => second.score - first.score);
}

export interface AreaScore {
  area: Area;
  average: number;
}

export function areaAffinity(grades: Grade[], subjects: Subject[]): AreaScore[] {
  const areaBySubject = new Map(subjects.map((subject) => [subject.id, subject.area]));
  const acc = new Map<Area, { sum: number; count: number }>();
  for (const grade of grades) {
    const area = areaBySubject.get(grade.subjectId);
    if (!area) continue;
    const bucket = acc.get(area) ?? { sum: 0, count: 0 };
    bucket.sum += grade.score;
    bucket.count += 1;
    acc.set(area, bucket);
  }
  return [...acc.entries()]
    .map(([area, { sum, count }]) => ({ area, average: round1(sum / count) }))
    .sort((first, second) => second.average - first.average);
}

export function studentAptitude(grades: Grade[], subjects: Subject[]): Area | null {
  return areaAffinity(grades, subjects)[0]?.area ?? null;
}
