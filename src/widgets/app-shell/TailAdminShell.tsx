"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { roleLabels } from "@/entities/profile/model";
import { useSession } from "@/features/session/use-session";
import { useSidebar } from "@tailadmin/context/SidebarContext";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { AppBreadcrumb } from "./AppBreadcrumb";
import { Backdrop } from "./Backdrop";

export interface TailAdminShellProps {
  children: ReactNode;
}

export function TailAdminShell({ children }: TailAdminShellProps) {
  const router = useRouter();
  const { status, profile, mustChangePassword, logout } = useSession();
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  useEffect(() => {
    if (status === "loading") return;
    if (status === "anonymous") router.replace("/login");
    else if (mustChangePassword) router.replace("/change-password");
  }, [status, mustChangePassword, router]);

  if (status !== "authenticated" || mustChangePassword || !profile) return null;

  const jobTitle = profile.jobTitle ?? roleLabels[profile.role];
  const mainMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
      ? "lg:ml-[290px]"
      : "lg:ml-[90px]";

  return (
    <div className="min-h-screen bg-muted">
      <AppSidebar role={profile.role} />
      <Backdrop />
      <div
        className={`flex min-h-screen flex-col transition-all duration-300 ease-in-out ${mainMargin}`}
      >
        <AppHeader name={profile.name} jobTitle={jobTitle} onLogout={logout} />
        <main className="mx-auto w-full max-w-(--breakpoint-2xl) flex-1 p-4 md:p-6">
          <AppBreadcrumb />
          {children}
        </main>
      </div>
    </div>
  );
}
