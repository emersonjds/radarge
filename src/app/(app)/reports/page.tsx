"use client";

import { useRequireRole } from "@/features/session/use-require-role";
import { useSearchParams } from "next/navigation";
import { ReportsCenter } from "@/widgets/reports/ReportsCenter";
import { StudentDetail } from "@/widgets/student-detail/StudentDetail";

export default function ReportsPage() {
  const isAllowed = useRequireRole(["admin", "coordinator"]);
  const searchParams = useSearchParams();
  const studentId = searchParams.get("studentId");

  if (!isAllowed) return null;

  if (studentId) {
    return <StudentDetail studentId={studentId} backHref="/reports" backLabel="Relatórios" />;
  }

  return <ReportsCenter />;
}
