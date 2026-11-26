"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { completeTour, type SessionProfile } from "@/features/auth/api";
import { runProductTour } from "@/features/product-tour";
import { sessionKeys, useSession } from "@/features/session/use-session";
import type { Role } from "@/entities/profile/model";
import { useSidebar } from "@tailadmin/context/SidebarContext";

const MOBILE_QUERY = "(max-width: 1023px)";

export interface FirstAccessTour {
  replay: () => void;
}

export const useFirstAccessTour = (): FirstAccessTour => {
  const queryClient = useQueryClient();
  const { profile, mustChangePassword } = useSession();
  const { isMobileOpen, toggleMobileSidebar } = useSidebar();
  const startedRef = useRef(false);

  const start = (role: Role, onFinish?: () => void) => {
    const opensSidebar = window.matchMedia(MOBILE_QUERY).matches && !isMobileOpen;
    if (opensSidebar) toggleMobileSidebar();

    runProductTour({
      role,
      onDone: () => {
        if (opensSidebar) toggleMobileSidebar();
        onFinish?.();
      },
    });
  };

  const markComplete = () => {
    queryClient.setQueryData<SessionProfile>(
      sessionKeys.current,
      (current) => current && { ...current, tourCompleted: true },
    );
    completeTour().catch(() => undefined);
  };

  useEffect(() => {
    if (!profile || mustChangePassword || profile.tourCompleted || startedRef.current) return;
    startedRef.current = true;
    start(profile.role, markComplete);
  });

  const replay = () => {
    if (profile) start(profile.role);
  };

  return { replay };
};
