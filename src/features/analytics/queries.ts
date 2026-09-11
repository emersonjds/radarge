"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import {
  fetchAbsenteeismTrend,
  fetchAcademicSummary,
  fetchAttendanceRate,
  fetchStudentsAtRisk,
  type AbsenteeismTrendFilter,
  type AcademicSummaryFilter,
  type AttendanceRateFilter,
  type StudentsAtRiskFilter,
} from "./api";

export const analyticsKeys = {
  attendanceRate: (filter: AttendanceRateFilter) => ["analytics", "attendance-rate", filter],
  absenteeismTrend: (filter: AbsenteeismTrendFilter) => ["analytics", "absenteeism-trend", filter],
  studentsAtRisk: (filter: StudentsAtRiskFilter) => ["analytics", "students-at-risk", filter],
  academicSummary: (filter: AcademicSummaryFilter) => ["analytics", "academic-summary", filter],
};

export function useAttendanceRate(filter: AttendanceRateFilter = {}, enabled = true) {
  return useQuery({
    queryKey: analyticsKeys.attendanceRate(filter),
    queryFn: () => fetchAttendanceRate(filter),
    enabled,
  });
}

export interface GroupAttendanceRate {
  groupId: string;
  rate: number;
  total: number;
}

// The server aggregates attendance per group the same way it aggregates the
// overall rate (present records over total records); this keeps the "por aula"
// chart honest with the KPI above it instead of re-deriving a class figure from
// each student's rate across every class they attend.
export function useAttendanceRateByGroup(groupIds: string[]) {
  return useQueries({
    queries: groupIds.map((groupId) => ({
      queryKey: analyticsKeys.attendanceRate({ groupId }),
      queryFn: () => fetchAttendanceRate({ groupId }),
    })),
    combine: (results) => ({
      data: results.flatMap((result, index): GroupAttendanceRate[] =>
        result.data === undefined
          ? []
          : [{ groupId: groupIds[index], rate: result.data.rate, total: result.data.total }],
      ),
      isLoading: results.some((result) => result.isLoading),
      isError: results.some((result) => result.isError),
    }),
  });
}

export function useAbsenteeismTrend(filter: AbsenteeismTrendFilter = {}) {
  return useQuery({
    queryKey: analyticsKeys.absenteeismTrend(filter),
    queryFn: () => fetchAbsenteeismTrend(filter),
  });
}

export function useStudentsAtRisk(filter: StudentsAtRiskFilter = {}) {
  return useQuery({
    queryKey: analyticsKeys.studentsAtRisk(filter),
    queryFn: () => fetchStudentsAtRisk(filter),
  });
}

export function useAcademicSummary(filter: AcademicSummaryFilter = {}, enabled = true) {
  return useQuery({
    queryKey: analyticsKeys.academicSummary(filter),
    queryFn: () => fetchAcademicSummary(filter),
    enabled,
  });
}
