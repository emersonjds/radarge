import type { components } from "@/shared/api/schema";
import { apiClient } from "@/shared/lib/api/instance";
import { ApiError } from "@/shared/lib/api/errors";
import { fetchEnrollmentsByGroup } from "@/entities/enrollment/api";
import type { Student } from "./model";

export type NewStudentInput = components["schemas"]["NewStudent"];
export type StudentUpdate = components["schemas"]["StudentChanges"];

export const fetchStudents = (): Promise<Student[]> => apiClient().request<Student[]>("/students");

export const fetchStudentsByGroup = async (groupId: string): Promise<Student[]> => {
  const [students, enrollments] = await Promise.all([
    fetchStudents(),
    fetchEnrollmentsByGroup(groupId),
  ]);
  const studentIds = new Set(
    enrollments.filter((enrollment) => enrollment.active).map((enrollment) => enrollment.studentId),
  );
  return students.filter((student) => studentIds.has(student.id));
};

/** Null rather than a throw: a caller holding a stale id asks a question, not an error. */
export const fetchStudentById = async (id: string): Promise<Student | null> => {
  try {
    return await apiClient().request<Student>(`/students/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.code === "not_found") return null;
    throw error;
  }
};

export const createStudent = (input: NewStudentInput): Promise<Student> =>
  apiClient().request<Student>("/students", { method: "POST", body: input });

export const updateStudent = async (id: string, patch: StudentUpdate): Promise<void> => {
  await apiClient().request<Student>(`/students/${id}`, { method: "PATCH", body: patch });
};

export const deleteStudent = async (id: string): Promise<void> => {
  await apiClient().request(`/students/${id}`, { method: "DELETE" });
};
