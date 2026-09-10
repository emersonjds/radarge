"use client";

import { useRequireRole } from "@/features/session/use-require-role";
import { Events } from "@/widgets/events/Events";

export default function EventsPage() {
  const isAllowed = useRequireRole(["teacher", "coordinator", "admin"]);
  if (!isAllowed) return null;
  return <Events />;
}
