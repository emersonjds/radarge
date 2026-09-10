import type { components } from "@/shared/api/schema";
import { apiClient } from "@/shared/lib/api/instance";

export type EvaluationGrade = components["schemas"]["EvaluationGrade"];
type GradeSheetEntry = components["schemas"]["GradeSheetInput"]["entries"][number];

export const fetchEvaluationGradesByEvaluation = (
  evaluationId: string,
): Promise<EvaluationGrade[]> =>
  apiClient().request<EvaluationGrade[]>(`/evaluations/${evaluationId}/grades`);

export interface SetEvaluationGradeInput {
  evaluationId: string;
  studentId: string;
  score: number | null;
}

/**
 * The API saves the grade sheet whole with one PUT, so a single row change reads
 * the current sheet, replaces that student's entry, and writes the sheet back.
 */
export const setEvaluationGrade = async (input: SetEvaluationGradeInput): Promise<void> => {
  const current = await fetchEvaluationGradesByEvaluation(input.evaluationId);
  const entries: GradeSheetEntry[] = [
    ...current
      .filter((grade) => grade.studentId !== input.studentId)
      .map((grade) => ({ studentId: grade.studentId, score: grade.score })),
    { studentId: input.studentId, score: input.score },
  ];

  await apiClient().request<EvaluationGrade[]>(`/evaluations/${input.evaluationId}/grades`, {
    method: "PUT",
    body: { entries },
  });
};
