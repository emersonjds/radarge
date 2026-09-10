"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { Role } from "@/entities/profile/model";
import { useSession } from "./use-session";

/**
 * Route guard for deep links. This is navigation UX, not a security boundary —
 * the API decides what a role may read, and hiding a link protects nothing.
 */
export function useRequireRole(allowedRoles: Role[]): boolean {
  const { status, role, mustChangePassword } = useSession();
  const router = useRouter();
  const allowed = role !== null && allowedRoles.includes(role);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "anonymous") router.replace("/login");
    else if (mustChangePassword) router.replace("/change-password");
    else if (!allowed) router.replace("/");
  }, [status, allowed, mustChangePassword, router]);

  return status === "authenticated" && !mustChangePassword && allowed;
}
