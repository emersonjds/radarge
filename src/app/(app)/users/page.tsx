"use client";

import { useRequireRole } from "@/features/session/use-require-role";
import { ProfilesAdmin } from "@/widgets/profiles-admin/ProfilesAdmin";

export default function UsersPage() {
  const isAllowed = useRequireRole(["admin"]);
  if (!isAllowed) return null;
  return <ProfilesAdmin />;
}
