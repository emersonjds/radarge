import { describe, expect, it } from "vitest";
import type { AttendanceRecord } from "@/entities/attendance-record/model";
import { countAbsences, attendanceRate } from "./model";

function record(status: AttendanceRecord["status"], id = "x"): AttendanceRecord {
  return { id, sessionId: "c1", studentId: "a1", status };
}

describe("attendanceRate", () => {
  it("counts present and late as present", () => {
    const rows = [record("present"), record("late"), record("absent")];
    expect(attendanceRate(rows)).toBe(67);
  });

  it("returns 0 with no records", () => {
    expect(attendanceRate([])).toBe(0);
  });

  it("does not count excused as present", () => {
    expect(attendanceRate([record("present"), record("excused")])).toBe(50);
  });
});

describe("countAbsences", () => {
  it("counts only absent", () => {
    const rows = [record("absent"), record("absent"), record("late")];
    expect(countAbsences(rows)).toBe(2);
  });
});
