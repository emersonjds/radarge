import { PRESENT_STATUSES, type AttendanceRecord } from "@/entities/attendance-record/model";

export function attendanceRate(records: AttendanceRecord[]): number {
  if (records.length === 0) return 0;
  const present = records.filter((record) => PRESENT_STATUSES.includes(record.status)).length;
  return Math.round((present / records.length) * 100);
}

export function countAbsences(records: AttendanceRecord[]): number {
  return records.filter((record) => record.status === "absent").length;
}
