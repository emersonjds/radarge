import type { components } from "@/shared/api/schema";
import { apiClient } from "@/shared/lib/api/instance";
import type { Grade } from "./model";

type SubjectAverage = components["schemas"]["SubjectAverage"];

/** SubjectAverage carries no id — the API answers one row per (student, subject). */
const toGrade = (average: SubjectAverage): Grade => ({
  id: `${average.studentId}-${average.subjectId}`,
  studentId: average.studentId,
  subjectId: average.subjectId,
  score: average.score,
});

export const fetchGrades = async (): Promise<Grade[]> => {
  const averages = await apiClient().request<SubjectAverage[]>("/grades");
  return averages.map(toGrade);
};

export const fetchGradesByStudent = async (studentId: string): Promise<Grade[]> => {
  const averages = await apiClient().request<SubjectAverage[]>(
    `/grades?studentId=${encodeURIComponent(studentId)}`,
  );
  return averages.map(toGrade);
};
