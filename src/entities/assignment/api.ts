import type { components } from "@/shared/api/schema";
import { apiClient } from "@/shared/lib/api/instance";
import type { Assignment } from "./model";

export type NewAssignmentInput = components["schemas"]["NewAssignment"];

export const fetchAssignments = (): Promise<Assignment[]> =>
  apiClient().request<Assignment[]>("/assignments");

export const fetchAssignmentsByGroup = (groupId: string): Promise<Assignment[]> =>
  apiClient().request<Assignment[]>(`/assignments?${new URLSearchParams({ groupId })}`);

export const fetchAssignmentsByTeacher = (teacherId: string): Promise<Assignment[]> =>
  apiClient().request<Assignment[]>(`/assignments?${new URLSearchParams({ teacherId })}`);

export const createAssignment = (input: NewAssignmentInput): Promise<Assignment> =>
  apiClient().request<Assignment>("/assignments", { method: "POST", body: input });

export const updateAssignmentTeacher = async (id: string, teacherId: string): Promise<void> => {
  await apiClient().request<Assignment>(`/assignments/${id}`, {
    method: "PATCH",
    body: { teacherId },
  });
};

export const deleteAssignment = async (id: string): Promise<void> => {
  await apiClient().request(`/assignments/${id}`, { method: "DELETE" });
};
