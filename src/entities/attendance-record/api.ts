import type { components } from "@/shared/api/schema";
import { apiClient } from "@/shared/lib/api/instance";

export type AttendanceRecord = components["schemas"]["AttendanceRecord"];
export type RollCallEntry = components["schemas"]["RollCall"]["entries"][number];

export const fetchAttendanceRecordsBySession = (sessionId: string): Promise<AttendanceRecord[]> =>
  apiClient().request<AttendanceRecord[]>(`/attendance-sessions/${sessionId}/records`);

/**
 * Reading every record means reading every session's sheet, since the API scopes
 * records to a roll call. Screens that only need one class should ask by session.
 */
export const fetchAttendanceRecords = async (): Promise<AttendanceRecord[]> => {
  const sessions =
    await apiClient().request<components["schemas"]["AttendanceSession"][]>("/attendance-sessions");
  const sheets = await Promise.all(
    sessions.map((session) => fetchAttendanceRecordsBySession(session.id)),
  );
  return sheets.flat();
};

export const fetchAttendanceRecordsByStudent = async (
  studentId: string,
): Promise<AttendanceRecord[]> => {
  const records = await fetchAttendanceRecords();
  return records.filter((record) => record.studentId === studentId);
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
