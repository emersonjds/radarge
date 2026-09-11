"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface PageTitleContextValue {
  title: string | null;
  setTitle: (title: string | null) => void;
}

const PageTitleContext = createContext<PageTitleContextValue | null>(null);

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState<string | null>(null);

  return (
    <PageTitleContext.Provider value={{ title, setTitle }}>{children}</PageTitleContext.Provider>
  );
}

function usePageTitleContext(): PageTitleContextValue {
  const context = useContext(PageTitleContext);
  if (!context) throw new Error("usePageTitle must be used within PageTitleProvider");
  return context;
}

/**
 * A widget that resolves its own entity (e.g. a loaded student's name) registers it
 * here so `AppBreadcrumb` can render it as the page's single `h1` and extend the trail.
 */
export function usePageTitle(title: string | null): void {
  const { setTitle } = usePageTitleContext();

  useEffect(() => {
    setTitle(title);
    return () => setTitle(null);
  }, [title, setTitle]);
}

export function useBreadcrumbTitle(): string | null {
  return usePageTitleContext().title;
}
