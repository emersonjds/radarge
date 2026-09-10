import type { components } from "@/shared/api/schema";
import { apiClient } from "@/shared/lib/api/instance";

export type AttendanceRecord = components["schemas"]["AttendanceRecord"];
export type RollCallEntry = components["schemas"]["RollCall"]["entries"][number];

export const fetchAttendanceRecordsBySession = (sessionId: string): Promise<AttendanceRecord[]> =>
  apiClient().request<AttendanceRecord[]>(`/attendance-sessions/${sessionId}/records`);

/**
 * The API has no per-student roll-call route, so a student's history still means
 * reading every session's sheet and filtering client-side. Screens that only need
 * an aggregate (rate, absences) should ask `/analytics` instead of this fetcher.
 */
export const fetchAttendanceRecordsByStudent = async (
  studentId: string,
): Promise<AttendanceRecord[]> => {
  const sessions =
    await apiClient().request<components["schemas"]["AttendanceSession"][]>("/attendance-sessions");
  const sheets = await Promise.all(
    sessions.map((session) => fetchAttendanceRecordsBySession(session.id)),
  );
  return sheets.flat().filter((record) => record.studentId === studentId);
};

export interface SaveRollCallInput {
  sessionId: string;
  entries: RollCallEntry[];
}

/**
 * The whole sheet goes in one call, so a half-saved roll call is not a state the
 * database can reach. The payload field is `entries`, which is what the API reads.
 */
export const saveRollCall = ({
  sessionId,
  entries,
}: SaveRollCallInput): Promise<AttendanceRecord[]> =>
  apiClient().request<AttendanceRecord[]>(`/attendance-sessions/${sessionId}/records`, {
    method: "PUT",
    body: { entries },
  });
