"use client";

import { useRequireRole } from "@/features/session/use-require-role";
import { GroupsAdmin } from "@/widgets/groups-admin/GroupsAdmin";

export default function GroupsPage() {
  const isAllowed = useRequireRole(["admin"]);
  if (!isAllowed) return null;
  return <GroupsAdmin />;
}
