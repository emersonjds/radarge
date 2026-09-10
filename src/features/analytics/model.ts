import { PRESENT_STATUSES, type AttendanceRecord } from "@/entities/attendance-record/model";

export function attendanceRate(records: AttendanceRecord[]): number {
  if (records.length === 0) return 0;
  const present = records.filter((record) => PRESENT_STATUSES.includes(record.status)).length;
  return Math.round((present / records.length) * 100);
}

export function countAbsences(records: AttendanceRecord[]): number {
  return records.filter((record) => record.status === "absent").length;
}

export type StudentSituation = "at-risk" | "regular" | "no-data";

// A student outside every roll call is neither at risk nor regular: there is no evidence to judge.
export function studentSituation(absences: number | null, riskThreshold: number): StudentSituation {
  if (absences === null) return "no-data";
  return absences >= riskThreshold ? "at-risk" : "regular";
}
