import type { components } from "@/shared/api/schema";
import { apiClient } from "@/shared/lib/api/instance";

export type AttendanceSession = components["schemas"]["AttendanceSession"];

/**
 * The teacher is not sent: the API takes it from the caller. A session is unique per
 * (group, date) as a database constraint, so opening one that exists answers the
 * existing row rather than a conflict.
 */
export interface NewAttendanceSession {
  groupId: string;
  date: string;
}

export const fetchAttendanceSessions = (): Promise<AttendanceSession[]> =>
  apiClient().request<AttendanceSession[]>("/attendance-sessions");

export const fetchAttendanceSessionsByGroup = async (
  groupId: string,
): Promise<AttendanceSession[]> => {
  const sessions = await fetchAttendanceSessions();
  return sessions.filter((session) => session.groupId === groupId);
};

export const createAttendanceSession = (input: NewAttendanceSession): Promise<AttendanceSession> =>
  apiClient().request<AttendanceSession>("/attendance-sessions", {
    method: "POST",
    body: input,
  });
