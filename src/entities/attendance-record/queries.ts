"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAttendanceRecords,
  fetchAttendanceRecordsBySession,
  fetchAttendanceRecordsByStudent,
  saveRollCall,
} from "./api";

export const attendanceRecordKeys = {
  all: ["attendanceRecords"],
  bySession: (sessionId: string) => ["attendanceRecords", "session", sessionId],
  byStudent: (studentId: string) => ["attendanceRecords", "student", studentId],
};

export function useAttendanceRecords() {
  return useQuery({ queryKey: attendanceRecordKeys.all, queryFn: fetchAttendanceRecords });
}

export function useAttendanceRecordsBySession(sessionId: string) {
  return useQuery({
    queryKey: attendanceRecordKeys.bySession(sessionId),
    queryFn: () => fetchAttendanceRecordsBySession(sessionId),
    enabled: Boolean(sessionId),
  });
}

export function useAttendanceRecordsByStudent(studentId: string) {
  return useQuery({
    queryKey: attendanceRecordKeys.byStudent(studentId),
    queryFn: () => fetchAttendanceRecordsByStudent(studentId),
    enabled: Boolean(studentId),
  });
}

export function useSaveRollCall() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveRollCall,
    onSuccess: (_records, input) => {
      queryClient.invalidateQueries({ queryKey: attendanceRecordKeys.all });
      queryClient.invalidateQueries({
        queryKey: attendanceRecordKeys.bySession(input.sessionId),
      });
      // Every student on the sheet moved, and their per-student views are keyed
      // individually, so the whole branch goes rather than each key by hand.
      queryClient.invalidateQueries({ queryKey: ["attendanceRecords", "student"] });
    },
  });
}
