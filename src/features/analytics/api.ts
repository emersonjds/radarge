import type { components } from "@/shared/api/schema";
import { apiClient } from "@/shared/lib/api/instance";

export type AttendanceRate = components["schemas"]["AttendanceRate"];
export type AbsenteeismPoint = components["schemas"]["AbsenteeismPoint"];
export type StudentAtRisk = components["schemas"]["StudentAtRisk"];
export type AcademicSummary = components["schemas"]["AcademicSummary"];

export interface AttendanceRateFilter {
  groupId?: string;
  studentId?: string;
  from?: string;
  to?: string;
}

export interface AbsenteeismTrendFilter {
  groupId?: string;
  from?: string;
  to?: string;
}

export interface StudentsAtRiskFilter {
  groupId?: string;
  threshold?: number;
}

export interface AcademicSummaryFilter {
  groupId?: string;
  studentId?: string;
}

const toQueryString = (filter: object): string => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filter)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
};

export const fetchAttendanceRate = (filter: AttendanceRateFilter = {}): Promise<AttendanceRate> =>
  apiClient().request<AttendanceRate>(`/analytics/attendance-rate${toQueryString(filter)}`);

export const fetchAbsenteeismTrend = (
  filter: AbsenteeismTrendFilter = {},
): Promise<AbsenteeismPoint[]> =>
  apiClient().request<AbsenteeismPoint[]>(`/analytics/absenteeism-trend${toQueryString(filter)}`);

export const fetchStudentsAtRisk = (filter: StudentsAtRiskFilter = {}): Promise<StudentAtRisk[]> =>
  apiClient().request<StudentAtRisk[]>(`/analytics/students-at-risk${toQueryString(filter)}`);

export const fetchAcademicSummary = (
  filter: AcademicSummaryFilter = {},
): Promise<AcademicSummary> =>
  apiClient().request<AcademicSummary>(`/analytics/academic-summary${toQueryString(filter)}`);
