import { apiClient } from "@/shared/lib/api/instance";
import type { Enrollment } from "./model";

export const fetchEnrollments = (): Promise<Enrollment[]> =>
  apiClient().request<Enrollment[]>("/enrollments");

export const fetchEnrollmentsByGroup = (groupId: string): Promise<Enrollment[]> =>
  apiClient().request<Enrollment[]>(`/enrollments?${new URLSearchParams({ groupId })}`);

export const fetchEnrollmentsByStudent = (studentId: string): Promise<Enrollment[]> =>
  apiClient().request<Enrollment[]>(`/enrollments?${new URLSearchParams({ studentId })}`);

export interface EnrollStudentInput {
  studentId: string;
  groupId: string;
}

/** Idempotent on the API: re-enrolling a student who never left answers with their existing row. */
export const enrollStudent = (input: EnrollStudentInput): Promise<Enrollment> =>
  apiClient().request<Enrollment>("/enrollments", { method: "POST", body: input });

export const unenrollStudent = async (input: EnrollStudentInput): Promise<void> => {
  const query = new URLSearchParams({ studentId: input.studentId, groupId: input.groupId });
  await apiClient().request(`/enrollments?${query}`, { method: "DELETE" });
};
