"use client";

import { useQuery } from "@tanstack/react-query";
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
