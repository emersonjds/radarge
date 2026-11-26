"use client";

import { useSidebar } from "@tailadmin/context/SidebarContext";
import { REPLAY_TOUR_TARGET } from "@/features/product-tour";
import { AvatarText } from "@/shared/ui/avatar-text";

export interface AppHeaderProps {
  name: string;
  jobTitle: string;
  onLogout: () => void;
  onReplayTour: () => void;
}

export function AppHeader({ name, jobTitle, onLogout, onReplayTour }: AppHeaderProps) {
  const { toggleSidebar, toggleMobileSidebar } = useSidebar();

  // lg breakpoint (1024px) controls which sidebar the toggle drives: the
  // collapsible desktop rail vs. the mobile slide-in drawer. Firing both at
  // once leaves isMobileOpen set on desktop, which pins the rail open.
  const handleToggle = () => {
    if (window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  return (
    <header className="sticky top-0 z-30 flex w-full border-b border-border bg-card">
      <div className="flex w-full items-center justify-between gap-2 px-4 py-3 lg:px-6">
        <button
          aria-label="Alternar menu"
          onClick={handleToggle}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
          </svg>
        </button>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-foreground">{name}</p>
            <p className="text-xs text-muted-foreground">{jobTitle}</p>
          </div>
          <AvatarText name={name} />
          <button
            data-tour={REPLAY_TOUR_TARGET}
            onClick={onReplayTour}
            className="h-11 rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-muted lg:h-auto lg:py-2"
          >
            Rever tour
          </button>
          <button
            onClick={onLogout}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}
