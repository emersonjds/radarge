"use client";

import { useRequireRole } from "@/features/session/use-require-role";
import { SubjectsAdmin } from "@/widgets/subjects-admin/SubjectsAdmin";

export default function SubjectsPage() {
  const isAllowed = useRequireRole(["admin"]);
  if (!isAllowed) return null;
  return <SubjectsAdmin />;
}
