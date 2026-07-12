"use client";

import { useRequireRole } from "@/features/session/use-require-role";
import { Events } from "@/widgets/events/Events";

export default function EventsPage() {
  const permitido = useRequireRole(["teacher", "coordinator", "admin"]);
  if (!permitido) return null;
  return <Events />;
}
