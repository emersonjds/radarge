"use client";

import { AttendanceForm } from "@/features/take-attendance/AttendanceForm";
import { useRequireRole } from "@/features/session/use-require-role";

export default function AttendancePage() {
  const isAllowed = useRequireRole(["teacher"]);
  if (!isAllowed) return null;
  return <AttendanceForm />;
}
