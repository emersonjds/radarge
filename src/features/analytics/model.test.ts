import { describe, expect, it } from "vitest";
import type { AttendanceRecord } from "@/entities/attendance-record/model";
import { countAbsences, attendanceRate } from "./model";

function presenca(status: AttendanceRecord["status"], id = "x"): AttendanceRecord {
  return { id, sessionId: "c1", studentId: "a1", status };
}

describe("attendanceRate", () => {
  it("counts presente and atrasado as present", () => {
    const rows = [presenca("present"), presenca("late"), presenca("absent")];
    expect(attendanceRate(rows)).toBe(67);
  });

  it("returns 0 with no records", () => {
    expect(attendanceRate([])).toBe(0);
  });

  it("justificado does not count as present", () => {
    expect(attendanceRate([presenca("present"), presenca("excused")])).toBe(50);
  });
});

describe("countAbsences", () => {
  it("counts only ausente", () => {
    const rows = [presenca("absent"), presenca("absent"), presenca("late")];
    expect(countAbsences(rows)).toBe(2);
  });
});
