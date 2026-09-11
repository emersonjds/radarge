import type { components } from "@/shared/api/schema";
import { apiClient } from "@/shared/lib/api/instance";

export type Subject = components["schemas"]["Subject"];
export type NewSubjectInput = components["schemas"]["NewSubject"];
export type SubjectUpdate = components["schemas"]["SubjectChanges"];

export const fetchSubjects = (): Promise<Subject[]> => apiClient().request<Subject[]>("/subjects");

export const createSubject = (input: NewSubjectInput): Promise<Subject> =>
  apiClient().request<Subject>("/subjects", { method: "POST", body: input });

export const updateSubject = (id: string, patch: SubjectUpdate): Promise<Subject> =>
  apiClient().request<Subject>(`/subjects/${id}`, { method: "PATCH", body: patch });

export const deleteSubject = async (id: string): Promise<void> => {
  await apiClient().request(`/subjects/${id}`, { method: "DELETE" });
};
