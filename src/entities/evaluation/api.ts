import type { components } from "@/shared/api/schema";
import { apiClient } from "@/shared/lib/api/instance";

export type Evaluation = components["schemas"]["Evaluation"];
export type NewEvaluationInput = components["schemas"]["NewEvaluationInput"];
export type EvaluationUpdate = components["schemas"]["EvaluationChangesInput"];

export const fetchEvaluations = (): Promise<Evaluation[]> =>
  apiClient().request<Evaluation[]>("/evaluations");

export const fetchEvaluationsByAssignment = (
  groupId: string,
  subjectId: string,
): Promise<Evaluation[]> =>
  apiClient().request<Evaluation[]>(
    `/evaluations?groupId=${encodeURIComponent(groupId)}&subjectId=${encodeURIComponent(subjectId)}`,
  );

export const createEvaluation = (input: NewEvaluationInput): Promise<Evaluation> =>
  apiClient().request<Evaluation>("/evaluations", { method: "POST", body: input });

export const updateEvaluation = (id: string, patch: EvaluationUpdate): Promise<Evaluation> =>
  apiClient().request<Evaluation>(`/evaluations/${id}`, { method: "PATCH", body: patch });

/** The API cascades: removing an evaluation also removes the grades that belong to it. */
export const deleteEvaluation = async (id: string): Promise<void> => {
  await apiClient().request(`/evaluations/${id}`, { method: "DELETE" });
};
