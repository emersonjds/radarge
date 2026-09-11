"use client";

import { useEffect, useState } from "react";

const DESKTOP_BREAKPOINT_PX = 768;

/**
 * Table-to-card-list break (design-language.md §7). A CSS-only `hidden md:block`
 * pair still mounts both branches, so any assertion not scoped to a role or
 * container matches the same text twice. Only one branch may exist in the DOM.
 */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const updateFromWidth = () => setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT_PX);
    updateFromWidth();
    window.addEventListener("resize", updateFromWidth);
    return () => window.removeEventListener("resize", updateFromWidth);
  }, []);

  return isDesktop;
}
