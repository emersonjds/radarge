"use client";

import { useRequireRole } from "@/features/session/use-require-role";
import { GradesTeacher } from "@/widgets/grades-teacher/GradesTeacher";

export default function GradesPage() {
  const isAllowed = useRequireRole(["teacher"]);
  if (!isAllowed) return null;
  return <GradesTeacher />;
}
